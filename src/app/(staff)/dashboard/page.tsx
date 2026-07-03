import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const [clients, households, policies, tasks, reviews, cleanup] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("households").select("id", { count: "exact", head: true }),
    supabase.from("policies").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("verification_responses")
      .select("id", { count: "exact", head: true })
      .eq("reviewed", false),
    supabase
      .from("tasks")
      .select("id, title, detail, client_id, household_id, due_date")
      .eq("status", "open")
      .eq("type", "data_cleanup")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: t.activeClients, value: clients.count ?? 0, href: "/clients" },
    { label: t.households, value: households.count ?? 0, href: "/households" },
    { label: t.activePolicies, value: policies.count ?? 0, href: "/clients" },
    { label: t.needsReview, value: reviews.count ?? 0, href: "/reviews" },
    { label: t.openTasks, value: tasks.count ?? 0, href: "/tasks" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">{t.dashboard}</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300"
          >
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-bold">{s.value}</p>
          </Link>
        ))}
      </div>

      {cleanup.data && cleanup.data.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">⚠️ {t.needsCleanup}</h2>
          <ul className="mt-3 space-y-2">
            {cleanup.data.map((task) => (
              <li
                key={task.id}
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
              >
                <Link
                  href={task.client_id ? `/clients/${task.client_id}` : "/tasks"}
                  className="font-medium hover:underline"
                >
                  {task.title}
                </Link>
                {task.detail && <p className="text-slate-600">{task.detail}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
