import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import EmptyState from "@/components/EmptyState";
import SubmitButton from "@/components/SubmitButton";
import { getDict } from "@/lib/i18n";
import { addCarrier, updateCarrier } from "./actions";

const input =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const staff = await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: carriers } = await supabase
    .from("carriers")
    .select("id, name, agent_id_number, portal_url, support_phone")
    .order("name");

  const canEdit = staff.role === "owner" || staff.role === "agent";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{t.carriers}</h1>
      <p className="mt-1 text-sm text-slate">
        The carriers you work with — referenced by policies, commission rates, and the
        book export.
      </p>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      {canEdit && (
        <form
          action={addCarrier}
          className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-base font-semibold">New carrier</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate">Name *</label>
              <input name="name" required placeholder="Florida Blue" className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate">Agent ID #</label>
              <input name="agent_id_number" className={`${input} num`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate">Portal URL</label>
              <input name="portal_url" type="url" placeholder="https://…" className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate">Support phone</label>
              <input name="support_phone" className={`${input} num`} />
            </div>
          </div>
          <SubmitButton className="mt-3 px-5 py-2 text-sm">+ Add carrier</SubmitButton>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Agent ID #</th>
              <th className="px-4 py-2.5">Portal</th>
              <th className="px-4 py-2.5">Support phone</th>
              {canEdit && <th className="px-4 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {(carriers ?? []).map((c) =>
              canEdit ? (
                // Carriers stay editable (unlike commission rates): fixing a
                // typo or a portal link is not a historical-accuracy concern.
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-1.5">
                    <input name="name" required defaultValue={c.name} form={`carrier-${c.id}`} className={input} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      name="agent_id_number"
                      defaultValue={c.agent_id_number ?? ""}
                      form={`carrier-${c.id}`}
                      className={`${input} num`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      name="portal_url"
                      type="url"
                      defaultValue={c.portal_url ?? ""}
                      form={`carrier-${c.id}`}
                      className={input}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      name="support_phone"
                      defaultValue={c.support_phone ?? ""}
                      form={`carrier-${c.id}`}
                      className={`${input} num`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <form id={`carrier-${c.id}`} action={updateCarrier.bind(null, c.id)}>
                      <SubmitButton variant="secondary" className="px-3 py-1.5 text-xs">
                        {t.save}
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium">{c.name}</td>
                  <td className="num px-4 py-2.5 text-slate">{c.agent_id_number ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.portal_url ? (
                      <a
                        href={c.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sapphire hover:underline"
                      >
                        {c.portal_url.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num px-4 py-2.5 text-slate">{c.support_phone ?? "—"}</td>
                </tr>
              )
            )}
            {(!carriers || carriers.length === 0) && (
              <tr>
                <td colSpan={canEdit ? 5 : 4}>
                  <EmptyState
                    icon={Building2}
                    message="No carriers yet. Add the ones you work with above."
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
