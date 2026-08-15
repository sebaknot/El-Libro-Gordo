"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/** Owner-only (RLS re-checks). Rates are append-only: to change a rate for a
 *  new year, add a new row — existing rows are never edited or overwritten. */
export async function addCommissionRate(formData: FormData) {
  await requireRole(["owner"]);
  const carrierId = String(formData.get("carrier_id") ?? "");
  const planType = String(formData.get("plan_type") ?? "").trim();
  const planYear = Number(formData.get("plan_year"));
  const rate = Number(formData.get("rate_per_member_month"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!carrierId || !planType || !Number.isInteger(planYear) || planYear < 2000 || !(rate >= 0)) {
    redirect("/commissions/rates?error=Carrier%2C+plan+type%2C+year+and+a+valid+rate+are+required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_rates")
    .insert({
      carrier_id: carrierId,
      plan_type: planType,
      plan_year: planYear,
      rate_per_member_month: rate,
      notes,
    })
    .select("id")
    .single();
  if (error || !data) {
    redirect(`/commissions/rates?error=${encodeURIComponent(error?.message ?? "insert failed")}`);
  }

  await logAudit("create", "commission_rate", data.id, { plan_year: planYear, plan_type: planType });
  revalidatePath("/commissions/rates");
  redirect("/commissions/rates");
}

/**
 * Records a month's commission for a policy. expected_amount is derived from
 * the matching commission_rates row (carrier + plan type + plan year) times
 * the household size (1 when unset); status follows from received vs expected.
 */
export async function recordCommissionPayment(
  policyId: string,
  periodMonth: string,
  receivedAmount: number | null
) {
  const staff = await requireStaff();
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(periodMonth)) {
    redirect("/commissions?error=Invalid+period+month");
  }
  const period = periodMonth.length === 7 ? `${periodMonth}-01` : periodMonth;

  const supabase = await createClient();
  const { data: policy } = await supabase
    .from("policies")
    .select("id, carrier_id, plan_type, plan_year, households(household_size)")
    .eq("id", policyId)
    .single();
  if (!policy) redirect("/commissions?error=Policy+not+found");

  let expected: number | null = null;
  if (policy.carrier_id) {
    const { data: rate } = await supabase
      .from("commission_rates")
      .select("rate_per_member_month")
      .eq("carrier_id", policy.carrier_id)
      .eq("plan_type", policy.plan_type)
      .eq("plan_year", policy.plan_year)
      .maybeSingle();
    if (rate) {
      const size =
        (policy.households as unknown as { household_size: number | null } | null)
          ?.household_size ?? 1;
      expected = Number(rate.rate_per_member_month) * (size || 1);
    }
  }

  const received = receivedAmount != null && Number.isFinite(receivedAmount) ? receivedAmount : null;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const periodPassed = new Date(`${period}T00:00:00Z`) < new Date(monthStart.toISOString().slice(0, 10));

  let status: "pending" | "paid" | "underpaid" | "missing";
  if (received != null && received > 0) {
    status = expected == null || received >= expected ? "paid" : "underpaid";
  } else {
    status = periodPassed ? "missing" : "pending";
  }

  const { data, error } = await supabase
    .from("commission_payments")
    .upsert(
      {
        policy_id: policyId,
        period_month: period,
        expected_amount: expected,
        received_amount: received,
        status,
        reconciled_by: staff.id,
      },
      { onConflict: "policy_id,period_month" }
    )
    .select("id")
    .single();
  if (error || !data) {
    redirect(`/commissions?error=${encodeURIComponent(error?.message ?? "save failed")}`);
  }

  await logAudit("update", "commission_payment", data.id, {
    policy_id: policyId,
    period_month: period,
    status,
  });
  revalidatePath("/commissions");
  redirect("/commissions");
}

/** Form wrapper for the quick-add rows on the reconciliation page. */
export async function recordCommissionPaymentForm(policyId: string, formData: FormData) {
  const period = String(formData.get("period_month") ?? "");
  const raw = String(formData.get("received_amount") ?? "").trim();
  await recordCommissionPayment(policyId, period, raw === "" ? null : Number(raw));
}
