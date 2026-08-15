"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { generateAutoTasks } from "@/lib/tasks/generate";

export async function setTaskStatus(taskId: string, status: "done" | "dismissed") {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", taskId);
  await logAudit("update", "task", taskId, { status });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

/** Owner-only manual run of the same sweep the daily cron performs. */
export async function runAutoTasksNow() {
  await requireRole(["owner"]);
  const supabase = await createClient();
  const summary = await generateAutoTasks(supabase);
  await logAudit("create", "auto_tasks_run", undefined, summary as unknown as Record<string, unknown>);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect(`/tasks?generated=${summary.total}`);
}
