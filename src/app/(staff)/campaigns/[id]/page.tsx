import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import {
  addHouseholdsToCampaign,
  assignPipelineHousehold,
  bulkGenerateLinksForCampaign,
  runPipelineAutomationNow,
  updatePipelineStage,
} from "../actions";

const STAGES = [
  "not_contacted",
  "contacted",
  "link_sent",
  "responded",
  "needs_changes",
  "completed",
  "unresponsive",
] as const;

const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  link_sent: "Link sent",
  responded: "Responded",
  needs_changes: "Needs changes",
  completed: "Completed",
  unresponsive: "Unresponsive",
};

export default async function CampaignBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; links?: string; automation?: string }>;
}) {
  const { id } = await params;
  const { error, links, automation } = await searchParams;
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("enrollment_campaigns")
    .select("id, name, plan_year, starts_at, ends_at")
    .eq("id", id)
    .single();
  if (!campaign) notFound();

  const [{ data: rows }, { data: allHouseholds }, { data: staffUsers }] = await Promise.all([
    supabase
      .from("renewal_pipeline")
      .select(
        "id, household_id, stage, priority, assigned_to, last_contact_at, auto_reminder_count, households(household_name), users(full_name)"
      )
      .eq("campaign_id", id)
      .order("priority", { ascending: false }),
    supabase.from("households").select("id, household_name").order("household_name"),
    supabase.from("users").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  const inPipeline = new Set((rows ?? []).map((r) => r.household_id));
  const addable = (allHouseholds ?? []).filter((h) => !inPipeline.has(h.id));

  const total = rows?.length ?? 0;
  const done = (rows ?? []).filter((r) => r.stage === "completed").length;

  const byStage = new Map<string, NonNullable<typeof rows>>();
  for (const s of STAGES) byStage.set(s, []);
  for (const r of rows ?? []) byStage.get(r.stage)?.push(r);

  const select =
    "w-full rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs focus:border-sapphire focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="mt-1 text-sm text-slate">
            Plan year <span className="num">{campaign.plan_year}</span> ·{" "}
            <span className="num font-semibold text-ink">
              {done} of {total}
            </span>{" "}
            done
            {" · "}
            <Link href="/campaigns" className="text-sapphire hover:underline">
              all campaigns
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {staff.role === "owner" && (
            <form action={runPipelineAutomationNow.bind(null, id)}>
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate hover:bg-slate-50">
                ⟳ Run automation now
              </button>
            </form>
          )}
          <form id="bulk-links" action={bulkGenerateLinksForCampaign.bind(null, id)}>
            <button className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90">
              Generate links for selected
            </button>
          </form>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}
      {links && (
        <p className="mt-4 rounded-md bg-sage/10 p-3 text-sm text-sage">
          ✓ {links} link{links === "1" ? "" : "s"} generated — the households moved to
          “Link sent”. Copy and send them from the Links page.
        </p>
      )}
      {automation && (
        <p className="mt-4 rounded-md bg-sapphire/5 p-3 text-sm text-sapphire">
          Automation complete: {automation}.
        </p>
      )}

      {addable.length > 0 && (
        <form
          action={addHouseholdsToCampaign.bind(null, id)}
          className="mt-6 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium text-slate">
              Add households (Ctrl/Cmd-click for several)
            </label>
            <select
              name="household_ids"
              multiple
              size={4}
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-sapphire focus:outline-none"
            >
              {addable.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.household_name}
                </option>
              ))}
            </select>
          </div>
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate hover:bg-slate-50">
            + Add to campaign
          </button>
        </form>
      )}

      <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = byStage.get(stage) ?? [];
          return (
            <section key={stage} className="w-60 shrink-0">
              <h2 className="flex items-baseline justify-between text-sm font-semibold">
                {STAGE_LABEL[stage]}
                <span className="num text-xs font-normal text-slate-400">{cards.length}</span>
              </h2>
              <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                {cards.map((r) => {
                  const household = r.households as unknown as { household_name: string } | null;
                  const assignee = r.users as unknown as { full_name: string } | null;
                  return (
                    <div
                      key={r.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={`/households/${r.household_id}`}
                          className="text-sm font-medium text-sapphire hover:underline"
                        >
                          {r.priority && (
                            <span title="Priority — policy terminating soon" aria-label="priority">
                              ⭐{" "}
                            </span>
                          )}
                          {household?.household_name ?? "—"}
                        </Link>
                        <input
                          type="checkbox"
                          name="household_ids"
                          value={r.household_id}
                          form="bulk-links"
                          aria-label={`Select ${household?.household_name ?? "household"}`}
                          className="mt-0.5"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {assignee ? assignee.full_name : "Unassigned"}
                        {r.auto_reminder_count > 0 && ` · ${r.auto_reminder_count} reminder(s)`}
                        {r.last_contact_at &&
                          ` · ${new Date(r.last_contact_at).toLocaleDateString()}`}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <select
                          name="stage"
                          defaultValue={r.stage}
                          form={`stage-${r.id}`}
                          aria-label="Stage"
                          className={select}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_LABEL[s]}
                            </option>
                          ))}
                        </select>
                        <form id={`stage-${r.id}`} action={updatePipelineStage.bind(null, r.id, id)}>
                          <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">
                            Set
                          </button>
                        </form>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <select
                          name="assigned_to"
                          defaultValue={r.assigned_to ?? ""}
                          form={`assign-${r.id}`}
                          aria-label="Assign to"
                          className={select}
                        >
                          <option value="">Unassigned</option>
                          {(staffUsers ?? []).map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name}
                            </option>
                          ))}
                        </select>
                        <form
                          id={`assign-${r.id}`}
                          action={assignPipelineHousehold.bind(null, r.id, id)}
                        >
                          <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">
                            OK
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">—</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
