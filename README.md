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

## Phase 2 — Magic-link verification (shipped)

Staff generate tokenized links per household (**Links** page): uuid token,
14-day expiry, max 3 uses, with ready-to-send bilingual SMS/WhatsApp message
text (manual send until Twilio lands in Phase 3). The client flow at
`/v/{token}` is mobile-first and Spanish-default with a language toggle:

1. **DOB gate** — primary member's date of birth; 5 failures lock the link
   and open a staff task. Success sets a 30-minute HMAC-signed session cookie
   scoped to that token.
2. **Confirm page** — masked data only (first name + last initial, income on
   file, plan). No SSN, no full DOB, ever.
3. **Two paths** — "Todo sigue igual" one-tap, or "Algo cambió" structured
   form: income, employment, address, contact, household add/remove, optional
   income-proof photo upload (private bucket).
4. **Consent** — versioned CMS-style consent text stored verbatim on the
   response (`consent_text_shown`), plus IP and user agent. Responses are
   append-only at the database level.
5. **Review queue** (**Reviews** page) — side-by-side on-file vs. reported
   diff; *Approve & apply* updates household/client records, adds new members
   as pending clients, auto-logs a note, and closes the review task.

Every step writes audit_log rows (`link_opened`, `link_submitted`,
`login_failed`) with `actor_type = client_link`.

## Phase roadmap

Schema for Phases 3–5 (campaigns, pipeline, messages, commissions) already
ships in the migration so later phases are additive. Next up: Phase 3 —
communications hub. Kick off Twilio A2P 10DLC and WhatsApp Business
registration now; approval takes weeks.
