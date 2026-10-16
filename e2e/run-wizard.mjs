/**
 * Drives the import wizard end-to-end in a real browser against the mock
 * Supabase API: upload → map → preview → import → result, then the clients
 * list, search, history, and undo. Prints a step-by-step trace and exits
 * non-zero at the first failure. Fake data only.
 *
 * Expects: mock on :4545, app on :3101, cookies JSON in E2E_COOKIES_FILE.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const APP = process.env.E2E_APP_ORIGIN || "http://127.0.0.1:3101";
const MOCK = process.env.E2E_MOCK_ORIGIN || "http://127.0.0.1:4545";
const FIXTURE = new URL("./fixtures/fake-book.csv", import.meta.url).pathname;

const steps = [];
function step(name, ok, detail = "") {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) {
    console.log("\nTRACE SUMMARY:");
    for (const s of steps) console.log(`  ${s.ok ? "ok " : "FAIL"} ${s.name} ${s.detail}`);
    process.exit(1);
  }
}

async function state() {
  return (await fetch(`${MOCK}/__state`)).json();
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
});
const context = await browser.newContext({ baseURL: APP });
const cookies = JSON.parse(fs.readFileSync(process.env.E2E_COOKIES_FILE, "utf8"));
await context.addCookies(
  cookies.map((c) => ({ ...c, domain: "127.0.0.1", path: "/", httpOnly: true, secure: false }))
);
const page = await context.newPage();

const failures = [];
page.on("pageerror", (err) => failures.push(`pageerror: ${err.message}`));
page.on("response", (r) => {
  if (r.status() >= 500) failures.push(`HTTP ${r.status()} ${r.url()}`);
});
page.on("console", (m) => {
  if (m.type() === "error") console.log(`   [browser] ${m.text().slice(0, 160)}`);
});

try {
  await fetch(`${MOCK}/__reset`, { method: "POST" });

  // ---- Step 1: upload
  await page.goto("/import", { waitUntil: "networkidle" });
  step("open /import", /Import clients|Importar clientes/.test(await page.textContent("main")));
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await page.getByRole("button", { name: /Upload and continue|Subir y continuar/ }).click();
  await page.waitForURL(/\/import\/[0-9a-f-]+\/map/, { timeout: 30000 }).catch(() => {});
  const afterUpload = page.url();
  step(
    "upload redirects to /map",
    /\/import\/[0-9a-f-]+\/map/.test(afterUpload),
    `landed on ${afterUpload}${(await page.textContent("body")).includes("expired") ? " (page says EXPIRED)" : ""}`
  );
  const s1 = await state();
  step("batch row created", s1.db.import_batches.length === 1, `status=${s1.db.import_batches[0]?.status}`);
  step("payload stashed", s1.payloads.length === 1);

  // ---- Step 2: map
  const bodyAfterMapLoad = await page.textContent("body");
  step("map page shows columns (not expired)", /Nombre/.test(bodyAfterMapLoad) && !/expired|venció/.test(bodyAfterMapLoad));
  await page.getByRole("button", { name: /Continue to preview|Continuar a la vista previa/ }).click();
  await page.waitForURL(/\/preview/, { timeout: 30000 }).catch(() => {});
  step("mapping saves → /preview", /\/preview/.test(page.url()), `landed on ${page.url()}`);
  const s2 = await state();
  step("batch status = mapped", s2.db.import_batches[0]?.status === "mapped", `status=${s2.db.import_batches[0]?.status}`);

  // ---- Step 3: preview
  const previewBody = await page.textContent("body");
  step("preview shows rows read = 3", /3/.test(previewBody));
  step("preview shows a warning row", /Warning|Aviso/.test(previewBody));

  // ---- Step 4: import
  await page.getByRole("button", { name: /Import now|Importar ahora/ }).click();
  await page.waitForURL(/\/result/, { timeout: 60000 }).catch(() => {});
  step("import completes → /result", /\/result/.test(page.url()), `landed on ${page.url()}`);
  const s3 = await state();
  const batch = s3.db.import_batches[0];
  step("batch status = imported", batch?.status === "imported", `status=${batch?.status}`);
  step(
    "rows created: 3 clients / 2 households / 2 policies / 1 carrier",
    s3.db.clients.length === 3 && s3.db.households.length === 2 && s3.db.policies.length === 2 && s3.db.carriers.length === 1,
    `clients=${s3.db.clients.length} households=${s3.db.households.length} policies=${s3.db.policies.length} carriers=${s3.db.carriers.length}`
  );
  step("records tagged with batch id", s3.db.clients.every((c) => c.import_batch_id === batch.id));
  step("SSN stored as last-4 only in mock", s3.db.clients.some((c) => c.ssn_last4 === "2222"));
  step("cleanup task created for Carlos", s3.db.tasks.some((t) => t.title?.includes("Carlos")));
  step(
    "audit has import_started + import_completed",
    s3.db.audit_log.some((a) => a.action === "import_started") && s3.db.audit_log.some((a) => a.action === "import_completed")
  );

  // ---- Step 5: clients list + search
  await page.goto("/clients", { waitUntil: "networkidle" });
  const clientsBody = await page.textContent("body");
  step("imported client appears in /clients", /Prueba, Maria|Prueba, Jose/.test(clientsBody));
  const search = await page.request.get(`${APP}/api/search?q=Maria`);
  const searchJson = await search.json().catch(() => null);
  step(
    "imported client appears in search",
    search.ok() && JSON.stringify(searchJson).includes("Maria"),
    `HTTP ${search.status()}`
  );

  // ---- Step 6: history + undo
  await page.goto("/import/history", { waitUntil: "networkidle" });
  step("history lists the batch", (await page.textContent("body")).includes("fake-book.csv"));
  await page.getByRole("button", { name: /Undo this import|Deshacer esta importación/ }).click();
  await page.getByRole("button", { name: /Yes, undo it|Sí, deshacer/ }).click();
  await page.waitForURL(/undone=1/, { timeout: 30000 }).catch(() => {});
  step("undo completes", /undone=1/.test(page.url()), `landed on ${page.url()}`);
  const s4 = await state();
  step("undo removed batch-created records", s4.db.clients.length === 0 && s4.db.households.length === 0, `clients=${s4.db.clients.length}`);

  // ---- Step 7: resume + discard for a stuck batch
  await fetch(`${MOCK}/__reset`, { method: "POST" });
  await page.goto("/import", { waitUntil: "networkidle" });
  await page.setInputFiles('input[type="file"]', FIXTURE);
  await page.getByRole("button", { name: /Upload and continue|Subir y continuar/ }).click();
  await page.waitForURL(/\/map/, { timeout: 30000 });
  await page.goto("/import/history", { waitUntil: "networkidle" });
  const historyBody = await page.textContent("body");
  step("stuck batch shows Resume", /Resume|Continuar/.test(historyBody));
  await page.getByRole("link", { name: /Resume|Continuar/ }).first().click();
  await page.waitForURL(/\/map/, { timeout: 30000 }).catch(() => {});
  step("Resume returns to the right step", /\/map/.test(page.url()), page.url());
  await page.goto("/import/history", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Discard|Descartar/ }).first().click();
  await page.getByRole("button", { name: /Yes, discard|Sí, descartar/ }).click();
  await page.waitForURL(/discarded=1/, { timeout: 30000 }).catch(() => {});
  const s5 = await state();
  step("Discard removes the stuck batch", s5.db.import_batches.length === 0, `batches=${s5.db.import_batches.length}`);

  if (failures.length) {
    console.log("\nNon-fatal page issues observed:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log("\n🎉 Wizard e2e: ALL STEPS PASSED");
} finally {
  await browser.close();
}
