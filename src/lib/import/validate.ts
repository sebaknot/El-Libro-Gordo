import {
  parseDate,
  parseEmail,
  parseIntSafe,
  parseMoney,
  parsePhone,
  parseSsn,
  sanitizeCell,
} from "./parse";
import type {
  DuplicateMatch,
  ExistingClient,
  IssueCode,
  MappedRow,
  ValidatedRow,
} from "./types";

const TEXT_FIELDS = [
  "first_name",
  "last_name",
  "household",
  "address",
  "city",
  "state",
  "zip",
  "carrier",
  "plan_name",
  "policy_number",
] as const;

/**
 * Validate and clean mapped rows. Pure: duplicate detection runs against the
 * provided snapshot of existing clients/policy numbers plus the file itself.
 * Rows missing DOB or phone are warnings (cleanup tasks later), never errors.
 */
export function validateRows(
  rows: MappedRow[],
  existing: ExistingClient[],
  existingPolicyNumbers: Map<string, string> // policy_number (lowercased) → client_id
): ValidatedRow[] {
  // Lookup tables for duplicate detection against the database.
  const bySsnDob = new Map<string, string>();
  const byNameDob = new Map<string, string>();
  const byPhone = new Map<string, string>();
  for (const c of existing) {
    if (c.ssn_last4 && c.dob) bySsnDob.set(`${c.ssn_last4}|${c.dob}`, c.id);
    if (c.dob) {
      byNameDob.set(
        `${c.first_name.trim().toLowerCase()}|${c.last_name.trim().toLowerCase()}|${c.dob}`,
        c.id
      );
    }
    if (c.phone) byPhone.set(c.phone, c.id);
  }

  // Same keys, but within the file (first occurrence wins).
  const fileSsnDob = new Map<string, number>();
  const fileNameDob = new Map<string, number>();
  const filePhone = new Map<string, number>();
  const filePolicy = new Map<string, number>();

  return rows.map((row) => {
    const issues: IssueCode[] = [];
    const clean: ValidatedRow["clean"] = {};
    let neutralizedAny = false;

    // Free-text fields: sanitize (trim, control chars, formula prefixes).
    for (const f of TEXT_FIELDS) {
      const raw = row.fields[f];
      if (raw == null) continue;
      const { value, neutralized } = sanitizeCell(raw);
      neutralizedAny ||= neutralized;
      if (value) clean[f] = value;
    }
    if (clean.state) clean.state = clean.state.slice(0, 2).toUpperCase();
    if (clean.zip) clean.zip = clean.zip.slice(0, 10);
    if (neutralizedAny) issues.push("formula_neutralized");

    if (!clean.first_name || !clean.last_name) {
      return { row: row.row, status: "error", issues: ["missing_name"], clean };
    }

    // DOB — missing or unreadable is a warning, not an error.
    if (row.fields.dob == null) {
      clean.dob = null;
      issues.push("missing_dob");
    } else {
      clean.dob = parseDate(String(row.fields.dob));
      if (!clean.dob) issues.push("bad_dob");
    }

    // Phone.
    if (row.fields.phone == null) {
      clean.phone = null;
      issues.push("missing_phone");
    } else {
      clean.phone = parsePhone(String(row.fields.phone));
      if (!clean.phone) issues.push("bad_phone");
    }
    clean.whatsapp_phone = row.fields.whatsapp_phone
      ? parsePhone(String(row.fields.whatsapp_phone))
      : null;

    // Email.
    clean.email = null;
    if (row.fields.email != null) {
      clean.email = parseEmail(String(row.fields.email));
      if (!clean.email) issues.push("bad_email");
    }

    // SSN — digits held server-side only; last-4 for display/dup-matching.
    clean.ssn = null;
    clean.ssn_last4 = null;
    if (row.fields.ssn != null && String(row.fields.ssn).trim() !== "") {
      clean.ssn = parseSsn(String(row.fields.ssn));
      if (clean.ssn) clean.ssn_last4 = clean.ssn.slice(-4);
      else issues.push("bad_ssn");
    }

    // Numbers.
    clean.annual_income = null;
    if (row.fields.annual_income != null) {
      clean.annual_income = parseMoney(String(row.fields.annual_income));
      if (clean.annual_income == null) issues.push("bad_income");
    }
    clean.household_size = row.fields.household_size
      ? parseIntSafe(String(row.fields.household_size))
      : null;
    clean.monthly_premium = row.fields.monthly_premium
      ? parseMoney(String(row.fields.monthly_premium))
      : null;
    clean.subsidy = row.fields.subsidy ? parseMoney(String(row.fields.subsidy)) : null;
    clean.plan_year = null;
    if (row.fields.plan_year != null) {
      const y = Number(String(row.fields.plan_year).trim());
      if (Number.isInteger(y) && y >= 2000 && y <= 2100) clean.plan_year = y;
      else issues.push("bad_year");
    }
    clean.language = String(row.fields.language ?? "").toLowerCase().startsWith("en")
      ? "en"
      : "es";

    // Duplicate detection: DB first, then earlier rows in this file.
    const nameDobKey = clean.dob
      ? `${clean.first_name.toLowerCase()}|${clean.last_name.toLowerCase()}|${clean.dob}`
      : null;
    const ssnDobKey = clean.ssn_last4 && clean.dob ? `${clean.ssn_last4}|${clean.dob}` : null;
    const policyKey = clean.policy_number ? clean.policy_number.toLowerCase() : null;

    let duplicate: DuplicateMatch | undefined;
    if (ssnDobKey && bySsnDob.has(ssnDobKey)) {
      duplicate = { kind: "db", reason: "ssn_dob", clientId: bySsnDob.get(ssnDobKey) };
    } else if (nameDobKey && byNameDob.has(nameDobKey)) {
      duplicate = { kind: "db", reason: "name_dob", clientId: byNameDob.get(nameDobKey) };
    } else if (clean.phone && byPhone.has(clean.phone)) {
      duplicate = { kind: "db", reason: "phone", clientId: byPhone.get(clean.phone) };
    } else if (policyKey && existingPolicyNumbers.has(policyKey)) {
      duplicate = {
        kind: "db",
        reason: "policy_number",
        clientId: existingPolicyNumbers.get(policyKey),
      };
    } else if (ssnDobKey && fileSsnDob.has(ssnDobKey)) {
      duplicate = { kind: "file", reason: "ssn_dob", row: fileSsnDob.get(ssnDobKey) };
    } else if (nameDobKey && fileNameDob.has(nameDobKey)) {
      duplicate = { kind: "file", reason: "name_dob", row: fileNameDob.get(nameDobKey) };
    } else if (clean.phone && filePhone.has(clean.phone)) {
      // Shared household phones are common; same phone + same last name in
      // one file is family, not a duplicate.
      const earlier = filePhone.get(clean.phone)!;
      duplicate = { kind: "file", reason: "phone", row: earlier };
    } else if (policyKey && filePolicy.has(policyKey)) {
      duplicate = { kind: "file", reason: "policy_number", row: filePolicy.get(policyKey) };
    }

    // Register this row for later in-file checks (only when not already dup).
    if (!duplicate) {
      if (ssnDobKey) fileSsnDob.set(ssnDobKey, row.row);
      if (nameDobKey) fileNameDob.set(nameDobKey, row.row);
      if (policyKey) filePolicy.set(policyKey, row.row);
      // Deliberately NOT registering phone within the file: household members
      // legitimately share one phone, and flagging every family member as a
      // duplicate of the first would be wrong.
    }

    const status: ValidatedRow["status"] = duplicate
      ? "duplicate"
      : issues.length > 0
        ? "warning"
        : "new";
    return { row: row.row, status, issues, duplicate, clean };
  });
}
