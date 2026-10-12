/**
 * Book import CLI: spreadsheet → households + clients + policies, with a
 * validation report and auto-created cleanup tasks for rows missing DOB or
 * phone. Shares all parsing, mapping, grouping and import logic with the web
 * wizard at /import (src/lib/import/).
 *
 * Usage:
 *   npm run import:book -- --file ./book.xlsx [--sheet "Sheet1"] [--dry-run]
 *
 * Column headers are auto-detected in English and Spanish (see
 * src/lib/import/columns.ts for the full alias list); extras are ignored.
 * Rows sharing the same `household` value are grouped into one household;
 * the first row of each group becomes the primary client.
 */
import "dotenv/config";
import * as fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { detectMapping, mappingIsComplete } from "../src/lib/import/columns";
import { MAX_ROWS, readWorkbook, sniffFileKind } from "../src/lib/import/file";
import { applyMapping } from "../src/lib/import/grouping";
import { runImport } from "../src/lib/import/run";
import { validateRows } from "../src/lib/import/validate";
import type { ExistingClient } from "../src/lib/import/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const file = arg("file");
  if (!file || !fs.existsSync(file)) {
    console.error("Usage: npm run import:book -- --file ./book.xlsx [--sheet NAME] [--dry-run]");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ssnKey = process.env.SSN_ENCRYPTION_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const buffer = fs.readFileSync(file);
  const kind = sniffFileKind(buffer, file);
  if (!kind) {
    console.error("Only .xlsx and .csv files are supported (no macros, no legacy .xls).");
    process.exit(1);
  }
  const wb = readWorkbook(buffer, kind);
  const sheetName = arg("sheet") ?? wb.sheetNames[0];
  const { headers, rows: rawRows } = wb.rowsFor(sheetName);
  if (headers.length === 0) {
    console.error(`Sheet "${sheetName}" not found or empty. Sheets: ${wb.sheetNames.join(", ")}`);
    process.exit(1);
  }
  if (rawRows.length > MAX_ROWS) {
    console.error(`Too many rows (${rawRows.length}; max ${MAX_ROWS}). Split the file.`);
    process.exit(1);
  }
  console.log(`Read ${rawRows.length} rows from "${sheetName}".`);

  const mapping = detectMapping(headers);
  if (!mappingIsComplete(mapping)) {
    console.error("Could not find first-name and last-name columns. Headers found:");
    console.error(`  ${headers.join(", ")}`);
    process.exit(1);
  }
  const mappedFields = Object.entries(mapping).filter(([, f]) => f !== "ignore");
  console.log(`Detected columns: ${mappedFields.map(([h, f]) => `${h}→${f}`).join(", ")}`);

  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Dry runs validate offline; real runs check duplicates against the book.
  const { data: existingClients } = DRY_RUN
    ? { data: [] }
    : await admin
        .from("clients")
        .select("id, household_id, first_name, last_name, dob, ssn_last4, phone, email")
        .limit(20000);
  const { data: existingPolicies } = DRY_RUN
    ? { data: [] as { client_id: string; policy_number: string }[] }
    : await admin
        .from("policies")
        .select("client_id, policy_number")
        .not("policy_number", "is", null)
        .limit(20000);
  const policyNumbers = new Map<string, string>(
    (existingPolicies ?? []).map((p) => [String(p.policy_number).toLowerCase(), p.client_id])
  );

  const mapped = applyMapping(rawRows, mapping);
  const validated = validateRows(mapped, (existingClients ?? []) as ExistingClient[], policyNumbers);

  const dupes = validated.filter((r) => r.status === "duplicate").length;
  const errors = validated.filter((r) => r.status === "error").length;
  const warnings = validated.filter((r) => r.status === "warning").length;
  console.log(`Validated: ${validated.length} rows — ${dupes} duplicates (skipped), ${warnings} with warnings, ${errors} unusable.`);

  if (DRY_RUN) {
    const reportPath = `import-report-${Date.now()}.json`;
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        validated.map((r) => ({ row: r.row, status: r.status, issues: r.issues })),
        null,
        2
      )
    );
    console.log(`[DRY RUN] Nothing written. Validation report: ${reportPath}`);
    return;
  }

  const result = await runImport({
    supabase: admin,
    rows: validated,
    duplicateMode: "skip",
    batchId: null,
    ssnKey,
    existingClients: (existingClients ?? []) as ExistingClient[],
  });

  await admin.from("audit_log").insert({
    actor_type: "system",
    action: "import_completed",
    entity_type: "import",
    metadata: {
      file: file.split("/").pop(),
      households: result.counts.households,
      clients: result.counts.clients,
      policies: result.counts.policies,
      skipped: result.counts.skipped,
      failed: result.counts.failed,
    },
  });

  const reportPath = `import-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2));

  console.log(`\nImport complete:`);
  console.log(`  households: ${result.counts.households}`);
  console.log(`  clients:    ${result.counts.clients}`);
  console.log(`  policies:   ${result.counts.policies}`);
  console.log(`  carriers:   ${result.counts.carriers} new`);
  console.log(`  skipped:    ${result.counts.skipped} (duplicates)`);
  console.log(`  unusable:   ${result.counts.failed}`);
  console.log(`\nReport (masked, no SSNs/DOBs): ${reportPath}`);
}

main();
