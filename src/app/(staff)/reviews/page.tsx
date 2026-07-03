import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("verification_responses")
      .select("id, submitted_at, confirmed_no_changes, changes, households(id, household_name)")
      .eq("reviewed", false)
      .order("submitted_at", { ascending: true }),
    supabase
      .from("verification_responses")
      .select("id, submitted_at, confirmed_no_changes, reviewed, households(household_name), users(full_name)")
      .eq("reviewed", true)
      .order("submitted_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">{t.reviews}</h1>

      <h2 className="mt-6 text-lg font-semibold">
        {t.needsReview} ({pending?.length ?? 0})
      </h2>
      <ul className="mt-3 space-y-2">
        {(pending ?? []).map((r) => {
          const household = r.households as unknown as { id: string; household_name: string } | null;
          const changeKeys = r.changes ? Object.keys(r.changes as Record<string, unknown>) : [];
          return (
            <li key={r.id}>
              <Link
                href={`/reviews/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-blue-300"
              >
                <span>
                  <span className="font-medium">{household?.household_name ?? "—"}</span>
                  <span className="ml-2 text-sm text-slate-500">
                    {r.confirmed_no_changes
                      ? "✅ confirmed — no changes"
                      : `✏️ changes: ${changeKeys.join(", ") || "—"}`}
                  </span>
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(r.submitted_at).toLocaleString()}
                </span>
              </Link>
            </li>
          );
        })}
        {(!pending || pending.length === 0) && (
          <li className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Queue is empty. 🎉
          </li>
        )}
      </ul>

      {(recent?.length ?? 0) > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold text-slate-500">Recently reviewed</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-500">
            {(recent ?? []).map((r) => (
              <li key={r.id} className="flex justify-between rounded-lg bg-white px-4 py-2">
                <span>
                  {(r.households as unknown as { household_name: string } | null)?.household_name} ·{" "}
                  {r.confirmed_no_changes ? "no changes" : "changes applied"}
                </span>
                <span className="text-xs">
                  by {(r.users as unknown as { full_name: string } | null)?.full_name ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
