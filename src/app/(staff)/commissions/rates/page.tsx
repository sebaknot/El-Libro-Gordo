import Link from "next/link";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import SubmitButton from "@/components/SubmitButton";
import { requireStaff } from "@/lib/auth";
import { addCommissionRate } from "../actions";

const input =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

export default async function CommissionRatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: rates }, { data: carriers }] = await Promise.all([
    supabase
      .from("commission_rates")
      .select("id, plan_type, plan_year, rate_per_member_month, notes, carriers(name)")
      .order("plan_year", { ascending: false })
      .order("plan_type"),
    supabase.from("carriers").select("id, name").order("name"),
  ]);

  const byYear = new Map<number, NonNullable<typeof rates>>();
  for (const r of rates ?? []) {
    const list = byYear.get(r.plan_year) ?? [];
    list.push(r);
    byYear.set(r.plan_year, list);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Commission rates</h1>
        <Link href="/commissions" className="text-sm text-sapphire hover:underline">
          ← Reconciliation
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate">
        Rates are historical records — they are never edited. When a carrier changes
        a rate, add a new row for the new plan year.
      </p>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      {staff.role === "owner" && (
        <form
          action={addCommissionRate}
          className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-xs font-medium text-slate">Carrier</label>
            <select name="carrier_id" required className={input}>
              {(carriers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate">Plan type</label>
            <select name="plan_type" className={input}>
              {["marketplace", "medicare", "dental", "vision", "life", "other"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate">Plan year</label>
            <input
              name="plan_year"
              type="number"
              required
              defaultValue={currentYear + 1}
              className={`${input} num w-24`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate">$ / member / month</label>
            <input
              name="rate_per_member_month"
              type="number"
              step="0.01"
              min="0"
              required
              className={`${input} num w-32`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium text-slate">Notes</label>
            <input name="notes" className={`${input} w-full`} />
          </div>
          <SubmitButton className="px-5 py-2 text-sm">+ Add rate</SubmitButton>
        </form>
      )}

      {years.map((year) => (
        <section key={year} className="mt-8">
          <h2 className="text-lg font-semibold">{year}</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-4 py-2.5">Carrier</th>
                  <th className="px-4 py-2.5">Plan type</th>
                  <th className="px-4 py-2.5 text-right">$ / member / month</th>
                  <th className="px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {byYear.get(year)!.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      {(r.carriers as unknown as { name: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">{r.plan_type}</td>
                    <td className="num px-4 py-2.5 text-right">
                      ${Number(r.rate_per_member_month).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-slate">{r.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {years.length === 0 && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={DollarSign}
            message={`No rates yet.${staff.role === "owner" ? " Add the first one above." : ""}`}
          />
        </div>
      )}
    </div>
  );
}
