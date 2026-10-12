/** Platform fields a spreadsheet column can map to. */
export const PLATFORM_FIELDS = [
  "first_name",
  "last_name",
  "dob",
  "phone",
  "whatsapp_phone",
  "email",
  "ssn",
  "household",
  "address",
  "city",
  "state",
  "zip",
  "annual_income",
  "household_size",
  "language",
  "carrier",
  "plan_name",
  "plan_year",
  "policy_number",
  "monthly_premium",
  "subsidy",
] as const;

export type PlatformField = (typeof PLATFORM_FIELDS)[number];

/** header name → platform field ("ignore" drops the column). */
export type ColumnMapping = Record<string, PlatformField | "ignore">;

/** One spreadsheet row after mapping + sanitization. Field values are strings. */
export type MappedRow = {
  row: number; // 1-based spreadsheet row (header = row 1)
  fields: Partial<Record<PlatformField, string>>;
};

/** Machine-readable issue codes; the UI renders them bilingually.
 *  Codes never embed SSN or DOB values. */
export type IssueCode =
  | "missing_name"
  | "missing_dob"
  | "bad_dob"
  | "missing_phone"
  | "bad_phone"
  | "bad_email"
  | "bad_ssn"
  | "bad_income"
  | "bad_year"
  | "formula_neutralized"
  | "new_carrier";

export type RowStatus = "new" | "duplicate" | "warning" | "error";

export type DuplicateMatch = {
  kind: "db" | "file";
  reason: "ssn_dob" | "name_dob" | "phone" | "policy_number";
  clientId?: string; // when kind = "db"
  row?: number; // when kind = "file"
};

export type ValidatedRow = {
  row: number;
  status: RowStatus;
  issues: IssueCode[];
  duplicate?: DuplicateMatch;
  /** Cleaned values ready for insertion. SSN is full digits — server-side only. */
  clean: {
    first_name?: string;
    last_name?: string;
    dob?: string | null;
    phone?: string | null;
    whatsapp_phone?: string | null;
    email?: string | null;
    ssn?: string | null;
    ssn_last4?: string | null;
    household?: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    annual_income?: number | null;
    household_size?: number | null;
    language?: "en" | "es";
    carrier?: string | null;
    plan_name?: string | null;
    plan_year?: number | null;
    policy_number?: string | null;
    monthly_premium?: number | null;
    subsidy?: number | null;
  };
};

export type DuplicateMode = "skip" | "update" | "import_new";

export type ImportCounts = {
  households: number;
  clients: number;
  policies: number;
  carriers: number;
  updated: number;
  skipped: number;
  failed: number;
};

/** An existing client, as loaded for duplicate detection. */
export type ExistingClient = {
  id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  dob: string | null;
  ssn_last4: string | null;
  phone: string | null;
  email: string | null;
};
