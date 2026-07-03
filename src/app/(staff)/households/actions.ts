"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { householdSchema, field } from "@/lib/clients";

function parseHouseholdForm(formData: FormData) {
  return householdSchema.safeParse({
    household_name: field(formData, "household_name"),
    address_street: field(formData, "address_street"),
    address_city: field(formData, "address_city"),
    address_state: field(formData, "address_state"),
    address_zip: field(formData, "address_zip"),
    annual_income: field(formData, "annual_income"),
    income_verified_date: field(formData, "income_verified_date"),
    household_size: field(formData, "household_size"),
    preferred_language: field(formData, "preferred_language") || "es",
    preferred_channel: field(formData, "preferred_channel"),
  });
}

export async function createHousehold(formData: FormData) {
  await requireStaff();
  const parsed = parseHouseholdForm(formData);
  if (!parsed.success) redirect(`/households/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("households")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !data) redirect(`/households/new?error=${encodeURIComponent(error?.message ?? "insert failed")}`);

  await logAudit("create", "household", data.id);
  revalidatePath("/households");
  redirect(`/households/${data.id}`);
}

export async function updateHousehold(id: string, formData: FormData) {
  await requireStaff();
  const parsed = parseHouseholdForm(formData);
  if (!parsed.success) redirect(`/households/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const supabase = await createClient();
  const { error } = await supabase.from("households").update(parsed.data).eq("id", id);
  if (error) redirect(`/households/${id}/edit?error=${encodeURIComponent(error.message)}`);

  await logAudit("update", "household", id);
  revalidatePath(`/households/${id}`);
  revalidatePath("/households");
  redirect(`/households/${id}`);
}
