import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "login"
  | "login_failed"
  | "link_opened"
  | "link_submitted";

/** Writes an audit_log row via the security-definer log_audit() RPC. */
export async function logAudit(
  action: AuditAction,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  const { error } = await supabase.rpc("log_audit", {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId ?? undefined,
    p_metadata: metadata ?? undefined,
    p_ip: ip ?? undefined,
  });
  if (error) console.error("audit_log write failed:", error.message);
}
