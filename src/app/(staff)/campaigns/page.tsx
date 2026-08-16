import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createCampaign } from "./actions";

const input =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const { error } = await searchParams;
  const supabase = await createClient();
  const { t } = await getDict();

  const [{ data: campaigns }, { data: pipeline }] = await Promise.all([
    supabase
      .from("enrollment_campaigns")
      .select("id, name, plan_year, starts_at, ends_at")
      .order("plan_year", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("renewal_pipeline").select("campaign_id, stage"),
  ]);

  const progress = new Map<string, { total: number; done: number }>();
  for (const row of pipeline ?? []) {
    const p = progress.get(row.campaign_id) ?? { total: 0, done: 0 };
    p.total++;
    if (row.stage === "completed") p.done++;
    progress.set(row.campaign_id, p);
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{t.campaigns}</h1>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      <form
        action={createCampaign}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-medium text-slate">Name</label>
          <input name="name" required placeholder={`AEP ${currentYear + 1}`} className={`${input} w-full`} />
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
          <label className="block text-xs font-medium text-slate">Starts</label>
          <input name="starts_at" type="date" className={`${input} num`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate">Ends</label>
          <input name="ends_at" type="date" className={`${input} num`} />
        </div>
        <button className="rounded-md bg-sapphire px-5 py-2 text-sm font-semibold text-white hover:bg-sapphire/90">
          + New campaign
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {(campaigns ?? []).map((c) => {
          const p = progress.get(c.id) ?? { total: 0, done: 0 };
          return (
            <li key={c.id}>
              <Link
                href={`/campaigns/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:border-sapphire/40"
              >
                <span>
                  <span className="block font-semibold">{c.name}</span>
                  <span className="mt-0.5 block text-xs text-slate">
                    Plan year <span className="num">{c.plan_year}</span>
                    {c.starts_at && ` · ${new Date(c.starts_at).toLocaleDateString()}`}
                    {c.ends_at && ` → ${new Date(c.ends_at).toLocaleDateString()}`}
                  </span>
                </span>
                <span className="num text-sm text-slate">
                  {p.done} / {p.total} done
                </span>
              </Link>
            </li>
          );
        })}
        {(!campaigns || campaigns.length === 0) && (
          <li className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No campaigns yet — create one above to open the war room.
          </li>
        )}
      </ul>
    </div>
  );
}
