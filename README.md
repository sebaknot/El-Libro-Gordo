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
2. **Run the migrations**: open the SQL editor and run, in order,
   `supabase/migrations/0001_schema.sql`, `0002_delete_household.sql`, and
   `0003_import_batches.sql`, each in full. They create every table, RLS
   policies, the append-only audit log, pgcrypto SSN functions, trigram search
   indexes, the private `documents` storage bucket, and the import/undo
   machinery.
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

## Importing clients

### Web import wizard (`/import`, owner & agent only)

Upload an `.xlsx` or `.csv` (max 10 MB / 5,000 rows; macro and legacy `.xls`
files are rejected by file signature, not just extension) and walk four steps:

1. **Upload** — pick the file (and sheet, for multi-sheet workbooks), or start
   from the downloadable template. The parsed rows are held server-side,
   pgcrypto-encrypted, for at most 30 minutes; the raw file is never stored.
2. **Map columns** — headers are auto-detected in English *and* Spanish
   ("Nombre", "Fecha de nacimiento", "Aseguradora"…); fix any guess with a
   dropdown, and optionally save the mapping for repeat uploads.
3. **Preview** — nothing is written yet. Row-by-row statuses
   (New / Duplicate / Warning / Error), duplicate detection against the book
   and within the file (SSN last-4 + DOB, name + DOB, phone, policy #), a
   per-upload duplicate policy (skip · update-blanks-only · import as new),
   and a downloadable problem-rows CSV. Rows missing DOB/phone import with a
   **data cleanup task**, same as the CLI. SSNs appear masked (`***-**-1234`)
   everywhere; DOBs are never echoed back.
4. **Import & report** — runs server-side; a mid-run failure removes
   everything the batch created (nothing partial survives). Every upload is
   recorded in `import_batches`, created records are tagged with the batch id,
   and the history page offers an owner-only **Undo** that deletes only
   batch-created records nobody has touched since. Audit log gets
   `import_started` / `import_completed` / `import_undone` (counts only — no
   client data).

Uploads are rate-limited (10/hour/user). Cell values are sanitized (length
caps, control characters, and leading `=`, `+`, `-`, `@` neutralized) so the
Excel export can never execute a smuggled formula.

**If the wizard stalls**: every step logs a line like
`[import] step=stash_payload batch=<id> FAILED code=… message=…` (codes and
messages only — never row data) to the server log (Vercel → Functions logs),
and the UI names the likely fix. Run `supabase/checks/verify_import_setup.sql`
in the Supabase SQL editor to confirm the import functions, grants, and
columns from migration 0003 are all in place. Stuck batches can be resumed or
discarded from the history page.

### Local end-to-end harness (no real credentials)

`e2e/` contains a mock of the Supabase API surface the app uses plus a
Playwright driver that walks the whole wizard with fake data:

```bash
npm run build
node e2e/mock-supabase.mjs &                                # mock API :4545
node e2e/make-cookies.mjs > /tmp/cookies.json               # fake owner session
NODE_OPTIONS="--import $PWD/e2e/fetch-shim.mjs" \
  NEXT_PUBLIC_SUPABASE_URL=https://placeholder-e2e.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x \
  SSN_ENCRYPTION_KEY=test npx next start -p 3101 &
E2E_COOKIES_FILE=/tmp/cookies.json node e2e/run-wizard.mjs  # 24-step trace
```

### CLI (same engine)

```bash
# Preview without writing anything (works offline):
npm run import:book -- --file ./book.xlsx --dry-run

# Real import:
npm run import:book -- --file ./book.xlsx
```

The CLI shares `src/lib/import/` with the wizard — identical column
detection, parsing, grouping, duplicate rules, and cleanup-task creation.

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
