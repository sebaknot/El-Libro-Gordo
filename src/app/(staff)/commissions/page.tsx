import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { STATUS_BADGE } from "@/components/badges";
import { recordCommissionPaymentForm } from "./actions";

const input =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sapphire focus:outline-none";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; filter?: string }>;
}) {
  await requireStaff();
  const { error, filter } = await searchParams;
  const discrepanciesOnly = filter === "discrepancies";
  const supabase = await createClient();

  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  let paymentsQuery = supabase
    .from("commission_payments")
    .select(
      "id, period_month, expected_amount, received_amount, status, policies(id, plan_name, plan_type, plan_year, policy_number, clients(first_name, last_name), carriers(name))"
    )
    .order("period_month", { ascending: false })
    .limit(300);
  if (discrepanciesOnly) paymentsQuery = paymentsQuery.in("status", ["underpaid", "missing"]);

  const [{ data: payments }, { data: activePolicies }, { data: thisMonth }] = await Promise.all([
    paymentsQuery,
    supabase
      .from("policies")
      .select("id, plan_name, plan_type, plan_year, policy_number, clients(first_name, last_name), carriers(name)")
      .eq("status", "active")
      .limit(300),
    supabase.from("commission_payments").select("policy_id").eq("period_month", currentMonth),
  ]);

  const recorded = new Set((thisMonth ?? []).map((p) => p.policy_id));
  const unrecorded = (activePolicies ?? []).filter((p) => !recorded.has(p.id));

  const policyLabel = (p: {
    plan_name: string | null;
    plan_type: string;
    plan_year: number;
    policy_number: string | null;
    clients: unknown;
    carriers: unknown;
  }) => {
    const client = p.clients as { first_name: string; last_name: string } | null;
    const carrier = (p.carriers as { name: string } | null)?.name;
    return {
      client: client ? `${client.last_name}, ${client.first_name}` : "—",
      plan: [carrier, p.plan_name ?? p.plan_type, p.plan_year].filter(Boolean).join(" · "),
      policyNumber: p.policy_number,
    };
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Commissions</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={discrepanciesOnly ? "/commissions" : "/commissions?filter=discrepancies"}
            className={`rounded-md border px-3 py-1.5 font-medium ${
              discrepanciesOnly
                ? "border-brick/40 bg-brick/10 text-brick"
                : "border-slate-300 bg-white text-slate hover:bg-slate-50"
            }`}
          >
            {discrepanciesOnly ? "Showing discrepancies — show all" : "Discrepancies only"}
          </Link>
          <Link href="/commissions/rates" className="text-sapphire hover:underline">
            Rates →
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      {!discrepanciesOnly && unrecorded.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">
            Not yet recorded for {currentMonth.slice(0, 7)}
          </h2>
          <p className="mt-1 text-sm text-slate">
            Expected amounts are calculated from the carrier&apos;s rate for the plan year ×
            household size when you record the payment.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate">
                <tr>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Period</th>
                  <th className="px-4 py-2 text-right">Received $</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {unrecorded.map((p) => {
                  const label = policyLabel(p);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-medium">{label.client}</td>
                      <td className="px-4 py-2 text-slate">{label.plan}</td>
                      <td colSpan={3} className="px-2 py-1.5">
                        <form
                          action={recordCommissionPaymentForm.bind(null, p.id)}
                          className="flex items-center justify-end gap-2"
                        >
                          <input
                            type="month"
                            name="period_month"
                            defaultValue={currentMonth.slice(0, 7)}
                            required
                            className={`${input} num`}
                          />
                          <input
                            type="number"
                            name="received_amount"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className={`${input} num w-28 text-right`}
                          />
                          <button className="rounded-md bg-sapphire px-3 py-1.5 text-xs font-semibold text-white hover:bg-sapphire/90">
                            Record
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          {discrepanciesOnly ? "Underpaid & missing" : "Recorded payments"}
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate">
              <tr>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2 text-right">Expected</th>
                <th className="px-4 py-2 text-right">Received</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((cp) => {
                const policy = cp.policies as unknown as Parameters<typeof policyLabel>[0] | null;
                const label = policy
                  ? policyLabel(policy)
                  : { client: "—", plan: "—", policyNumber: null };
                return (
                  <tr key={cp.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="num px-4 py-2">{String(cp.period_month).slice(0, 7)}</td>
                    <td className="px-4 py-2 font-medium">{label.client}</td>
                    <td className="px-4 py-2 text-slate">{label.plan}</td>
                    <td className="num px-4 py-2 text-right">
                      {cp.expected_amount != null ? `$${Number(cp.expected_amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="num px-4 py-2 text-right">
                      {cp.received_amount != null ? `$${Number(cp.received_amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-2">{STATUS_BADGE(cp.status)}</td>
                  </tr>
                );
              })}
              {(!payments || payments.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {discrepanciesOnly
                      ? "No discrepancies — everything reconciles."
                      : "No payments recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
