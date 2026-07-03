import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { STATUS_BADGE } from "@/components/badges";
import { setTaskStatus } from "./actions";

export default async function TasksPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, detail, type, due_date, status, client_id, household_id, users(full_name)")
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">{t.tasks}</h1>

      <ul className="mt-6 space-y-2">
        {(tasks ?? []).map((task) => (
          <li
            key={task.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="text-sm">
              <p className="font-medium">
                {task.client_id ? (
                  <Link href={`/clients/${task.client_id}`} className="text-blue-700 hover:underline">
                    {task.title}
                  </Link>
                ) : task.household_id ? (
                  <Link href={`/households/${task.household_id}`} className="text-blue-700 hover:underline">
                    {task.title}
                  </Link>
                ) : (
                  task.title
                )}
              </p>
              {task.detail && <p className="mt-0.5 text-slate-600">{task.detail}</p>}
              <p className="mt-1 text-xs text-slate-400">
                {task.type.replace(/_/g, " ")}
                {task.due_date && ` · due ${task.due_date}`}
                {(task.users as unknown as { full_name: string } | null)?.full_name &&
                  ` · ${(task.users as unknown as { full_name: string }).full_name}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <form action={setTaskStatus.bind(null, task.id, "done")}>
                <button className="rounded-md border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                  Done
                </button>
              </form>
              <form action={setTaskStatus.bind(null, task.id, "dismissed")}>
                <button className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50">
                  Dismiss
                </button>
              </form>
            </div>
          </li>
        ))}
        {(!tasks || tasks.length === 0) && (
          <li className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No open tasks. {STATUS_BADGE("done")}
          </li>
        )}
      </ul>
    </div>
  );
}
