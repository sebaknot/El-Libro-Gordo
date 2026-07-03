# El Libro Gordo — Phase 1

Insurance agency management platform. Phase 1 delivers the foundation and client
database: staff auth with mandatory TOTP 2FA, roles, the full database schema
with Row-Level Security, household/client CRUD, instant search, notes,
documents, an append-only audit log, full-book Excel export, and the one-time
book import script.

Built per `El Libro Gordo — Technical Build Blueprint`. Stack: Next.js
(App Router) + TypeScript + Tailwind, Supabase (PostgreSQL + Auth + Storage),
SheetJS exports, Vercel hosting.

## Setup

1. **Create a Supabase project** (supabase.com → New project).
2. **Run the migration**: open the SQL editor and run
   `supabase/migrations/0001_schema.sql` in full. It creates every table, RLS
   policies, the append-only audit log, pgcrypto SSN functions, trigram search
   indexes, and the private `documents` storage bucket.
3. **Configure env vars**: copy `.env.example` to `.env.local` and fill in the
   project URL, anon key, service-role key, and a generated
   `SSN_ENCRYPTION_KEY` (`openssl rand -base64 32`). Keep that key backed up —
   without it stored SSNs cannot be decrypted.
4. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
5. **Create the first staff account** (owner):
   ```bash
   npm run staff:create -- --email mom@example.com --name "Maria" --role owner --password "temp-password"
   ```
   On first sign-in she is forced through TOTP enrollment (Google
   Authenticator / 1Password) before any page loads. 2FA is not optional.

## Importing the book (day-one task)

```bash
# Preview without writing anything:
npm run import:book -- --file ./book.xlsx --dry-run

# Real import:
npm run import:book -- --file ./book.xlsx
```

The script groups rows by household, creates households → clients → carriers →
policies, encrypts SSNs, and writes `import-report-<timestamp>.json`. Any row
missing a DOB or phone (both required for Phase 2 magic links) gets an
auto-generated **data cleanup task** that shows on the dashboard.

Recognized columns (English/Spanish aliases, order-independent):
`first_name, last_name, dob, phone, email, ssn, household, address, city,
state, zip, annual_income, household_size, language, carrier, plan_name,
plan_year, policy_number, monthly_premium, subsidy`.

## Security notes

- **RLS everywhere** — staff membership and roles are enforced at the database
  level (`is_staff()` / `staff_role()`), not just in the UI.
- **SSNs**: encrypted with pgcrypto; the `ssn_encrypted` column has no
  SELECT/UPDATE grant for API roles, so it can never leak through a query.
  Reveal goes through a dedicated server action → `reveal_client_ssn()` RPC
  (owner/agent only) that writes an `audit_log` row on every call.
- **Audit log**: append-only; triggers reject UPDATE/DELETE, API roles have no
  write grants — rows are written via the `log_audit()` security-definer RPC.
- **Documents**: private bucket, 60-second signed URLs, downloads audited.
- **Exports**: server-generated, audit-logged, timestamped filenames.
- **HSTS + security headers** set in `next.config.mjs`.

## Deploying (Vercel)

Import the repo in Vercel, add the four env vars, deploy. HTTPS is automatic.

## Phase roadmap

Schema for Phases 2–5 (verification links/responses, campaigns, pipeline,
messages, commissions) already ships in the migration so later phases are
additive. Next up: Phase 2 — magic-link verification flow. Also kick off
Twilio A2P 10DLC and WhatsApp Business registration now; approval takes weeks
(needed for Phase 3).
