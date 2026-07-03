import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getDict } from "@/lib/i18n";
import { CLIENT_COLUMNS } from "@/lib/clients";
import { STATUS_BADGE } from "@/components/badges";
import SsnReveal from "@/components/SsnReveal";
import { addNote, togglePinNote, uploadDocument } from "../actions";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireStaff();
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: client } = await supabase
    .from("clients")
    .select(`${CLIENT_COLUMNS}, households(id, household_name, address_street, address_city, address_state, address_zip, annual_income, preferred_language)`)
    .eq("id", id)
    .single();
  if (!client) notFound();

  const household = client.households as unknown as {
    id: string;
    household_name: string;
    address_street: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zip: string | null;
    annual_income: number | null;
    preferred_language: string;
  };

  const [{ data: policies }, { data: notes }, { data: documents }] = await Promise.all([
    supabase
      .from("policies")
      .select("id, plan_name, plan_type, plan_year, metal_tier, monthly_premium, subsidy_amount, net_premium, policy_number, status, carriers(name)")
      .eq("client_id", id)
      .order("plan_year", { ascending: false }),
    supabase
      .from("notes")
      .select("id, body, pinned, created_at, users(full_name)")
      .eq("client_id", id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, file_name, doc_type, size_bytes, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  await logAudit("view", "client", id);

  const canRevealSsn = staff.role === "owner" || staff.role === "agent";
  const addNoteAction = addNote.bind(null, id, household.id);
  const uploadAction = uploadDocument.bind(null, id, household.id);
  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {client.first_name} {client.last_name} {STATUS_BADGE(client.status)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={`/households/${household.id}`} className="text-blue-700 hover:underline">
              {household.household_name}
            </Link>
            {client.is_primary && " · primary"}
          </p>
        </div>
        <Link
          href={`/clients/${id}/edit`}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Edit
        </Link>
      </div>

      <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-2">
        <p><span className="text-slate-500">DOB:</span> {client.dob ?? "—"}</p>
        <p className="flex items-center gap-2">
          <span className="text-slate-500">SSN:</span>
          {client.ssn_last4 ? `···-··-${client.ssn_last4}` : "—"}
          {client.ssn_last4 && canRevealSsn && <SsnReveal clientId={id} />}
        </p>
        <p><span className="text-slate-500">Phone:</span> {client.phone ?? "—"}</p>
        <p><span className="text-slate-500">WhatsApp:</span> {client.whatsapp_phone ?? "—"}</p>
        <p><span className="text-slate-500">Email:</span> {client.email ?? "—"}</p>
        <p><span className="text-slate-500">Immigration doc:</span> {client.immigration_doc_type ?? "—"}</p>
        <p className="sm:col-span-2">
          <span className="text-slate-500">Address:</span>{" "}
          {[household.address_street, household.address_city, household.address_state, household.address_zip]
            .filter(Boolean)
            .join(", ") || "—"}
        </p>
        {client.notes_summary && (
          <p className="sm:col-span-2"><span className="text-slate-500">Summary:</span> {client.notes_summary}</p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t.policies}</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Year</th>
                <th className="px-4 py-2">Carrier</th>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Policy #</th>
                <th className="px-4 py-2">Premium</th>
                <th className="px-4 py-2">Subsidy</th>
                <th className="px-4 py-2">Net</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(policies ?? []).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">{p.plan_year}</td>
                  <td className="px-4 py-2">{(p.carriers as unknown as { name: string } | null)?.name ?? "—"}</td>
                  <td className="px-4 py-2">{p.plan_name ?? p.plan_type}</td>
                  <td className="px-4 py-2">{p.policy_number ?? "—"}</td>
                  <td className="px-4 py-2">{p.monthly_premium != null ? `$${p.monthly_premium}` : "—"}</td>
                  <td className="px-4 py-2">{p.subsidy_amount != null ? `$${p.subsidy_amount}` : "—"}</td>
                  <td className="px-4 py-2">{p.net_premium != null ? `$${p.net_premium}` : "—"}</td>
                  <td className="px-4 py-2">{STATUS_BADGE(p.status)}</td>
                </tr>
              ))}
              {(!policies || policies.length === 0) && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">No policies</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">{t.notes}</h2>
          <form action={addNoteAction} className="mt-3 flex gap-2">
            <input name="body" placeholder={t.addNote} required className={input} />
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              +
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {(notes ?? []).map((n) => (
              <li key={n.id} className={`rounded-lg border p-3 text-sm ${n.pinned ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
                <p>{n.body}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {(n.users as unknown as { full_name: string } | null)?.full_name ?? "—"} ·{" "}
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                  <form action={togglePinNote.bind(null, n.id, id, !n.pinned)}>
                    <button className="hover:text-amber-600">{n.pinned ? "unpin" : "pin"}</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{t.documents}</h2>
          <form action={uploadAction} className="mt-3 flex items-center gap-2">
            <input type="file" name="file" required className="text-sm" />
            <select name="doc_type" className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              {["id", "income_proof", "consent_form", "policy_doc", "other"].map((d) => (
                <option key={d} value={d}>{d.replace(/_/g, " ")}</option>
              ))}
            </select>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              {t.upload}
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {(documents ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <span>
                  <a href={`/api/documents/${d.id}/download`} className="font-medium text-blue-700 hover:underline">
                    {d.file_name}
                  </a>
                  <span className="ml-2 text-xs text-slate-400">
                    {d.doc_type.replace(/_/g, " ")} · {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : ""}
                  </span>
                </span>
                <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
