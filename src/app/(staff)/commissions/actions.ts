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

export type CommissionGroup = {
  householdId: string;
  carrierId: string | null;
  planType: string;
  planYear: number;
};

/**
 * Records a month's commission for a whole household/carrier/plan-type/plan-year
 * group at once. The single received amount is split evenly across the group's
 * active policies in integer cents (any leftover cent lands on the first policy
 * sorted by id), one commission_payments row per policy. expected_amount on each
 * row is the per-member rate from the matching commission_rates row; status is
 * derived per row from its share vs that rate.
 */
export async function recordCommissionPayment(
  group: CommissionGroup,
  periodMonth: string,
  receivedAmount: number | null
) {
  const staff = await requireStaff();
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(periodMonth)) {
    redirect("/commissions?error=Invalid+period+month");
  }
  const period = periodMonth.length === 7 ? `${periodMonth}-01` : periodMonth;

  const supabase = await createClient();
  let policiesQuery = supabase
    .from("policies")
    .select("id")
    .eq("household_id", group.householdId)
    .eq("plan_type", group.planType)
    .eq("plan_year", group.planYear)
    .eq("status", "active")
    .order("id");
  policiesQuery = group.carrierId
    ? policiesQuery.eq("carrier_id", group.carrierId)
    : policiesQuery.is("carrier_id", null);
  const { data: policies } = await policiesQuery;
  if (!policies || policies.length === 0) {
    redirect("/commissions?error=No+active+policies+found+for+that+group");
  }

  // Per-member expected: the matching rate row (rates themselves never change).
  let expectedPerMember: number | null = null;
  if (group.carrierId) {
    const { data: rate } = await supabase
      .from("commission_rates")
      .select("rate_per_member_month")
      .eq("carrier_id", group.carrierId)
      .eq("plan_type", group.planType)
      .eq("plan_year", group.planYear)
      .maybeSingle();
    if (rate) expectedPerMember = Number(rate.rate_per_member_month);
  }

  const received =
    receivedAmount != null && Number.isFinite(receivedAmount) && receivedAmount >= 0
      ? receivedAmount
      : null;

  // Even split in integer cents; remainder cents go to the first policy.
  const n = policies!.length;
  let shares: (number | null)[];
  if (received == null) {
    shares = policies!.map(() => null);
  } else {
    const totalCents = Math.round(received * 100);
    const base = Math.floor(totalCents / n);
    const remainder = totalCents - base * n;
    shares = policies!.map((_, i) => (base + (i === 0 ? remainder : 0)) / 100);
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const periodPassed =
    new Date(`${period}T00:00:00Z`) < new Date(monthStart.toISOString().slice(0, 10));

  const rows = policies!.map((p, i) => {
    const share = shares[i];
    let status: "pending" | "paid" | "underpaid" | "missing";
    if (share != null && share > 0) {
      status = expectedPerMember == null || share >= expectedPerMember ? "paid" : "underpaid";
    } else {
      status = periodPassed ? "missing" : "pending";
    }
    return {
      policy_id: p.id,
      period_month: period,
      expected_amount: expectedPerMember,
      received_amount: share,
      status,
      reconciled_by: staff.id,
    };
  });

  const { error } = await supabase
    .from("commission_payments")
    .upsert(rows, { onConflict: "policy_id,period_month" });
  if (error) {
    redirect(`/commissions?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit("update", "commission_payment", undefined, {
    household_id: group.householdId,
    carrier_id: group.carrierId,
    plan_type: group.planType,
    plan_year: group.planYear,
    period_month: period,
    policies: n,
    received,
  });
  revalidatePath("/commissions");
  redirect("/commissions");
}

/** Form wrapper for the grouped quick-add rows on the reconciliation page. */
export async function recordCommissionPaymentForm(
  householdId: string,
  carrierId: string | null,
  planType: string,
  planYear: number,
  formData: FormData
) {
  const period = String(formData.get("period_month") ?? "");
  const raw = String(formData.get("received_amount") ?? "").trim();
  await recordCommissionPayment(
    { householdId, carrierId, planType, planYear },
    period,
    raw === "" ? null : Number(raw)
  );
}
