/**
 * Tailored importer for the agency's real workbook (Base_de_Datos_Seguros).
 *
 * Handles the workbook's three layouts:
 *  A. Named-header sheets ("2026", "PROCESADAS MASTER", "SIN APARACER EN SISTEMA")
 *  B. Carrier sheets whose header row is embedded as the first data row
 *     ("Oscar 2024-2025", "Ambetter 24-25", "Aetna 24-25", "Molina 24-25",
 *      "UNITED 24-58", "FL BLUE")
 *  C. Cigna-style sheets where DOB lives in a header-less column right after
 *     the last name ("Cigna 24-25", "2022 Y 2023")
 *
 * Sheets are processed in priority order (2026 first). Clients are deduped
 * across sheets by name+DOB (fallback name+phone); later sheets only fill in
 * missing contact fields and contribute additional policy years.
 *
 * Usage:
 *   npx tsx scripts/import-libro.ts --file ./Base_de_Datos_Seguros.xlsx [--dry-run]
 */
import "dotenv/config";
import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().replace(/[\s_\-#()\/.]+/g, "");
}

function clean(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-'])\S/g, (c) => c.toUpperCase()).trim();
}

function parseDate(value: string): string | null {
  const v = clean(value);
  if (!v) return null;
  if (/^\d{5}$/.test(v)) {
    const d = XLSX.SSF.parse_date_code(Number(v));
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(v);
  if (us) {
    let year = Number(us[3]);
    if (year < 100) year += year > new Date().getFullYear() % 100 - 2000 + 100 ? 1900 : 2000;
    const mm = us[1].padStart(2, "0");
    const dd = us[2].padStart(2, "0");
    if (Number(mm) > 12 || Number(dd) > 31) return null;
    return `${year}-${mm}-${dd}`;
  }
  return null;
}

function cleanPhone(value: string): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function money(value: string): number | null {
  const v = clean(value).replace(/[$,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cleanEmail(value: string): string | null {
  const v = clean(value).toLowerCase();
  return /^\S+@\S+\.\S+$/.test(v) ? v : null;
}

const CARRIER_MAP: Record<string, string> = {
  oscar: "Oscar",
  cigna: "Cigna",
  ambetter: "Ambetter",
  aetna: "Aetna",
  molina: "Molina",
  united: "United Healthcare",
  unitedhealthcare: "United Healthcare",
  flblue: "Florida Blue",
  floridablue: "Florida Blue",
  wellcare: "Wellcare",
};

function normalizeCarrier(raw: string): string | null {
  const key = norm(raw);
  if (!key) return null;
  return CARRIER_MAP[key] ?? titleCase(clean(raw));
}

function planTypeFromProduct(product: string): string {
  const p = norm(product);
  if (p.includes("dental")) return "dental";
  if (p.includes("vision")) return "vision";
  if (p.includes("life")) return "life";
  if (p.includes("medicare")) return "medicare";
  return "marketplace";
}

// ---------------------------------------------------------------------------
// Sheet parsing → uniform records
// ---------------------------------------------------------------------------

type Rec = {
  sheet: string;
  row: number;
  carrier: string | null;
  member_id: string | null;
  first: string;
  last: string;
  dob: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  plan: string | null;
  total_premium: number | null;
  net_premium: number | null;
  aptc: number | null;
  lives: number | null;
  start: string | null;
  end: string | null;
  policy_status: string | null;
  product_type: string;
  renewal_plan: string | null;
  renewal_net: number | null;
  renewal_aptc: number | null;
};

const HEADER_FIELDS: Record<string, string[]> = {
  carrier: ["companyname", "company", "0", ""],
  member_id: ["memberid", "subscriberiddetailcase"],
  first: ["memberfirstname", "membername", "primaryfirstname"],
  last: ["lastname", "primarylastname"],
  dob: ["dateofbirth"],
  email: ["email", "customeremailaddress"],
  phone: ["phonenumber", "customerphonenumber"],
  address: ["mailingaddress"],
  state: ["state", "f"],
  plan: ["plan", "planname"],
  total_premium: ["totalpremium"],
  net_premium: ["premiumamount", "premiumcustomerresponsibility"],
  aptc: ["aptcsubsidy", "aptc"],
  lives: ["lives"],
  start: ["coveragestartdate", "effectivedate"],
  end: ["coverageenddate", "terminationdate"],
  policy_status: ["policystatus"],
  product_type: ["producttype"],
  renewal_plan: ["renewalplan"],
  renewal_net: ["renewalpremiumamount"],
  renewal_aptc: ["renewalaptcsubsidy"],
};

function buildColumnMap(headers: string[]): Map<number, string> {
  const map = new Map<number, string>();
  const lastNameIdx = headers.findIndex((h) =>
    HEADER_FIELDS.last.includes(norm(h))
  );
  headers.forEach((h, idx) => {
    const n = norm(h);
    for (const [field, aliases] of Object.entries(HEADER_FIELDS)) {
      // "" only maps to carrier when it's the very first column (Oscar sheet quirk)
      if (aliases.includes(n) && !(n === "" && !(field === "carrier" && idx === 0))) {
        if (![...map.values()].includes(field)) map.set(idx, field);
        break;
      }
    }
    // Cigna layout: DOB sits in the unlabeled column right after the last name
    if (n === "" && lastNameIdx >= 0 && idx === lastNameIdx + 1 && ![...map.values()].includes("dob")) {
      map.set(idx, "dob");
    }
  });
  return map;
}

function parseSheet(wb: XLSX.WorkBook, sheetName: string): Rec[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  if (grid.length === 0) return [];

  // Find the header row: the row that mentions a last-name-ish column
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(grid.length, 5); i++) {
    const cells = (grid[i] ?? []).map(norm);
    if (cells.some((c) => HEADER_FIELDS.last.includes(c)) && cells.some((c) => HEADER_FIELDS.first.includes(c))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return [];

  const headers = (grid[headerRowIdx] ?? []).map((h) => String(h ?? ""));
  const colMap = buildColumnMap(headers);

  const recs: Rec[] = [];
  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const cells = grid[i] ?? [];
    const raw: Record<string, string> = {};
    colMap.forEach((field, idx) => {
      raw[field] = clean(cells[idx]);
    });
    const first = titleCase(raw.first ?? "");
    const last = titleCase(raw.last ?? "");
    if (!first || !last) continue;
    // Skip repeated embedded header rows
    if (norm(first) === "membername" || norm(first) === "memberfirstname") continue;

    recs.push({
      sheet: sheetName,
      row: i + 1,
      carrier: normalizeCarrier(raw.carrier ?? ""),
      member_id: raw.member_id || null,
      first,
      last,
      dob: parseDate(raw.dob ?? ""),
      email: cleanEmail(raw.email ?? ""),
      phone: cleanPhone(raw.phone ?? ""),
      address: raw.address || null,
      state: (raw.state && /^[a-z]{2}$/i.test(raw.state) ? raw.state.toUpperCase() : null),
      plan: raw.plan || null,
      total_premium: money(raw.total_premium ?? ""),
      net_premium: money(raw.net_premium ?? ""),
      aptc: money(raw.aptc ?? ""),
      lives: raw.lives && Number(raw.lives) > 0 ? Number(raw.lives) : null,
      start: parseDate(raw.start ?? ""),
      end: parseDate(raw.end ?? ""),
      policy_status: raw.policy_status || null,
      product_type: planTypeFromProduct(raw.product_type ?? ""),
      renewal_plan: raw.renewal_plan || null,
      renewal_net: money(raw.renewal_net ?? ""),
      renewal_aptc: money(raw.renewal_aptc ?? ""),
    });
  }
  return recs;
}

// ---------------------------------------------------------------------------
// Merge records into clients + policies
// ---------------------------------------------------------------------------

type PolicyDraft = {
  carrier: string | null;
  plan: string | null;
  plan_year: number;
  plan_type: string;
  policy_number: string | null;
  total_premium: number | null;
  net_premium: number | null;
  aptc: number | null;
  start: string | null;
  end: string | null;
  status: "active" | "pending" | "terminated";
  source: string;
};

type ClientDraft = {
  first: string;
  last: string;
  dob: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  state: string | null;
  lives: number | null;
  sources: string[];
  policies: PolicyDraft[];
  issues: Set<string>;
};

// Priority order: the consolidated 2026 book wins on contact info.
const SHEET_ORDER = [
  "2026",
  "PROCESADAS MASTER",
  "Oscar 2024-2025",
  "Cigna 24-25",
  "Ambetter 24-25",
  "Aetna 24-25",
  "Molina 24-25",
  "UNITED 24-58",
  "FL BLUE",
  "SIN APARACER EN SISTEMA",
  "2022 Y 2023",
];

const SHEET_DEFAULT_YEAR: Record<string, number> = {
  "2026": 2026,
  "PROCESADAS MASTER": 2025,
  "Oscar 2024-2025": 2024,
  "Cigna 24-25": 2024,
  "Ambetter 24-25": 2024,
  "Aetna 24-25": 2024,
  "Molina 24-25": 2024,
  "UNITED 24-58": 2024,
  "FL BLUE": 2024,
  "SIN APARACER EN SISTEMA": 2025,
  "2022 Y 2023": 2023,
};

function clientKey(r: { first: string; last: string; dob: string | null; phone: string | null }): string {
  const name = `${norm(r.first)}|${norm(r.last)}`;
  return r.dob ? `${name}|${r.dob}` : `${name}|p:${r.phone ?? "?"}`;
}

function policyFromRec(r: Rec): PolicyDraft | null {
  if (!r.carrier && !r.plan && !r.member_id) return null;
  const planYear = r.start
    ? Number(r.start.slice(0, 4))
    : r.end
      ? Number(r.end.slice(0, 4))
      : SHEET_DEFAULT_YEAR[r.sheet] ?? new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  let status: PolicyDraft["status"] = "active";
  if (r.policy_status && /inactive|term|cancel/i.test(r.policy_status)) status = "terminated";
  else if (r.end && r.end < today) status = "terminated";
  else if (r.policy_status && /pend/i.test(r.policy_status)) status = "pending";
  return {
    carrier: r.carrier,
    plan: r.plan,
    plan_year: planYear,
    plan_type: r.product_type,
    policy_number: r.member_id,
    total_premium: r.total_premium,
    net_premium: r.net_premium,
    aptc: r.aptc,
    start: r.start,
    end: r.end,
    status,
    source: `${r.sheet}:${r.row}`,
  };
}

function policyKey(p: PolicyDraft): string {
  return [norm(p.carrier ?? ""), norm(p.plan ?? ""), p.plan_year, norm(p.policy_number ?? "")].join("|");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const file = arg("file");
  if (!file || !fs.existsSync(file)) {
    console.error("Usage: npx tsx scripts/import-libro.ts --file ./Base_de_Datos_Seguros.xlsx [--dry-run]");
    process.exit(1);
  }

  const wb = XLSX.readFile(file, { cellDates: false });
  const clients = new Map<string, ClientDraft>();
  const perSheet: Record<string, { rows: number; newClients: number; policies: number }> = {};

  for (const sheetName of SHEET_ORDER) {
    if (!wb.SheetNames.includes(sheetName)) continue;
    const recs = parseSheet(wb, sheetName);
    const stats = { rows: recs.length, newClients: 0, policies: 0 };

    for (const r of recs) {
      const key = clientKey(r);
      let c = clients.get(key);
      // Fallback match: same name, one side missing DOB
      if (!c && r.dob) {
        const nameOnly = `${norm(r.first)}|${norm(r.last)}`;
        for (const [k, v] of clients) {
          if (k.startsWith(nameOnly + "|") && !v.dob) { c = v; c.dob = r.dob; break; }
        }
      }
      if (!c) {
        c = {
          first: r.first, last: r.last, dob: r.dob, email: null, phone: null,
          address: null, state: null, lives: null, sources: [], policies: [], issues: new Set(),
        };
        clients.set(key, c);
        stats.newClients++;
      }
      // Fill missing contact fields only (earlier sheets are authoritative)
      c.email = c.email ?? r.email;
      c.phone = c.phone ?? r.phone;
      c.address = c.address ?? r.address;
      c.state = c.state ?? r.state;
      c.lives = c.lives ?? r.lives;
      c.dob = c.dob ?? r.dob;
      c.sources.push(`${r.sheet}:${r.row}`);

      const p = policyFromRec(r);
      if (p) {
        const pk = policyKey(p);
        if (!c.policies.some((x) => policyKey(x) === pk)) {
          c.policies.push(p);
          stats.policies++;
        }
      }
      // Renewal columns → pending policy for the following year
      if (r.renewal_plan) {
        const base = policyFromRec(r);
        const renewal: PolicyDraft = {
          carrier: r.carrier,
          plan: r.renewal_plan,
          plan_year: (base?.plan_year ?? SHEET_DEFAULT_YEAR[r.sheet]) + 1,
          plan_type: r.product_type,
          policy_number: r.member_id,
          total_premium: null,
          net_premium: r.renewal_net,
          aptc: r.renewal_aptc,
          start: null,
          end: null,
          status: "pending",
          source: `${r.sheet}:${r.row} (renewal)`,
        };
        const rk = policyKey(renewal);
        if (!c.policies.some((x) => policyKey(x) === rk)) {
          c.policies.push(renewal);
          stats.policies++;
        }
      }
    }
    perSheet[sheetName] = stats;
  }

  // Validation
  for (const c of clients.values()) {
    if (!c.dob) c.issues.add("missing DOB (needed for magic links)");
    if (!c.phone) c.issues.add("missing/unparseable phone (needed for magic links)");
    if (!c.email) c.issues.add("no valid email");
    if (c.policies.length === 0) c.issues.add("no policy info in any sheet");
  }

  const all = [...clients.values()];
  const withIssues = all.filter((c) => c.issues.size > 0);
  const report = {
    file: file.split("/").pop(),
    generated_at: new Date().toISOString(),
    per_sheet: perSheet,
    unique_clients: all.length,
    total_policies: all.reduce((n, c) => n + c.policies.length, 0),
    clients_missing_dob: all.filter((c) => !c.dob).length,
    clients_missing_phone: all.filter((c) => !c.phone).length,
    clients_without_policies: all.filter((c) => c.policies.length === 0).length,
    clients_with_issues: withIssues.length,
    issues: withIssues
      .map((c) => ({ client: `${c.first} ${c.last}`, sources: c.sources.slice(0, 3), issues: [...c.issues] }))
      .sort((a, b) => a.client.localeCompare(b.client)),
  };

  const inspect = arg("inspect");
  if (inspect) {
    for (const c of all) {
      if (`${c.first} ${c.last}`.toLowerCase().includes(inspect.toLowerCase())) {
        console.log(JSON.stringify({
          client: `${c.first} ${c.last}`, dob: c.dob, phone: c.phone, email: c.email,
          sources: c.sources,
          policies: c.policies.map((p) => `${p.plan_year} ${p.carrier ?? "?"} ${p.plan ?? ""} [${p.status}] (${p.source})`),
        }, null, 2));
      }
    }
  }

  const reportPath = `import-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Parsed ${file}`);
  console.table(perSheet);
  console.log(`Unique clients:      ${report.unique_clients}`);
  console.log(`Policies:            ${report.total_policies}`);
  console.log(`Missing DOB:         ${report.clients_missing_dob}`);
  console.log(`Missing phone:       ${report.clients_missing_phone}`);
  console.log(`No policy info:      ${report.clients_without_policies}`);
  console.log(`Clients w/ issues:   ${report.clients_with_issues}`);
  console.log(`Report: ${reportPath}`);

  if (DRY_RUN) return;

  // -------------------------------------------------------------------------
  // Write to Supabase
  // -------------------------------------------------------------------------
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Carriers first
  const carrierIds = new Map<string, string>();
  const carrierNames = new Set<string>();
  for (const c of all) for (const p of c.policies) if (p.carrier) carrierNames.add(p.carrier);
  for (const name of carrierNames) {
    const { data: existing } = await admin.from("carriers").select("id").eq("name", name).maybeSingle();
    if (existing) { carrierIds.set(name, existing.id); continue; }
    const { data: created, error } = await admin.from("carriers").insert({ name }).select("id").single();
    if (error || !created) { console.error(`carrier ${name}: ${error?.message}`); continue; }
    carrierIds.set(name, created.id);
  }

  let imported = 0, failed = 0, tasksCreated = 0;
  for (const c of all) {
    const { data: h, error: hErr } = await admin
      .from("households")
      .insert({
        household_name: `${c.last}, ${c.first}`,
        address_street: c.address,
        address_state: c.state,
        household_size: c.lives,
        preferred_language: "es",
      })
      .select("id")
      .single();
    if (hErr || !h) { console.error(`household ${c.last}, ${c.first}: ${hErr?.message}`); failed++; continue; }

    const anyActive = c.policies.some((p) => p.status === "active");
    const { data: cl, error: cErr } = await admin
      .from("clients")
      .insert({
        household_id: h.id,
        first_name: c.first,
        last_name: c.last,
        dob: c.dob,
        phone: c.phone,
        email: c.email,
        status: anyActive ? "active" : c.policies.length > 0 ? "canceled" : "pending",
        is_primary: true,
        notes_summary: `Imported from ${c.sources[0]}`,
      })
      .select("id")
      .single();
    if (cErr || !cl) { console.error(`client ${c.last}, ${c.first}: ${cErr?.message}`); failed++; continue; }

    await admin.from("households").update({ primary_client_id: cl.id }).eq("id", h.id);

    for (const p of c.policies) {
      const { error: pErr } = await admin.from("policies").insert({
        client_id: cl.id,
        household_id: h.id,
        carrier_id: p.carrier ? carrierIds.get(p.carrier) ?? null : null,
        plan_name: p.plan,
        plan_type: p.plan_type,
        plan_year: p.plan_year,
        monthly_premium: p.total_premium,
        subsidy_amount: p.aptc,
        net_premium: p.net_premium,
        effective_date: p.start,
        termination_date: p.end,
        policy_number: p.policy_number,
        status: p.status,
      });
      if (pErr) console.error(`policy for ${c.last}, ${c.first}: ${pErr.message}`);
    }

    const linkIssues = [...c.issues].filter((i) => i.includes("magic links"));
    if (linkIssues.length > 0) {
      await admin.from("tasks").insert({
        client_id: cl.id,
        household_id: h.id,
        title: `Data cleanup: ${c.first} ${c.last}`,
        detail: linkIssues.join("; "),
        type: "data_cleanup",
        status: "open",
        auto_generated: true,
      });
      tasksCreated++;
    }
    imported++;
  }

  await admin.from("audit_log").insert({
    actor_type: "system",
    action: "create",
    entity_type: "import",
    metadata: { file: report.file, clients: imported, failed, cleanup_tasks: tasksCreated },
  });

  console.log(`\nImported ${imported} clients (${failed} failed), ${tasksCreated} cleanup tasks created.`);
}

main();
