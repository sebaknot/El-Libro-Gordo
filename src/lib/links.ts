import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LinkRecord = {
  id: string;
  token: string;
  household_id: string;
  purpose: string;
  expires_at: string;
  max_uses: number;
  use_count: number;
  dob_attempts: number;
  status: "active" | "used" | "expired" | "locked";
  campaign_id: string | null;
};

/**
 * Fetch + validate a verification link by token. Uses the service-role client
 * (client links have no Supabase auth); callers must only ever surface masked
 * data derived from this.
 */
export async function getLinkByToken(token: string): Promise<
  | { ok: true; link: LinkRecord }
  | { ok: false; reason: "not_found" | "expired" | "locked" | "used" }
> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return { ok: false, reason: "not_found" };
  }
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("verification_links")
    .select("id, token, household_id, purpose, expires_at, max_uses, use_count, dob_attempts, status, campaign_id")
    .eq("token", token)
    .single();
  if (!link) return { ok: false, reason: "not_found" };

  if (link.status === "locked") return { ok: false, reason: "locked" };
  if (link.status === "used" || link.use_count >= link.max_uses) return { ok: false, reason: "used" };
  if (link.status === "expired" || new Date(link.expires_at) < new Date()) {
    if (link.status !== "expired") {
      await admin.from("verification_links").update({ status: "expired" }).eq("id", link.id);
    }
    return { ok: false, reason: "expired" };
  }
  return { ok: true, link: link as LinkRecord };
}

export async function auditClientLink(
  action: "link_opened" | "link_submitted" | "login_failed",
  linkId: string,
  metadata: Record<string, unknown>,
  ip: string | null
) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_type: "client_link",
    action,
    entity_type: "verification_link",
    entity_id: linkId,
    metadata,
    ip_address: ip,
  });
}
