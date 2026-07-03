"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function setTaskStatus(taskId: string, status: "done" | "dismissed") {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("tasks").update({ status }).eq("id", taskId);
  await logAudit("update", "task", taskId, { status });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
