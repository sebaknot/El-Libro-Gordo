"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function parseCarrier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return null;
  const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;
  return {
    name,
    agent_id_number: optional("agent_id_number"),
    portal_url: optional("portal_url"),
    support_phone: optional("support_phone"),
  };
}

export async function addCarrier(formData: FormData) {
  await requireRole(["owner", "agent"]);
  const parsed = parseCarrier(formData);
  if (!parsed) redirect("/carriers?error=Carrier+name+is+required");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carriers")
    .insert(parsed)
    .select("id")
    .single();
  if (error || !data) {
    redirect(`/carriers?error=${encodeURIComponent(error?.message ?? "insert failed")}`);
  }

  await logAudit("create", "carrier", data.id, { name: parsed.name });
  revalidatePath("/carriers");
  redirect("/carriers");
}

export async function updateCarrier(id: string, formData: FormData) {
  await requireRole(["owner", "agent"]);
  const parsed = parseCarrier(formData);
  if (!parsed) redirect("/carriers?error=Carrier+name+is+required");

  const supabase = await createClient();
  const { error } = await supabase.from("carriers").update(parsed).eq("id", id);
  if (error) redirect(`/carriers?error=${encodeURIComponent(error.message)}`);

  await logAudit("update", "carrier", id, { name: parsed.name });
  revalidatePath("/carriers");
  redirect("/carriers");
}
