/**
 * The import engine: takes validated rows and writes households, clients,
 * policies and carriers, tagged with a batch id. Used by BOTH the web wizard
 * (service-role client, role-gated in the server action) and the CLI script.
 *
 * Atomicity: supabase-js cannot open a multi-statement transaction, so the
 * engine is atomic-by-compensation — any hard failure stops the run and
 * deletes everything tagged with this batch id before rethrowing, leaving
 * nothing partial behind. Per-row soft failures (one bad policy) are recorded
 * in the report and do not abort the batch.
 *
 * This module NEVER logs. SSNs exist here only as in-memory digits on their
 * way to pgcrypto; the report carries masked values only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { groupHouseholds } from "./grouping";
import { maskSsn } from "./parse";
import type {
  DuplicateMode,
  ExistingClient,
  ImportCounts,
  IssueCode,
  ValidatedRow,
} from "./types";

export type ReportRow = {
  row: number;
  name: string;
  outcome: "created" | "updated" | "skipped" | "failed";
  ssn: string; // always masked
  issues: IssueCode[];
  note?: string;
};

export type ImportResult = {
  counts: ImportCounts;
  report: ReportRow[];
};

export class ImportHardFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportHardFailure";
  }
}

/** Deletes everything tagged with the batch — the compensation path. */
export async function rollbackBatch(supabase: SupabaseClient, batchId: string): Promise<void> {
  await supabase.from("policies").delete().eq("import_batch_id", batchId);
  await supabase.from("tasks").delete().eq("type", "data_cleanup").eq("auto_generated", true)
    .in("client_id",
      (await supabase.from("clients").select("id").eq("import_batch_id", batchId)).data?.map((c) => c.id) ?? []);
  await supabase.from("clients").delete().eq("import_batch_id", batchId);
  await supabase.from("households").delete().eq("import_batch_id", batchId);
  await supabase.from("carriers").delete().eq("import_batch_id", batchId);
}

export async function runImport(args: {
  supabase: SupabaseClient; // service-role; caller is responsible for auth gating
  rows: ValidatedRow[];
  duplicateMode: DuplicateMode;
  batchId: string | null; // null = untracked (CLI without batch)
  ssnKey: string | undefined;
  existingClients: ExistingClient[];
}): Promise<ImportResult> {
  const { supabase, rows, duplicateMode, batchId, ssnKey } = args;
  const existingById = new Map(args.existingClients.map((c) => [c.id, c]));

  const counts: ImportCounts = {
    households: 0,
    clients: 0,
    policies: 0,
    carriers: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const report: ReportRow[] = [];
  const carrierCache = new Map<string, string>(); // lowercased name → id

  const rowName = (r: ValidatedRow) =>
    `${r.clean.first_name ?? "?"} ${r.clean.last_name ?? "?"}`;

  async function resolveCarrier(name: string): Promise<string | null> {
    const key = name.toLowerCase();
    if (carrierCache.has(key)) return carrierCache.get(key)!;
    const { data: found } = await supabase
      .from("carriers")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (found) {
      carrierCache.set(key, found.id);
      return found.id;
    }
    const { data: created, error } = await supabase
      .from("carriers")
      .insert({ name, import_batch_id: batchId })
      .select("id")
      .single();
    if (error || !created) return null;
    counts.carriers++;
    carrierCache.set(key, created.id);
    return created.id;
  }

  async function insertPolicy(clientId: string, householdId: string, r: ValidatedRow) {
    const c = r.clean;
    if (!c.carrier && !c.plan_name && !c.policy_number) return;
    const carrierId = c.carrier ? await resolveCarrier(c.carrier) : null;
    const { error } = await supabase.from("policies").insert({
      client_id: clientId,
      household_id: householdId,
      carrier_id: carrierId,
      plan_name: c.plan_name ?? null,
      plan_year: c.plan_year ?? new Date().getFullYear(),
      policy_number: c.policy_number ?? null,
      monthly_premium: c.monthly_premium,
      subsidy_amount: c.subsidy,
      net_premium:
        c.monthly_premium != null
          ? Math.max(0, c.monthly_premium - (c.subsidy ?? 0))
          : null,
      status: "active",
      import_batch_id: batchId,
    });
    if (!error) counts.policies++;
    return error?.message;
  }

  async function storeSsn(clientId: string, ssn: string) {
    if (!ssnKey) return;
    await supabase.rpc("set_client_ssn_admin", {
      p_client_id: clientId,
      p_ssn: ssn,
      p_key: ssnKey,
    });
  }

  async function createCleanupTask(clientId: string, householdId: string, r: ValidatedRow) {
    const needs = r.issues.filter((i) =>
      ["missing_dob", "bad_dob", "missing_phone", "bad_phone"].includes(i)
    );
    if (needs.length === 0) return;
    const detail = needs
      .map(
        (i) =>
          ({
            missing_dob: "Missing date of birth (needed for magic links)",
            bad_dob: "Date of birth could not be read from the spreadsheet",
            missing_phone: "Missing phone number (needed for magic links)",
            bad_phone: "Phone number could not be read from the spreadsheet",
          })[i as "missing_dob"]
      )
      .join("; ");
    await supabase.from("tasks").insert({
      client_id: clientId,
      household_id: householdId,
      title: `Data cleanup: ${rowName(r)}`,
      detail,
      type: "data_cleanup",
      status: "open",
      auto_generated: true,
    });
  }

  try {
    // ---- Partition rows by what happens to them.
    const toCreate: ValidatedRow[] = [];
    const toUpdate: ValidatedRow[] = [];

    for (const r of rows) {
      if (r.status === "error") {
        counts.failed++;
        report.push({
          row: r.row,
          name: rowName(r),
          outcome: "failed",
          ssn: maskSsn(r.clean.ssn_last4),
          issues: r.issues,
        });
        continue;
      }
      if (r.status === "duplicate") {
        if (duplicateMode === "import_new") {
          toCreate.push(r);
        } else if (
          duplicateMode === "update" &&
          r.duplicate?.kind === "db" &&
          r.duplicate.clientId
        ) {
          toUpdate.push(r);
        } else {
          counts.skipped++;
          report.push({
            row: r.row,
            name: rowName(r),
            outcome: "skipped",
            ssn: maskSsn(r.clean.ssn_last4),
            issues: r.issues,
            note: "duplicate",
          });
        }
        continue;
      }
      toCreate.push(r);
    }

    // ---- Update path: fill blanks only, never overwrite existing values.
    for (const r of toUpdate) {
      const target = existingById.get(r.duplicate!.clientId!);
      if (!target) {
        counts.skipped++;
        report.push({
          row: r.row,
          name: rowName(r),
          outcome: "skipped",
          ssn: maskSsn(r.clean.ssn_last4),
          issues: r.issues,
          note: "duplicate",
        });
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (!target.dob && r.clean.dob) patch.dob = r.clean.dob;
      if (!target.phone && r.clean.phone) patch.phone = r.clean.phone;
      if (!target.email && r.clean.email) patch.email = r.clean.email;
      if (Object.keys(patch).length > 0) {
        await supabase.from("clients").update(patch).eq("id", target.id);
      }
      if (!target.ssn_last4 && r.clean.ssn) await storeSsn(target.id, r.clean.ssn);
      // A policy number we haven't seen yet still gets added.
      if (r.clean.policy_number || r.clean.plan_name || r.clean.carrier) {
        const { data: existingPolicy } = r.clean.policy_number
          ? await supabase
              .from("policies")
              .select("id")
              .eq("client_id", target.id)
              .ilike("policy_number", r.clean.policy_number)
              .maybeSingle()
          : { data: null };
        if (!existingPolicy) await insertPolicy(target.id, target.household_id, r);
      }
      counts.updated++;
      report.push({
        row: r.row,
        name: rowName(r),
        outcome: "updated",
        ssn: maskSsn(r.clean.ssn_last4),
        issues: r.issues,
      });
    }

    // ---- Create path: group into households, then insert.
    const groups = groupHouseholds(toCreate);
    for (const [householdName, members] of groups) {
      const first = members[0].clean;
      const { data: h, error: hErr } = await supabase
        .from("households")
        .insert({
          household_name: householdName,
          address_street: first.address ?? null,
          address_city: first.city ?? null,
          address_state: first.state ?? null,
          address_zip: first.zip ?? null,
          annual_income: first.annual_income,
          household_size: first.household_size ?? members.length,
          preferred_language: first.language ?? "es",
          import_batch_id: batchId,
        })
        .select("id")
        .single();
      if (hErr || !h) {
        throw new ImportHardFailure(`household insert failed: ${hErr?.message}`);
      }
      counts.households++;

      let primaryClientId: string | null = null;
      for (const [i, member] of members.entries()) {
        const c = member.clean;
        const { data: client, error: cErr } = await supabase
          .from("clients")
          .insert({
            household_id: h.id,
            first_name: c.first_name,
            last_name: c.last_name,
            dob: c.dob,
            phone: c.phone,
            whatsapp_phone: c.whatsapp_phone,
            email: c.email,
            status: "active",
            is_primary: i === 0,
            import_batch_id: batchId,
          })
          .select("id")
          .single();
        if (cErr || !client) {
          throw new ImportHardFailure(`client insert failed: ${cErr?.message}`);
        }
        if (i === 0) primaryClientId = client.id;
        counts.clients++;

        if (c.ssn) await storeSsn(client.id, c.ssn);
        const policyError = await insertPolicy(client.id, h.id, member);
        await createCleanupTask(client.id, h.id, member);

        report.push({
          row: member.row,
          name: rowName(member),
          outcome: "created",
          ssn: maskSsn(c.ssn_last4),
          issues: member.issues,
          note: policyError ? "policy could not be added" : undefined,
        });
      }

      if (primaryClientId) {
        await supabase
          .from("households")
          .update({ primary_client_id: primaryClientId })
          .eq("id", h.id);
      }
    }

    return { counts, report };
  } catch (e) {
    // Hard failure: wipe everything this batch created, then rethrow.
    if (batchId) await rollbackBatch(supabase, batchId);
    throw e;
  }
}
