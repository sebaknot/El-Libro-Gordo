import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { CLIENT_COLUMNS } from "@/lib/clients";
import ClientSearch from "@/components/ClientSearch";
import { STATUS_BADGE } from "@/components/badges";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: clients } = await supabase
    .from("clients")
    .select(`${CLIENT_COLUMNS}, households(household_name)`)
    .order("last_name")
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.clients}</h1>
        <Link
          href="/clients/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + {t.newClient}
        </Link>
      </div>

      <div className="mt-4">
        <ClientSearch placeholder={t.search} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">{t.households}</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="font-medium text-blue-700 hover:underline">
                    {c.last_name}, {c.first_name}
                  </Link>
                  {c.is_primary && <span className="ml-2 text-xs text-slate-400">primary</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {(c.households as unknown as { household_name: string } | null)?.household_name}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3">{STATUS_BADGE(c.status)}</td>
              </tr>
            ))}
            {(!clients || clients.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No clients yet. Import the book or add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
