import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";

export default async function HouseholdsPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: households } = await supabase
    .from("households")
    .select("id, household_name, address_city, address_state, household_size, annual_income, preferred_language, clients(id)")
    .order("household_name")
    .limit(200);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.households}</h1>
        <Link
          href="/households/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + {t.newHousehold}
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">{t.members}</th>
              <th className="px-4 py-3">Income</th>
              <th className="px-4 py-3">Lang</th>
            </tr>
          </thead>
          <tbody>
            {(households ?? []).map((h) => (
              <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/households/${h.id}`} className="font-medium text-blue-700 hover:underline">
                    {h.household_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[h.address_city, h.address_state].filter(Boolean).join(", ")}
                </td>
                <td className="px-4 py-3 text-slate-600">{(h.clients as unknown as { id: string }[])?.length ?? 0}</td>
                <td className="px-4 py-3 text-slate-600">
                  {h.annual_income != null ? `$${Number(h.annual_income).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{h.preferred_language}</td>
              </tr>
            ))}
            {(!households || households.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No households yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
