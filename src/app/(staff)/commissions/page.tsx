import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { STATUS_BADGE } from "@/components/badges";
import { recordCommissionPaymentForm } from "./actions";

const input =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sapphire focus:outline-none";

type PolicyRow = {
  id: string;
  household_id: string;
  carrier_id: string | null;
  plan_type: string;
  plan_year: number;
  households: unknown;
  carriers: unknown;
};

type UnrecordedGroup = {
  householdId: string;
  carrierId: string | null;
  householdName: string;
  carrierName: string | null;
  planType: string;
  planYear: number;
  members: number;
};

type RecordedGroup = {
  key: string;
  period: string;
  householdName: string;
  carrierName: string | null;
  planLabel: string;
  members: number;
  expected: number | null;
  received: number | null;
  status: "missing" | "underpaid" | "pending" | "paid";
};

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; filter?: string; campaign?: string }>;
}) {
  await requireStaff();
  const { error, filter, campaign: campaignParam } = await searchParams;
  const discrepanciesOnly = filter === "discrepancies";
  const supabase = await createClient();

  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  const [
    { data: payments },
    { data: activePolicies },
    { data: thisMonth },
    { data: rates },
    { data: campaigns },
  ] = await Promise.all([
      supabase
        .from("commission_payments")
        .select(
          "id, policy_id, period_month, expected_amount, received_amount, status, policies(id, household_id, carrier_id, plan_type, plan_year, households(household_name), carriers(name))"
        )
        .order("period_month", { ascending: false })
        .limit(1000),
      supabase
        .from("policies")
        .select(
          "id, household_id, carrier_id, plan_type, plan_year, households(household_name), carriers(name)"
        )
        .eq("status", "active")
        .limit(1000),
      supabase.from("commission_payments").select("policy_id").eq("period_month", currentMonth),
      supabase.from("commission_rates").select("carrier_id, plan_type, plan_year, rate_per_member_month"),
      supabase
        .from("enrollment_campaigns")
        .select("id, name, plan_year, starts_at, ends_at")
        .order("plan_year", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  const rateFor = new Map<string, number>();
  for (const r of rates ?? []) {
    rateFor.set(`${r.carrier_id}|${r.plan_type}|${r.plan_year}`, Number(r.rate_per_member_month));
  }
  const name = (p: { households: unknown; carriers: unknown }) => ({
    household:
      (p.households as { household_name: string } | null)?.household_name ?? "Unknown household",
    carrier: (p.carriers as { name: string } | null)?.name ?? null,
  });

  // ---- Season projection: pick a campaign (default: the one whose window
  // contains today, else the most recent) and project a full year of the
  // current book at the plan year's rates.
  const DAY = 24 * 60 * 60 * 1000;
  const todayMs = Date.now();
  const selectedCampaign =
    (campaignParam && (campaigns ?? []).find((c) => c.id === campaignParam)) ||
    (campaigns ?? []).find(
      (c) =>
        c.starts_at &&
        c.ends_at &&
        new Date(c.starts_at).getTime() <= todayMs &&
        todayMs <= new Date(c.ends_at).getTime()
    ) ||
    (campaigns ?? [])[0] ||
    null;

  let projection: {
    projectedAnnual: number;
    members: number;
    receivedSoFar: number;
    dayX: number | null;
    dayY: number | null;
    pace: "ahead" | "behind" | null;
  } | null = null;

  if (selectedCampaign) {
    const seasonPolicies = ((activePolicies ?? []) as PolicyRow[]).filter(
      (p) => p.plan_year === selectedCampaign.plan_year
    );
    let projectedAnnual = 0;
    for (const p of seasonPolicies) {
      const rate = p.carrier_id
        ? rateFor.get(`${p.carrier_id}|${p.plan_type}|${p.plan_year}`)
        : undefined;
      if (rate != null) projectedAnnual += rate * 12;
    }

    let receivedSoFar = 0;
    for (const cp of payments ?? []) {
      const policy = cp.policies as unknown as PolicyRow | null;
      if (policy?.plan_year === selectedCampaign.plan_year && cp.received_amount != null) {
        receivedSoFar += Number(cp.received_amount);
      }
    }

    let dayX: number | null = null;
    let dayY: number | null = null;
    let pace: "ahead" | "behind" | null = null;
    if (selectedCampaign.starts_at && selectedCampaign.ends_at) {
      const start = new Date(selectedCampaign.starts_at).getTime();
      const end = new Date(selectedCampaign.ends_at).getTime();
      const total = Math.max(1, Math.round((end - start) / DAY));
      const elapsed = Math.min(total, Math.max(0, Math.round((todayMs - start) / DAY)));
      dayX = elapsed;
      dayY = total;
      if (projectedAnnual > 0) {
        pace = receivedSoFar / projectedAnnual >= elapsed / total ? "ahead" : "behind";
      }
    }

    projection = {
      projectedAnnual,
      members: seasonPolicies.length,
      receivedSoFar,
      dayX,
      dayY,
      pace,
    };
  }

  // ---- "Not yet recorded": active policies with no row for the current month,
  // grouped by household + carrier + plan type + plan year.
  const recordedIds = new Set((thisMonth ?? []).map((p) => p.policy_id));
  const unrecordedGroups = new Map<string, UnrecordedGroup>();
  for (const p of (activePolicies ?? []) as PolicyRow[]) {
    if (recordedIds.has(p.id)) continue;
    const key = `${p.household_id}|${p.carrier_id}|${p.plan_type}|${p.plan_year}`;
    const existing = unrecordedGroups.get(key);
    if (existing) {
      existing.members++;
    } else {
      const n = name(p);
      unrecordedGroups.set(key, {
        householdId: p.household_id,
        carrierId: p.carrier_id,
        householdName: n.household,
        carrierName: n.carrier,
        planType: p.plan_type,
        planYear: p.plan_year,
        members: 1,
      });
    }
  }
  const unrecorded = [...unrecordedGroups.values()].sort((a, b) =>
    a.householdName.localeCompare(b.householdName)
  );

  // ---- Recorded payments, grouped by household + carrier + period month.
  const recordedGroups = new Map<
    string,
    RecordedGroup & { anyMissing: boolean; anyUnderpaid: boolean; anyPending: boolean }
  >();
  for (const cp of payments ?? []) {
    const policy = cp.policies as unknown as PolicyRow | null;
    if (!policy) continue;
    const period = String(cp.period_month);
    const key = `${policy.household_id}|${policy.carrier_id}|${period}`;
    let group = recordedGroups.get(key);
    if (!group) {
      const n = name(policy);
      group = {
        key,
        period,
        householdName: n.household,
        carrierName: n.carrier,
        planLabel: `${policy.plan_type} ${policy.plan_year}`,
        members: 0,
        expected: null,
        received: null,
        status: "paid",
        anyMissing: false,
        anyUnderpaid: false,
        anyPending: false,
      };
      recordedGroups.set(key, group);
    }
    group.members++;
    if (cp.expected_amount != null) {
      group.expected = (group.expected ?? 0) + Number(cp.expected_amount);
    }
    if (cp.received_amount != null) {
      group.received = (group.received ?? 0) + Number(cp.received_amount);
    }
    if (cp.status === "missing") group.anyMissing = true;
    if (cp.status === "underpaid") group.anyUnderpaid = true;
    if (cp.status === "pending") group.anyPending = true;
  }
  let recorded = [...recordedGroups.values()].map((g) => ({
    ...g,
    status: g.anyMissing
      ? ("missing" as const)
      : g.anyUnderpaid
        ? ("underpaid" as const)
        : g.anyPending
          ? ("pending" as const)
          : ("paid" as const),
  }));
  if (discrepanciesOnly) {
    recorded = recorded.filter((g) => g.status === "missing" || g.status === "underpaid");
  }
  recorded.sort(
    (a, b) => b.period.localeCompare(a.period) || a.householdName.localeCompare(b.householdName)
  );

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

      {selectedCampaign && projection && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Season projection</h2>
            <form method="GET" action="/commissions" className="flex items-center gap-2">
              {discrepanciesOnly && <input type="hidden" name="filter" value="discrepancies" />}
              <select
                name="campaign"
                defaultValue={selectedCampaign.id}
                aria-label="Campaign"
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sapphire focus:outline-none"
              >
                {(campaigns ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.plan_year})
                  </option>
                ))}
              </select>
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate hover:bg-slate-50">
                View
              </button>
            </form>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-sm text-slate">Projected annual commission</p>
              <p className="num mt-1 text-2xl font-bold">
                $
                {projection.projectedAnnual.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate">Active members enrolled</p>
              <p className="num mt-1 text-2xl font-bold">{projection.members}</p>
            </div>
            <div>
              <p className="text-sm text-slate">Received so far this season</p>
              <p className="num mt-1 text-2xl font-bold">
                $
                {projection.receivedSoFar.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate">Season</p>
              <p className="num mt-1 text-2xl font-bold">
                {projection.dayX != null ? `Day ${projection.dayX} of ${projection.dayY}` : "—"}
              </p>
            </div>
          </div>

          {projection.pace === "ahead" && (
            <p className="mt-3 rounded-md bg-sage/10 px-3 py-2 text-sm text-sage">
              Ahead of pace — collections are running ahead of the season calendar.
            </p>
          )}
          {projection.pace === "behind" && (
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate">
              Collections trail the calendar so far — normal early in a season, since
              carrier payments lag enrollment.
            </p>
          )}
        </section>
      )}

      {!discrepanciesOnly && unrecorded.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">
            Not yet recorded for {currentMonth.slice(0, 7)}
          </h2>
          <p className="mt-1 text-sm text-slate">
            One entry per household &amp; plan — the amount you enter is split evenly across
            the household&apos;s policies behind the scenes.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate">
                <tr>
                  <th className="px-4 py-2">Household</th>
                  <th className="px-4 py-2">Carrier · plan</th>
                  <th className="px-4 py-2 text-right">Members</th>
                  <th className="px-4 py-2 text-right">Expected</th>
                  <th className="px-4 py-2 text-right">Received $</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {unrecorded.map((g) => {
                  const rate = g.carrierId
                    ? rateFor.get(`${g.carrierId}|${g.planType}|${g.planYear}`)
                    : undefined;
                  const expected = rate != null ? rate * g.members : null;
                  return (
                    <tr
                      key={`${g.householdId}|${g.carrierId}|${g.planType}|${g.planYear}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-2 font-medium">{g.householdName}</td>
                      <td className="px-4 py-2 text-slate">
                        {[g.carrierName ?? "no carrier", g.planType, g.planYear].join(" · ")}
                      </td>
                      <td className="num px-4 py-2 text-right">{g.members}</td>
                      <td className="num px-4 py-2 text-right">
                        {expected != null ? `$${expected.toFixed(2)}` : "—"}
                      </td>
                      <td colSpan={2} className="px-2 py-1.5">
                        <form
                          action={recordCommissionPaymentForm.bind(
                            null,
                            g.householdId,
                            g.carrierId,
                            g.planType,
                            g.planYear
                          )}
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
                <th className="px-4 py-2">Household</th>
                <th className="px-4 py-2">Carrier · plan</th>
                <th className="px-4 py-2 text-right">Members</th>
                <th className="px-4 py-2 text-right">Expected</th>
                <th className="px-4 py-2 text-right">Received</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recorded.map((g) => (
                <tr key={g.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="num px-4 py-2">{g.period.slice(0, 7)}</td>
                  <td className="px-4 py-2 font-medium">{g.householdName}</td>
                  <td className="px-4 py-2 text-slate">
                    {[g.carrierName ?? "no carrier", g.planLabel].join(" · ")}
                  </td>
                  <td className="num px-4 py-2 text-right">{g.members}</td>
                  <td className="num px-4 py-2 text-right">
                    {g.expected != null ? `$${g.expected.toFixed(2)}` : "—"}
                  </td>
                  <td className="num px-4 py-2 text-right">
                    {g.received != null ? `$${g.received.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2">{STATUS_BADGE(g.status)}</td>
                </tr>
              ))}
              {recorded.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
