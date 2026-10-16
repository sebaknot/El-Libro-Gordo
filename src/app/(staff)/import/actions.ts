"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { UNDO_ROLES } from "@/lib/import/access";
import { logAudit } from "@/lib/audit";
import { detectMapping, mappingIsComplete, PLATFORM_FIELDS } from "@/lib/import/columns";
import { MAX_FILE_BYTES, MAX_ROWS, readWorkbook, sniffFileKind } from "@/lib/import/file";
import { applyMapping } from "@/lib/import/grouping";
import { ImportHardFailure, runImport } from "@/lib/import/run";
import { validateRows } from "@/lib/import/validate";
import type { ColumnMapping, DuplicateMode } from "@/lib/import/types";
import {
  loadExistingSnapshot,
  logImportStep,
  readBatchPayload,
  requireImportAccess,
  type StashedPayload,
} from "@/lib/import/server";

const UPLOADS_PER_HOUR = 10;

function bail(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

export async function uploadSpreadsheet(formData: FormData) {
  const staff = await requireImportAccess();
  if (!process.env.SSN_ENCRYPTION_KEY) {
    logImportStep("upload", null, { code: "ENV", message: "SSN_ENCRYPTION_KEY is not set" });
    bail("/import", "server_config");
  }
  const supabase = await createClient();

  // Opportunistic TTL cleanup, then the rate limit.
  const { error: cleanupError } = await supabase.rpc("import_cleanup_expired");
  if (cleanupError) logImportStep("cleanup_expired", null, cleanupError); // non-fatal
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("import_batches")
    .select("id", { count: "exact", head: true })
    .eq("uploaded_by", staff.id)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= UPLOADS_PER_HOUR) bail("/import", "rate_limited");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) bail("/import", "no_file");
  if (file.size > MAX_FILE_BYTES) bail("/import", "too_big");

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffFileKind(buffer, file.name);
  if (!kind) bail("/import", "bad_type");

  let payload: StashedPayload;
  let sheetNames: string[];
  try {
    const wb = readWorkbook(buffer, kind);
    sheetNames = wb.sheetNames;
    payload = { sheets: {} };
    for (const name of sheetNames) {
      const { headers, rows } = wb.rowsFor(name);
      const overLimit = rows.length > MAX_ROWS;
      payload.sheets[name] = {
        headers,
        // Values become plain strings; the raw file itself is never stored.
        rows: overLimit
          ? []
          : rows.map((r) =>
              Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")]))
            ),
        overLimit,
      };
    }
  } catch (e) {
    bail("/import", e instanceof Error && e.message === "macros" ? "macros" : "unreadable");
  }

  const usable = sheetNames.filter((s) => !payload.sheets[s].overLimit && payload.sheets[s].rows.length > 0);
  if (usable.length === 0) {
    bail("/import", sheetNames.some((s) => payload.sheets[s].overLimit) ? "too_many_rows" : "empty");
  }
  if (JSON.stringify(payload).length > 12 * 1024 * 1024) bail("/import", "too_big");

  const firstSheet = usable[0];
  const rowCount = payload.sheets[firstSheet].rows.length;

  const { data: batch, error } = await supabase
    .from("import_batches")
    .insert({
      uploaded_by: staff.id,
      filename: file.name.slice(0, 200),
      sheet_name: usable.length === 1 ? firstSheet : null,
      status: "uploaded",
      row_count: rowCount,
    })
    .select("id")
    .single();
  if (error || !batch) {
    logImportStep("insert_batch", null, error);
    bail("/import", "insert_failed");
  }
  logImportStep("insert_batch", batch!.id);

  const { error: stashError } = await supabase.rpc("import_stash_payload", {
    p_batch_id: batch!.id,
    p_payload: payload,
    p_key: process.env.SSN_ENCRYPTION_KEY,
  });
  if (stashError) {
    logImportStep("stash_payload", batch!.id, stashError);
    // Leave no orphaned batch row behind when the stash can't be written.
    await supabase.from("import_batches").update({ status: "failed" }).eq("id", batch!.id);
    bail("/import", stashError.code === "PGRST202" ? "missing_function" : "stash_failed");
  }
  logImportStep("stash_payload", batch!.id);

  await logAudit("import_started", "import_batch", batch!.id, {
    filename: file.name.slice(0, 200),
    sheets: sheetNames.length,
  });

  redirect(`/import/${batch!.id}/map`);
}

export async function saveMapping(batchId: string, formData: FormData) {
  await requireImportAccess();
  const supabase = await createClient();

  const sheet = String(formData.get("sheet") ?? "");
  const headerCount = Number(formData.get("header_count") ?? 0);
  const mapping: ColumnMapping = {};
  const seen = new Set<string>();
  for (let i = 0; i < headerCount && i < 200; i++) {
    const header = String(formData.get(`header_${i}`) ?? "");
    const field = String(formData.get(`map_${i}`) ?? "ignore");
    if (!header) continue;
    const valid = field === "ignore" || (PLATFORM_FIELDS as readonly string[]).includes(field);
    // A field mapped twice keeps only the first column.
    if (!valid || (field !== "ignore" && seen.has(field))) {
      mapping[header] = "ignore";
      continue;
    }
    mapping[header] = field as ColumnMapping[string];
    if (field !== "ignore") seen.add(field);
  }

  if (!mappingIsComplete(mapping)) {
    redirect(`/import/${batchId}/map?error=need_names&sheet=${encodeURIComponent(sheet)}`);
  }

  const { data: updated, error } = await supabase
    .from("import_batches")
    .update({ sheet_name: sheet, mapping, status: "mapped" })
    .eq("id", batchId)
    .in("status", ["uploaded", "mapped"])
    .select("id");
  if (error || !updated || updated.length === 0) {
    // A zero-row update is not an error to PostgREST — catch it explicitly so
    // a stuck batch can't fail silently.
    logImportStep("save_mapping", batchId, error ?? { code: "0ROWS", message: "update matched no rows" });
    redirect(`/import/${batchId}/map?error=${error ? "save_failed" : "not_found"}`);
  }
  logImportStep("save_mapping", batchId);

  // Optionally remember this mapping for future uploads from the same source.
  const saveName = String(formData.get("save_mapping_name") ?? "").trim();
  if (saveName) {
    const staff = await requireImportAccess();
    await supabase
      .from("import_mappings")
      .insert({ created_by: staff.id, name: saveName.slice(0, 100), mapping });
  }

  redirect(`/import/${batchId}/preview`);
}

export async function executeImport(batchId: string, formData: FormData) {
  const staff = await requireImportAccess();
  const supabase = await createClient();

  const modeRaw = String(formData.get("duplicate_mode") ?? "skip");
  const mode: DuplicateMode = ["skip", "update", "import_new"].includes(modeRaw)
    ? (modeRaw as DuplicateMode)
    : "skip";

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, status, sheet_name, mapping, filename")
    .eq("id", batchId)
    .single();
  if (!batch || batch.status !== "mapped" || !batch.sheet_name || !batch.mapping) {
    bail(`/import/${batchId}/preview`, "not_ready");
  }

  const read = await readBatchPayload(batchId);
  if (!read.ok) bail(`/import/${batchId}/preview`, read.reason);
  const payload = read.payload;

  const sheet = payload.sheets[batch!.sheet_name!];
  if (!sheet) bail(`/import/${batchId}/preview`, "expired");

  // Server-held data, re-validated from scratch — the browser's preview is
  // never the source of truth.
  const snapshot = await loadExistingSnapshot();
  const mapped = applyMapping(sheet.rows, batch!.mapping as Record<string, string>);
  const validated = validateRows(mapped, snapshot.clients, snapshot.policyNumbers);

  const { error: markError } = await supabase
    .from("import_batches")
    .update({ status: "importing", options: { duplicate_mode: mode } })
    .eq("id", batchId);
  if (markError) logImportStep("mark_importing", batchId, markError);
  else logImportStep("mark_importing", batchId);

  const admin = createAdminClient();
  try {
    const result = await runImport({
      supabase: admin,
      rows: validated,
      duplicateMode: mode,
      batchId,
      ssnKey: process.env.SSN_ENCRYPTION_KEY,
      existingClients: snapshot.clients,
    });

    logImportStep("run_import", batchId);
    const { error: finishError } = await supabase
      .from("import_batches")
      .update({
        status: "imported",
        finished_at: new Date().toISOString(),
        created_households: result.counts.households,
        created_clients: result.counts.clients,
        created_policies: result.counts.policies,
        created_carriers: result.counts.carriers,
        updated_clients: result.counts.updated,
        skipped_rows: result.counts.skipped,
        error_rows: result.counts.failed,
        warning_rows: validated.filter((r) => r.status === "warning").length,
        report: result.report, // masked; built by the engine, PII-free
      })
      .eq("id", batchId);
    if (finishError) logImportStep("mark_imported", batchId, finishError);

    // The encrypted rows are no longer needed — drop them immediately.
    await admin.from("import_batches").update({ payload_encrypted: null }).eq("id", batchId);

    await logAudit("import_completed", "import_batch", batchId, {
      filename: batch!.filename,
      clients: result.counts.clients,
      households: result.counts.households,
      policies: result.counts.policies,
      updated: result.counts.updated,
      skipped: result.counts.skipped,
      failed: result.counts.failed,
      duplicate_mode: mode,
      by: staff.id,
    });
  } catch (e) {
    logImportStep("run_import", batchId, {
      code: e instanceof ImportHardFailure ? "HARD_FAIL" : "UNEXPECTED",
      message: e instanceof Error ? e.message : String(e),
    });
    await supabase.from("import_batches").update({ status: "failed" }).eq("id", batchId);
    await admin.from("import_batches").update({ payload_encrypted: null }).eq("id", batchId);
    if (e instanceof ImportHardFailure) {
      bail(`/import/${batchId}/preview`, "import_failed");
    }
    throw e;
  }

  revalidatePath("/clients");
  revalidatePath("/households");
  revalidatePath("/dashboard");
  redirect(`/import/${batchId}/result`);
}

/** Remove a stuck or finished-with-nothing batch (its encrypted payload too). */
export async function discardImport(batchId: string) {
  await requireImportAccess();
  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, status, filename")
    .eq("id", batchId)
    .single();
  if (!batch) redirect("/import/history");
  if (!["uploaded", "mapped", "expired", "failed", "importing"].includes(batch!.status)) {
    redirect(`/import/history?error=${encodeURIComponent("Finished imports can't be discarded — use Undo instead")}`);
  }

  // authenticated has no DELETE grant on import_batches by design; the
  // role-gated service client removes the row (and its encrypted payload).
  const admin = createAdminClient();
  const { error } = await admin.from("import_batches").delete().eq("id", batchId);
  if (error) {
    logImportStep("discard", batchId, error);
    redirect(`/import/history?error=${encodeURIComponent(error.message)}`);
  }
  logImportStep("discard", batchId);
  await logAudit("delete", "import_batch", batchId, { filename: batch!.filename, was_status: batch!.status });
  revalidatePath("/import/history");
  redirect("/import/history?discarded=1");
}

export async function undoImport(batchId: string) {
  await requireRole([...UNDO_ROLES]); // UI confirms; DB re-checks owner again
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_undo_import", { p_batch_id: batchId });
  if (error) {
    logImportStep("undo", batchId, error);
    redirect(`/import/history?error=${encodeURIComponent(error.message)}`);
  }
  logImportStep("undo", batchId);
  revalidatePath("/clients");
  revalidatePath("/households");
  revalidatePath("/import/history");
  redirect("/import/history?undone=1");
}
