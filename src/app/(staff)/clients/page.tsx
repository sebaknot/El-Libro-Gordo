import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import { getDict } from "@/lib/i18n";
import { CLIENT_COLUMNS } from "@/lib/clients";
import ClientSearch from "@/components/ClientSearch";
import { STATUS_BADGE } from "@/components/badges";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: clients } = await supabase
    .from("clients")
    .select(`${CLIENT_COLUMNS}, households!clients_household_id_fkey(household_name)`)
    .order("last_name")
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.clients}</h1>
        <Link
          href="/clients/new"
          className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
        >
          + {t.newClient}
        </Link>
      </div>

      <div className="mt-4">
        <ClientSearch placeholder={t.search} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">{t.households}</th>
              <th className="px-4 py-2.5">Phone</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/clients/${c.id}`} className="font-medium text-sapphire hover:underline">
                    {c.last_name}, {c.first_name}
                  </Link>
                  {c.is_primary && <span className="ml-2 text-xs text-slate-400">primary</span>}
                </td>
                <td className="px-4 py-2.5 text-slate">
                  {(c.households as unknown as { household_name: string } | null)?.household_name}
                </td>
                <td className="num px-4 py-2.5 text-slate">{c.phone}</td>
                <td className="px-4 py-2.5 text-slate">{c.email}</td>
                <td className="px-4 py-2.5">{STATUS_BADGE(c.status)}</td>
              </tr>
            ))}
            {(!clients || clients.length === 0) && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={Users}
                    message="No clients yet. Import the book or add one."
                    ctaHref="/clients/new"
                    ctaLabel={`+ ${t.newClient}`}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
