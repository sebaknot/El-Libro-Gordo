import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { IMPORT_ROLES } from "./access";
import type { ExistingClient } from "./types";

/** Everything the wizard needs between steps, encrypted at rest in the batch row. */
export type StashedPayload = {
  sheets: Record<
    string,
    { headers: string[]; rows: Record<string, string>[]; overLimit: boolean }
  >;
};

export async function requireImportAccess() {
  // Owner/agent only; requireRole also enforces the 2FA-verified session.
  return requireRole([...IMPORT_ROLES]);
}

/**
 * Decrypt + return the stashed rows. Server-side ONLY — this contains full
 * SSNs and DOBs and must never be exposed as a server action or sent to the
 * browser whole. Pages derive masked views from it.
 */
export async function readBatchPayload(batchId: string): Promise<StashedPayload | null> {
  await requireImportAccess();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_read_payload", {
    p_batch_id: batchId,
    p_key: process.env.SSN_ENCRYPTION_KEY!,
  });
  if (error || !data) return null;
  return data as StashedPayload;
}

/** DB snapshot used for duplicate detection (server-side only). */
export async function loadExistingSnapshot(): Promise<{
  clients: ExistingClient[];
  policyNumbers: Map<string, string>;
}> {
  await requireImportAccess();
  const admin = createAdminClient();
  const [{ data: clients }, { data: policies }] = await Promise.all([
    admin
      .from("clients")
      .select("id, household_id, first_name, last_name, dob, ssn_last4, phone, email")
      .limit(20000),
    admin
      .from("policies")
      .select("client_id, policy_number")
      .not("policy_number", "is", null)
      .limit(20000),
  ]);
  return {
    clients: (clients ?? []) as ExistingClient[],
    policyNumbers: new Map(
      (policies ?? []).map((p) => [String(p.policy_number).toLowerCase(), p.client_id as string])
    ),
  };
}
