"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const PLAN_TYPES = ["marketplace", "medicare", "dental", "vision", "life", "other"];
const STATUSES = ["active", "pending", "terminated", "delinquent"];

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function date(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function text(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function addPolicy(clientId: string, householdId: string, formData: FormData) {
  await requireRole(["owner", "agent"]);
  const back = (error?: string): never =>
    redirect(`/clients/${clientId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);

  const planType = String(formData.get("plan_type") ?? "marketplace");
  const status = String(formData.get("status") ?? "active");
  const planYear = Number(formData.get("plan_year"));
  if (!PLAN_TYPES.includes(planType)) back("Invalid plan type");
  if (!STATUSES.includes(status)) back("Invalid status");
  if (!Number.isInteger(planYear) || planYear < 2000 || planYear > 2100) {
    back("Plan year must be a valid year");
  }

  const monthlyPremium = num(formData, "monthly_premium");
  const subsidy = num(formData, "subsidy_amount");
  // Net premium is derived, never entered by hand.
  const netPremium =
    monthlyPremium != null ? Math.max(0, monthlyPremium - (subsidy ?? 0)) : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("policies")
    .insert({
      client_id: clientId,
      household_id: householdId,
      carrier_id: text(formData, "carrier_id"),
      plan_name: text(formData, "plan_name"),
      plan_type: planType,
      plan_year: planYear,
      metal_tier: text(formData, "metal_tier"),
      monthly_premium: monthlyPremium,
      subsidy_amount: subsidy,
      net_premium: netPremium,
      effective_date: date(formData, "effective_date"),
      termination_date: date(formData, "termination_date"),
      policy_number: text(formData, "policy_number"),
      status,
    })
    .select("id")
    .single();
  if (error || !data) back(error?.message ?? "Could not add policy");

  await logAudit("create", "policy", data!.id, { client_id: clientId, plan_year: planYear });
  revalidatePath(`/clients/${clientId}`);
  back();
}

/** Inline edit of the fields that change over a policy's life. */
export async function updatePolicyStatus(policyId: string, clientId: string, formData: FormData) {
  await requireRole(["owner", "agent"]);
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status)) {
    redirect(`/clients/${clientId}?error=Invalid+status`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("policies")
    .update({ status, termination_date: date(formData, "termination_date") })
    .eq("id", policyId);
  if (error) redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);

  await logAudit("update", "policy", policyId, { status });
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}
