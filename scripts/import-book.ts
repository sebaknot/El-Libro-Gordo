/**
 * One-time book import: spreadsheet → households + clients + policies,
 * with a validation report and auto-created cleanup tasks for rows
 * missing DOB or phone (both needed for magic links in Phase 2).
 *
 * Usage:
 *   npm run import:book -- --file ./book.xlsx [--sheet "Sheet1"] [--dry-run]
 *
 * Expected columns (case/space-insensitive; extras ignored):
 *   first_name, last_name, dob, phone, email, ssn (optional),
 *   household (optional — defaults to "Last, First"), address, city, state, zip,
 *   annual_income, household_size, language (es|en),
 *   carrier, plan_name, plan_year, policy_number, monthly_premium, subsidy
 *
 * Rows sharing the same `household` value are grouped into one household;
 * the first row of each group becomes the primary client.
 */
import "dotenv/config";
import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const DRY_RUN = process.argv.includes("--dry-run");

type Raw = Record<string, unknown>;

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-]+/g, "");
}

const COLUMN_ALIASES: Record<string, string[]> = {
  first_name: ["firstname", "first", "nombre"],
  last_name: ["lastname", "last", "apellido", "apellidos"],
  dob: ["dob", "dateofbirth", "birthdate", "fechadenacimiento"],
  phone: ["phone", "phonenumber", "cell", "telefono", "tel"],
  email: ["email", "correo", "emailaddress"],
  ssn: ["ssn", "socialsecurity", "social"],
  household: ["household", "householdname", "family", "familia"],
  address: ["address", "street", "direccion", "addressstreet"],
  city: ["city", "ciudad"],
  state: ["state", "estado", "st"],
  zip: ["zip", "zipcode", "postal", "codigopostal"],
  annual_income: ["annualincome", "income", "ingreso", "ingresos"],
  household_size: ["householdsize", "familysize", "size"],
  language: ["language", "lang", "idioma", "preferredlanguage"],
  carrier: ["carrier", "company", "aseguradora", "insurer"],
  plan_name: ["planname", "plan"],
  plan_year: ["planyear", "year", "ano", "año"],
  policy_number: ["policynumber", "policy", "memberid", "poliza", "policyno"],
  monthly_premium: ["monthlypremium", "premium", "prima"],
  subsidy: ["subsidy", "subsidyamount", "aptc", "subsidio"],
};

function mapRow(raw: Raw): Record<string, string> {
  const out: Record<string, string> = {};
  const keys = Object.keys(raw);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const match = keys.find((k) => aliases.includes(norm(k)) || norm(k) === norm(field));
    if (match != null && raw[match] != null && String(raw[match]).trim() !== "") {
      out[field] = String(raw[match]).trim();
    }
  }
  return out;
}

function parseDate(value: string): string | null {
  // Excel serial number
  if (/^\d{5}$/.test(value)) {
    const d = XLSX.SSF.parse_date_code(Number(value));
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(value);
  if (us) {
    let year = Number(us[3]);
    if (year < 100) year += year > new Date().getFullYear() % 100 ? 1900 : 2000;
    return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  return null;
}

function cleanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

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

  const wb = XLSX.readFile(file, { cellDates: false });
  const sheetName = arg("sheet") ?? wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.error(`Sheet "${sheetName}" not found. Sheets: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }
  const rawRows = XLSX.utils.sheet_to_json<Raw>(sheet, { raw: false, defval: "" });
  console.log(`Read ${rawRows.length} rows from "${sheetName}".`);

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const report = {
    file,
    sheet: sheetName,
    total_rows: rawRows.length,
    imported_clients: 0,
    imported_households: 0,
    imported_policies: 0,
    skipped: [] as { row: number; reason: string }[],
    warnings: [] as { row: number; client: string; issues: string[] }[],
  };

  // Group rows into households
  const groups = new Map<string, { row: number; data: Record<string, string> }[]>();
  rawRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // 1-based + header
    const data = mapRow(raw);
    if (!data.first_name || !data.last_name) {
      report.skipped.push({ row: rowNum, reason: "missing first or last name" });
      return;
    }
    const groupKey = data.household || `${data.last_name}, ${data.first_name}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push({ row: rowNum, data });
  });

  for (const [householdName, members] of groups) {
    const first = members[0].data;

    let householdId: string | null = null;
    if (!DRY_RUN) {
      const { data: h, error } = await admin
        .from("households")
        .insert({
          household_name: householdName,
          address_street: first.address ?? null,
          address_city: first.city ?? null,
          address_state: first.state?.slice(0, 2).toUpperCase() ?? null,
          address_zip: first.zip ?? null,
          annual_income: first.annual_income ? Number(first.annual_income.replace(/[$,]/g, "")) || null : null,
          household_size: first.household_size ? Number(first.household_size) || members.length : members.length,
          preferred_language: first.language?.toLowerCase().startsWith("en") ? "en" : "es",
        })
        .select("id")
        .single();
      if (error || !h) {
        report.skipped.push({ row: members[0].row, reason: `household insert failed: ${error?.message}` });
        continue;
      }
      householdId = h.id;
    }
    report.imported_households++;

    let primaryClientId: string | null = null;
    for (const [i, member] of members.entries()) {
      const d = member.data;
      const issues: string[] = [];

      const dob = d.dob ? parseDate(d.dob) : null;
      if (!dob) issues.push(d.dob ? `unparseable DOB "${d.dob}"` : "missing DOB (needed for magic links)");
      const phone = d.phone ? cleanPhone(d.phone) : null;
      if (!phone) issues.push(d.phone ? `unparseable phone "${d.phone}"` : "missing phone (needed for magic links)");
      const email = d.email && /^\S+@\S+\.\S+$/.test(d.email) ? d.email.toLowerCase() : null;
      if (d.email && !email) issues.push(`invalid email "${d.email}"`);

      let clientId: string | null = null;
      if (!DRY_RUN && householdId) {
        const { data: c, error } = await admin
          .from("clients")
          .insert({
            household_id: householdId,
            first_name: d.first_name,
            last_name: d.last_name,
            dob,
            phone,
            email,
            status: "active",
            is_primary: i === 0,
          })
          .select("id")
          .single();
        if (error || !c) {
          report.skipped.push({ row: member.row, reason: `client insert failed: ${error?.message}` });
          continue;
        }
        clientId = c.id;
        if (i === 0) primaryClientId = c.id;

        // SSN via the audited pgcrypto function (service role bypasses the staff check
        // via direct SQL, so use the same encryption primitive through an RPC-free path):
        const ssnDigits = d.ssn?.replace(/\D/g, "") ?? "";
        if (ssnDigits.length === 9 && ssnKey) {
          const { error: ssnErr } = await admin.rpc("set_client_ssn_admin", {
            p_client_id: c.id,
            p_ssn: ssnDigits,
            p_key: ssnKey,
          });
          if (ssnErr) issues.push(`SSN not stored: ${ssnErr.message}`);
        } else if (ssnDigits.length > 0 && ssnDigits.length !== 9) {
          issues.push(`invalid SSN (${ssnDigits.length} digits)`);
        }

        // Policy
        if (d.carrier || d.plan_name || d.policy_number) {
          let carrierId: string | null = null;
          if (d.carrier) {
            const { data: existing } = await admin
              .from("carriers")
              .select("id")
              .ilike("name", d.carrier)
              .maybeSingle();
            if (existing) carrierId = existing.id;
            else {
              const { data: created } = await admin
                .from("carriers")
                .insert({ name: d.carrier })
                .select("id")
                .single();
              carrierId = created?.id ?? null;
            }
          }
          const planYear = Number(d.plan_year) || new Date().getFullYear();
          const { error: pErr } = await admin.from("policies").insert({
            client_id: c.id,
            household_id: householdId,
            carrier_id: carrierId,
            plan_name: d.plan_name ?? null,
            plan_year: planYear,
            policy_number: d.policy_number ?? null,
            monthly_premium: d.monthly_premium ? Number(d.monthly_premium.replace(/[$,]/g, "")) || null : null,
            subsidy_amount: d.subsidy ? Number(d.subsidy.replace(/[$,]/g, "")) || null : null,
            status: "active",
          });
          if (pErr) issues.push(`policy insert failed: ${pErr.message}`);
          else report.imported_policies++;
        }

        // Cleanup task for magic-link blockers
        if (issues.length > 0) {
          await admin.from("tasks").insert({
            client_id: c.id,
            household_id: householdId,
            title: `Data cleanup: ${d.first_name} ${d.last_name}`,
            detail: issues.join("; "),
            type: "data_cleanup",
            status: "open",
            auto_generated: true,
          });
        }
      }

      report.imported_clients++;
      if (issues.length > 0) {
        report.warnings.push({ row: member.row, client: `${d.first_name} ${d.last_name}`, issues });
      }
      void clientId;
    }

    if (!DRY_RUN && householdId && primaryClientId) {
      await admin.from("households").update({ primary_client_id: primaryClientId }).eq("id", householdId);
    }
  }

  if (!DRY_RUN) {
    await admin.from("audit_log").insert({
      actor_type: "system",
      action: "create",
      entity_type: "import",
      metadata: {
        file: file.split("/").pop(),
        households: report.imported_households,
        clients: report.imported_clients,
        policies: report.imported_policies,
        warnings: report.warnings.length,
        skipped: report.skipped.length,
      },
    });
  }

  const reportPath = `import-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Import complete:`);
  console.log(`  households: ${report.imported_households}`);
  console.log(`  clients:    ${report.imported_clients}`);
  console.log(`  policies:   ${report.imported_policies}`);
  console.log(`  warnings:   ${report.warnings.length} (cleanup tasks created)`);
  console.log(`  skipped:    ${report.skipped.length}`);
  console.log(`\nValidation report: ${reportPath}`);
}

main();
