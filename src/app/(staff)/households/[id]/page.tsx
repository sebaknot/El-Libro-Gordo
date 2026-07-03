import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { getDict } from "@/lib/i18n";
import { CLIENT_COLUMNS } from "@/lib/clients";
import { STATUS_BADGE } from "@/components/badges";

export default async function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", id)
    .single();
  if (!household) notFound();

  const { data: members } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .eq("household_id", id)
    .order("is_primary", { ascending: false })
    .order("dob");

  await logAudit("view", "household", id);

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">{household.household_name}</h1>
        <Link
          href={`/households/${id}/edit`}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Edit
        </Link>
      </div>

      <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-2">
        <p className="sm:col-span-2">
          <span className="text-slate-500">Address:</span>{" "}
          {[household.address_street, household.address_city, household.address_state, household.address_zip]
            .filter(Boolean)
            .join(", ") || "—"}
        </p>
        <p>
          <span className="text-slate-500">Annual income:</span>{" "}
          {household.annual_income != null ? `$${Number(household.annual_income).toLocaleString()}` : "—"}
          {household.income_verified_date && (
            <span className="ml-1 text-xs text-slate-400">(verified {household.income_verified_date})</span>
          )}
        </p>
        <p><span className="text-slate-500">Household size:</span> {household.household_size ?? "—"}</p>
        <p><span className="text-slate-500">Language:</span> {household.preferred_language}</p>
        <p><span className="text-slate-500">Channel:</span> {household.preferred_channel ?? "—"}</p>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.members}</h2>
          <Link
            href={`/clients/new?household=${id}`}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + {t.newClient}
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">DOB</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/clients/${m.id}`} className="font-medium text-blue-700 hover:underline">
                      {m.last_name}, {m.first_name}
                    </Link>
                    {m.is_primary && <span className="ml-2 text-xs text-slate-400">primary</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{m.dob ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{m.phone ?? "—"}</td>
                  <td className="px-4 py-2">{STATUS_BADGE(m.status)}</td>
                </tr>
              ))}
              {(!members || members.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No members</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
