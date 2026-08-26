"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * Owner sets a staff member's password directly — no email round-trip,
 * effective immediately. The password itself is never logged anywhere.
 */
export async function setStaffPassword(userId: string, formData: FormData) {
  await requireRole(["owner"]);

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = (msg: string): never =>
    redirect(`/staff?pw=${userId}&error=${encodeURIComponent(msg)}`);

  if (password.length < 8) back("Password must be at least 8 characters");
  if (password !== confirm) back("Passwords don't match");

  // Confirm the target is actually a staff row before touching auth.
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("users")
    .select("id, email")
    .eq("id", userId)
    .single();
  if (!target) redirect("/staff?error=Staff+member+not+found");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) back(error.message);

  await logAudit("update", "staff_password", userId);
  revalidatePath("/staff");
  redirect("/staff?done=password");
}

/** Owner activates/deactivates a staff account (deactivating kills is_staff()). */
export async function setStaffActive(userId: string, active: boolean) {
  const caller = await requireRole(["owner"]);
  if (userId === caller.id) {
    redirect("/staff?error=You+can%27t+deactivate+your+own+account");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ active }).eq("id", userId);
  if (error) redirect(`/staff?error=${encodeURIComponent(error.message)}`);

  await logAudit("update", "staff_active", userId, { active });
  revalidatePath("/staff");
  redirect("/staff");
}
