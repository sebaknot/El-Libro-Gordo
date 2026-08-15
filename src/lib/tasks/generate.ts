import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AutoTaskSummary = {
  income_stale: number;
  medicare_aging_in: number;
  delinquent_policy: number;
  commission_discrepancy: number;
  total: number;
};

type NewTask = {
  household_id: string | null;
  client_id: string | null;
  title: string;
  detail: string | null;
  type: string;
  due_date: string | null;
  auto_generated: true;
};

const DAY = 24 * 60 * 60 * 1000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Scans the book and creates open auto-generated tasks for anything that
 * needs staff attention. Idempotent: an entity that already has an open
 * auto-generated task of the same type is skipped, so this can run daily
 * (cron) or on demand (owner button) without piling up duplicates.
 *
 * Works with either a staff-session client (RLS applies) or the
 * service-role client (cron, no session).
 */
export async function generateAutoTasks(supabase: SupabaseClient): Promise<AutoTaskSummary> {
  const today = new Date();

  // Existing open auto tasks → dedupe keys "type:entityId".
  const { data: openTasks } = await supabase
    .from("tasks")
    .select("type, household_id, client_id")
    .eq("status", "open")
    .eq("auto_generated", true);
  const existing = new Set(
    (openTasks ?? []).map((t) => `${t.type}:${t.household_id ?? t.client_id}`)
  );
  const toCreate: NewTask[] = [];
  const seen = new Set<string>(); // avoid duplicates within this run

  function propose(key: string, task: NewTask) {
    if (existing.has(key) || seen.has(key)) return;
    seen.add(key);
    toCreate.push(task);
  }

  // a) Households with no income verification, or one older than a year.
  const { data: households } = await supabase
    .from("households")
    .select("id, household_name, income_verified_date");
  for (const h of households ?? []) {
    const stale =
      !h.income_verified_date ||
      today.getTime() - new Date(h.income_verified_date).getTime() > 365 * DAY;
    if (!stale) continue;
    propose(`income_stale:${h.id}`, {
      household_id: h.id,
      client_id: null,
      title: `Income verification overdue — ${h.household_name}`,
      detail: h.income_verified_date
        ? `Last verified ${h.income_verified_date} (over a year ago).`
        : "Income has never been verified.",
      type: "income_stale",
      due_date: null,
      auto_generated: true,
    });
  }

  // b) Clients within 90 days of turning 65 who aren't in Medicare transition.
  const { data: clients } = await supabase
    .from("clients")
    .select("id, household_id, first_name, last_name, dob, status")
    .not("dob", "is", null)
    .neq("status", "medicare_transition");
  for (const c of clients ?? []) {
    const dob = new Date(`${c.dob}T00:00:00Z`);
    const birthday65 = new Date(
      Date.UTC(dob.getUTCFullYear() + 65, dob.getUTCMonth(), dob.getUTCDate())
    );
    const daysUntil = (birthday65.getTime() - today.getTime()) / DAY;
    if (daysUntil < 0 || daysUntil > 90) continue;
    propose(`medicare_aging_in:${c.id}`, {
      household_id: c.household_id,
      client_id: c.id,
      title: `Medicare aging-in — ${c.first_name} ${c.last_name} turns 65 on ${iso(birthday65)}`,
      detail: "Start the Medicare transition before the marketplace plan lapses.",
      type: "medicare_aging_in",
      due_date: iso(birthday65),
      auto_generated: true,
    });
  }

  // c) Delinquent policies.
  const { data: delinquent } = await supabase
    .from("policies")
    .select(
      "id, client_id, household_id, plan_name, plan_type, policy_number, carriers(name), clients(first_name, last_name)"
    )
    .eq("status", "delinquent");
  for (const p of delinquent ?? []) {
    const client = p.clients as unknown as { first_name: string; last_name: string } | null;
    const carrier = (p.carriers as unknown as { name: string } | null)?.name;
    propose(`delinquent_policy:${p.client_id}`, {
      household_id: p.household_id,
      client_id: p.client_id,
      title: `Delinquent policy — ${client ? `${client.first_name} ${client.last_name}` : "client"} (${carrier ?? p.plan_name ?? p.plan_type})`,
      detail: p.policy_number ? `Policy #${p.policy_number} is delinquent.` : "Policy is delinquent.",
      type: "delinquent_policy",
      due_date: null,
      auto_generated: true,
    });
  }

  // d) Underpaid / missing commission payments.
  const { data: discrepancies } = await supabase
    .from("commission_payments")
    .select(
      "id, status, period_month, expected_amount, received_amount, policies(client_id, household_id, clients(first_name, last_name), carriers(name))"
    )
    .in("status", ["underpaid", "missing"]);
  for (const cp of discrepancies ?? []) {
    const policy = cp.policies as unknown as {
      client_id: string;
      household_id: string;
      clients: { first_name: string; last_name: string } | null;
      carriers: { name: string } | null;
    } | null;
    if (!policy) continue;
    const name = policy.clients
      ? `${policy.clients.first_name} ${policy.clients.last_name}`
      : "client";
    propose(`commission_discrepancy:${policy.client_id}`, {
      household_id: policy.household_id,
      client_id: policy.client_id,
      title: `Commission ${cp.status} — ${name} (${String(cp.period_month).slice(0, 7)})`,
      detail:
        cp.expected_amount != null
          ? `Expected $${cp.expected_amount}, received $${cp.received_amount ?? 0}${policy.carriers ? ` from ${policy.carriers.name}` : ""}.`
          : null,
      type: "commission_discrepancy",
      due_date: null,
      auto_generated: true,
    });
  }

  if (toCreate.length > 0) {
    const { error } = await supabase.from("tasks").insert(toCreate);
    if (error) throw new Error(`task insert failed: ${error.message}`);
  }

  const count = (type: string) => toCreate.filter((t) => t.type === type).length;
  return {
    income_stale: count("income_stale"),
    medicare_aging_in: count("medicare_aging_in"),
    delinquent_policy: count("delinquent_policy"),
    commission_discrepancy: count("commission_discrepancy"),
    total: toCreate.length,
  };
}
