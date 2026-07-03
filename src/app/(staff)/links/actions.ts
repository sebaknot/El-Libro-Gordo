"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const PURPOSES = ["renewal", "income_update", "new_client_intake"] as const;

/** Blueprint step 1: create verification_links rows (uuid token, 14-day expiry, max 3 uses). */
export async function generateLinks(formData: FormData) {
  await requireStaff();
  const householdIds = formData.getAll("household_id").map(String).filter(Boolean);
  const purpose = String(formData.get("purpose") ?? "renewal");
  const days = Math.min(Math.max(Number(formData.get("days")) || 14, 1), 60);

  if (householdIds.length === 0) redirect("/links?error=no_households");
  if (!PURPOSES.includes(purpose as (typeof PURPOSES)[number])) redirect("/links?error=bad_purpose");

  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const rows = householdIds.slice(0, 100).map((household_id) => ({
    household_id,
    purpose,
    expires_at: expiresAt,
    max_uses: 3,
  }));

  const { data, error } = await supabase
    .from("verification_links")
    .insert(rows)
    .select("id");
  if (error) redirect(`/links?error=${encodeURIComponent(error.message)}`);

  for (const row of data ?? []) {
    await logAudit("create", "verification_link", row.id, { purpose });
  }
  revalidatePath("/links");
  redirect("/links?created=" + (data?.length ?? 0));
}

export async function expireLink(linkId: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("verification_links").update({ status: "expired" }).eq("id", linkId);
  await logAudit("update", "verification_link", linkId, { action: "manually_expired" });
  revalidatePath("/links");
}
