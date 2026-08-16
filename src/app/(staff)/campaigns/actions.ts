"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { runPipelineAutomation } from "@/lib/pipeline/reminders";

const STAGES = [
  "not_contacted",
  "contacted",
  "link_sent",
  "responded",
  "needs_changes",
  "completed",
  "unresponsive",
] as const;

export async function createCampaign(formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  const planYear = Number(formData.get("plan_year"));
  const startsAt = String(formData.get("starts_at") ?? "") || null;
  const endsAt = String(formData.get("ends_at") ?? "") || null;
  if (!name || !Number.isInteger(planYear) || planYear < 2000 || planYear > 2100) {
    redirect("/campaigns?error=Name+and+a+valid+plan+year+are+required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollment_campaigns")
    .insert({ name, plan_year: planYear, starts_at: startsAt, ends_at: endsAt })
    .select("id")
    .single();
  if (error || !data) {
    redirect(`/campaigns?error=${encodeURIComponent(error?.message ?? "insert failed")}`);
  }

  await logAudit("create", "enrollment_campaign", data!.id, { name, plan_year: planYear });
  revalidatePath("/campaigns");
  redirect(`/campaigns/${data!.id}`);
}

export async function addHouseholdsToCampaign(campaignId: string, formData: FormData) {
  await requireStaff();
  const householdIds = formData.getAll("household_ids").map(String).filter(Boolean);
  if (householdIds.length === 0) redirect(`/campaigns/${campaignId}`);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("renewal_pipeline")
    .select("household_id")
    .eq("campaign_id", campaignId);
  const present = new Set((existing ?? []).map((r) => r.household_id));
  const rows = householdIds
    .filter((id) => !present.has(id))
    .map((household_id) => ({ campaign_id: campaignId, household_id }));

  if (rows.length > 0) {
    const { error } = await supabase.from("renewal_pipeline").insert(rows);
    if (error) redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);
    await logAudit("update", "enrollment_campaign", campaignId, {
      op: "add_households",
      count: rows.length,
    });
  }
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

export async function updatePipelineStage(rowId: string, campaignId: string, formData: FormData) {
  await requireStaff();
  const stage = String(formData.get("stage") ?? "");
  if (!(STAGES as readonly string[]).includes(stage)) redirect(`/campaigns/${campaignId}`);

  const supabase = await createClient();
  await supabase
    .from("renewal_pipeline")
    .update({ stage, last_contact_at: new Date().toISOString() })
    .eq("id", rowId);
  await logAudit("update", "renewal_pipeline", rowId, { stage });
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

export async function assignPipelineHousehold(rowId: string, campaignId: string, formData: FormData) {
  await requireStaff();
  const assignedTo = String(formData.get("assigned_to") ?? "") || null;

  const supabase = await createClient();
  await supabase.from("renewal_pipeline").update({ assigned_to: assignedTo }).eq("id", rowId);
  await logAudit("update", "renewal_pipeline", rowId, { assigned_to: assignedTo });
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

/**
 * Bulk: one verification link per selected household (14-day expiry, 3 uses,
 * purpose renewal — same shape as /links generateLinks), then move those
 * pipeline rows to link_sent.
 */
export async function bulkGenerateLinksForCampaign(campaignId: string, formData: FormData) {
  await requireStaff();
  const householdIds = [...new Set(formData.getAll("household_ids").map(String).filter(Boolean))];
  if (householdIds.length === 0) {
    redirect(`/campaigns/${campaignId}?error=Select+at+least+one+household+first`);
  }

  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const rows = householdIds.slice(0, 100).map((household_id) => ({
    household_id,
    purpose: "renewal",
    expires_at: expiresAt,
    max_uses: 3,
    campaign_id: campaignId,
  }));

  const { data: links, error } = await supabase
    .from("verification_links")
    .insert(rows)
    .select("id");
  if (error) redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(error.message)}`);

  for (const link of links ?? []) {
    await logAudit("create", "verification_link", link.id, {
      purpose: "renewal",
      campaign_id: campaignId,
    });
  }

  await supabase
    .from("renewal_pipeline")
    .update({ stage: "link_sent", last_contact_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .in("household_id", householdIds);

  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}?links=${links?.length ?? 0}`);
}

/** Owner-only manual run of the same sweep the 9:00 UTC cron performs. */
export async function runPipelineAutomationNow(campaignId: string) {
  await requireRole(["owner"]);
  const supabase = await createClient();

  const h = await headers();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (h.get("x-forwarded-host") || h.get("host")
      ? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`
      : null);

  const summary = await runPipelineAutomation(supabase, baseUrl);
  await logAudit("update", "renewal_pipeline", undefined, {
    op: "manual_automation_run",
    ...summary,
  });
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(
    `/campaigns/${campaignId}?automation=${encodeURIComponent(
      `${summary.first_reminders} first reminders, ${summary.second_reminders} second reminders, ${summary.marked_unresponsive} marked unresponsive, ${summary.prioritized} prioritized`
    )}`
  );
}
