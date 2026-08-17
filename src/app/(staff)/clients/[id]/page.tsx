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
import { addPolicy, updatePolicyStatus } from "../policy-actions";

const POLICY_STATUSES = ["active", "pending", "terminated", "delinquent"] as const;

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editPolicy?: string; error?: string }>;
}) {
  const { id } = await params;
  const { editPolicy, error } = await searchParams;
  const staff = await requireStaff();
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: client } = await supabase
    .from("clients")
    .select(`${CLIENT_COLUMNS}, households!clients_household_id_fkey(id, household_name, address_street, address_city, address_state, address_zip, annual_income, preferred_language)`)
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

  const [{ data: policies }, { data: notes }, { data: documents }, { data: carriers }] = await Promise.all([
    supabase
      .from("policies")
      .select("id, plan_name, plan_type, plan_year, metal_tier, monthly_premium, subsidy_amount, net_premium, policy_number, status, termination_date, carriers(name)")
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
    supabase.from("carriers").select("id, name").order("name"),
  ]);

  await logAudit("view", "client", id);

  const canRevealSsn = staff.role === "owner" || staff.role === "agent";
  const canManagePolicies = staff.role === "owner" || staff.role === "agent";
  const addNoteAction = addNote.bind(null, id, household.id);
  const uploadAction = uploadDocument.bind(null, id, household.id);
  const input =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {client.first_name} {client.last_name} {STATUS_BADGE(client.status)}
          </h1>
          <p className="mt-1 text-sm text-slate">
            <Link href={`/households/${household.id}`} className="text-sapphire hover:underline">
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

      <div className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-6 text-sm shadow-sm sm:grid-cols-2">
        <p><span className="text-slate">DOB:</span> {client.dob ?? "—"}</p>
        <p className="flex items-center gap-2">
          <span className="text-slate">SSN:</span>
          <span className="num">{client.ssn_last4 ? `···-··-${client.ssn_last4}` : "—"}</span>
          {client.ssn_last4 && canRevealSsn && <SsnReveal clientId={id} />}
        </p>
        <p><span className="text-slate">Phone:</span> <span className="num">{client.phone ?? "—"}</span></p>
        <p><span className="text-slate">WhatsApp:</span> <span className="num">{client.whatsapp_phone ?? "—"}</span></p>
        <p><span className="text-slate">Email:</span> {client.email ?? "—"}</p>
        <p><span className="text-slate">Immigration doc:</span> {client.immigration_doc_type ?? "—"}</p>
        <p className="sm:col-span-2">
          <span className="text-slate">Address:</span>{" "}
          {[household.address_street, household.address_city, household.address_state, household.address_zip]
            .filter(Boolean)
            .join(", ") || "—"}
        </p>
        {client.notes_summary && (
          <p className="sm:col-span-2"><span className="text-slate">Summary:</span> {client.notes_summary}</p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{t.policies}</h2>

        {error && <p className="mt-3 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-4 py-2.5">Year</th>
                <th className="px-4 py-2.5">Carrier</th>
                <th className="px-4 py-2.5">Plan</th>
                <th className="px-4 py-2.5">Policy #</th>
                <th className="px-4 py-2.5 text-right">Premium</th>
                <th className="px-4 py-2.5 text-right">Subsidy</th>
                <th className="px-4 py-2.5 text-right">Net</th>
                <th className="px-4 py-2.5">Status</th>
                {canManagePolicies && <th className="px-4 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {(policies ?? []).map((p) =>
                canManagePolicies && editPolicy === p.id ? (
                  <tr key={p.id} className="border-b border-slate-100 bg-sapphire/5 last:border-0">
                    <td className="px-4 py-2.5">{p.plan_year}</td>
                    <td className="px-4 py-2.5">{(p.carriers as unknown as { name: string } | null)?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">{p.plan_name ?? p.plan_type}</td>
                    <td className="num px-4 py-2.5">{p.policy_number ?? "—"}</td>
                    <td colSpan={3} className="px-2 py-1.5">
                      <label className="flex items-center justify-end gap-1 text-xs text-slate">
                        terminated on
                        <input
                          type="date"
                          name="termination_date"
                          defaultValue={p.termination_date ?? ""}
                          form={`policy-${p.id}`}
                          className="num rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sapphire focus:outline-none"
                        />
                      </label>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        name="status"
                        defaultValue={p.status}
                        form={`policy-${p.id}`}
                        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sapphire focus:outline-none"
                      >
                        {POLICY_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <form id={`policy-${p.id}`} action={updatePolicyStatus.bind(null, p.id, id)}>
                          <button className="rounded-md bg-sapphire px-3 py-1.5 text-xs font-semibold text-white hover:bg-sapphire/90">
                            Save
                          </button>
                        </form>
                        <Link href={`/clients/${id}`} className="text-xs text-slate hover:underline">
                          Cancel
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">{p.plan_year}</td>
                    <td className="px-4 py-2.5">{(p.carriers as unknown as { name: string } | null)?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">{p.plan_name ?? p.plan_type}</td>
                    <td className="num px-4 py-2.5">{p.policy_number ?? "—"}</td>
                    <td className="num px-4 py-2.5 text-right">{p.monthly_premium != null ? `$${p.monthly_premium}` : "—"}</td>
                    <td className="num px-4 py-2.5 text-right">{p.subsidy_amount != null ? `$${p.subsidy_amount}` : "—"}</td>
                    <td className="num px-4 py-2.5 text-right">{p.net_premium != null ? `$${p.net_premium}` : "—"}</td>
                    <td className="px-4 py-2.5">
                      {STATUS_BADGE(p.status)}
                      {p.termination_date && (
                        <span className="num ml-1 text-xs text-slate-400">{p.termination_date}</span>
                      )}
                    </td>
                    {canManagePolicies && (
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/clients/${id}?editPolicy=${p.id}`}
                          className="text-xs font-medium text-sapphire hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    )}
                  </tr>
                )
              )}
              {(!policies || policies.length === 0) && (
                <tr><td colSpan={canManagePolicies ? 9 : 8} className="px-4 py-6 text-center text-slate-400">No policies</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {canManagePolicies && (
          <form
            action={addPolicy.bind(null, id, household.id)}
            className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-sm font-semibold">+ Add policy</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate">Carrier</label>
                <select name="carrier_id" className={input}>
                  <option value="">—</option>
                  {(carriers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Plan name</label>
                <input name="plan_name" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Plan type</label>
                <select name="plan_type" defaultValue="marketplace" className={input}>
                  {["marketplace", "medicare", "dental", "vision", "life", "other"].map((pt) => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Plan year</label>
                <input
                  name="plan_year"
                  type="number"
                  required
                  defaultValue={new Date().getFullYear()}
                  className={`${input} num`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Metal tier</label>
                <input name="metal_tier" placeholder="Bronze / Silver / Gold" className={input} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Status</label>
                <select name="status" defaultValue="active" className={input}>
                  {POLICY_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Monthly premium $</label>
                <input name="monthly_premium" type="number" step="0.01" min="0" className={`${input} num`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Subsidy $</label>
                <input name="subsidy_amount" type="number" step="0.01" min="0" className={`${input} num`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Policy #</label>
                <input name="policy_number" className={`${input} num`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Effective date</label>
                <input name="effective_date" type="date" className={`${input} num`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate">Termination date</label>
                <input name="termination_date" type="date" className={`${input} num`} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400">
                Net premium is calculated automatically (premium − subsidy).
              </p>
              <button className="rounded-md bg-sapphire px-5 py-2 text-sm font-semibold text-white hover:bg-sapphire/90">
                + Add policy
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">{t.notes}</h2>
          <form action={addNoteAction} className="mt-3 flex gap-2">
            <input name="body" placeholder={t.addNote} required className={input} />
            <button className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90">
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
            <button className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90">
              {t.upload}
            </button>
          </form>
          <ul className="mt-3 space-y-2">
            {(documents ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <span>
                  <a href={`/api/documents/${d.id}/download`} className="font-medium text-sapphire hover:underline">
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
