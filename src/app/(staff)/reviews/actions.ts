"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type Changes = {
  income?: { annual_income: number };
  employment?: string;
  address?: { street: string | null; city: string | null; state: string | null; zip: string | null };
  contact?: { phone: string | null; email: string | null };
  members_removed?: string[];
  members_added?: { first_name: string; last_name: string; dob: string | null }[];
};

/** Blueprint step 7: Approve → household/client records update, note auto-logged. */
export async function approveResponse(responseId: string) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: response } = await supabase
    .from("verification_responses")
    .select("id, household_id, confirmed_no_changes, changes, reviewed")
    .eq("id", responseId)
    .single();
  if (!response || response.reviewed) redirect("/reviews");

  const changes = (response.changes ?? {}) as Changes;
  const applied: string[] = [];

  if (!response.confirmed_no_changes) {
    // Household-level updates
    const householdUpdate: Record<string, unknown> = {};
    if (changes.income) {
      householdUpdate.annual_income = changes.income.annual_income;
      householdUpdate.income_verified_date = new Date().toISOString().slice(0, 10);
      applied.push(`income → $${changes.income.annual_income.toLocaleString()}`);
    }
    if (changes.address) {
      if (changes.address.street) householdUpdate.address_street = changes.address.street;
      if (changes.address.city) householdUpdate.address_city = changes.address.city;
      if (changes.address.state) householdUpdate.address_state = changes.address.state;
      if (changes.address.zip) householdUpdate.address_zip = changes.address.zip;
      applied.push("address updated");
    }
    if (Object.keys(householdUpdate).length > 0) {
      await supabase.from("households").update(householdUpdate).eq("id", response.household_id);
    }

    // Contact updates go to the primary client
    if (changes.contact?.phone || changes.contact?.email) {
      const { data: household } = await supabase
        .from("households")
        .select("primary_client_id")
        .eq("id", response.household_id)
        .single();
      if (household?.primary_client_id) {
        const contactUpdate: Record<string, unknown> = {};
        if (changes.contact.phone) contactUpdate.phone = changes.contact.phone;
        if (changes.contact.email) contactUpdate.email = changes.contact.email;
        await supabase.from("clients").update(contactUpdate).eq("id", household.primary_client_id);
        applied.push("contact updated");
      }
    }

    // New household members → pending client records
    for (const m of changes.members_added ?? []) {
      await supabase.from("clients").insert({
        household_id: response.household_id,
        first_name: m.first_name,
        last_name: m.last_name,
        dob: m.dob,
        status: "pending",
        is_primary: false,
        notes_summary: "Added via verification link — complete enrollment details",
      });
      applied.push(`added member ${m.first_name} ${m.last_name}`);
    }

    // Removed members are noted, not auto-canceled — staff confirms coverage impact first.
    if (changes.members_removed?.length) {
      applied.push(`reported no longer in household: ${changes.members_removed.join(", ")} (update statuses manually)`);
    }
    if (changes.employment) {
      applied.push(`employment: ${changes.employment}`);
    }
  }

  // Note auto-logged on the household
  await supabase.from("notes").insert({
    household_id: response.household_id,
    author_id: staff.id,
    body: response.confirmed_no_changes
      ? "Verification response reviewed: client confirmed no changes."
      : `Verification changes approved: ${applied.join("; ") || "reviewed"}.`,
  });

  // Mark reviewed (append-only trigger allows only these fields to change)
  await supabase
    .from("verification_responses")
    .update({ reviewed: true, reviewed_by: staff.id })
    .eq("id", responseId);

  // Close matching auto-generated review tasks
  await supabase
    .from("tasks")
    .update({ status: "done" })
    .eq("household_id", response.household_id)
    .eq("type", "verification_review")
    .eq("status", "open");

  await logAudit("update", "verification_response", responseId, {
    approved: true,
    applied,
  });

  revalidatePath("/reviews");
  revalidatePath(`/households/${response.household_id}`);
  redirect("/reviews");
}

/** Review without applying anything (e.g. client mis-reported; agent will call). */
export async function markReviewed(responseId: string) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: response } = await supabase
    .from("verification_responses")
    .select("id, household_id, reviewed")
    .eq("id", responseId)
    .single();
  if (!response || response.reviewed) redirect("/reviews");

  await supabase
    .from("verification_responses")
    .update({ reviewed: true, reviewed_by: staff.id })
    .eq("id", responseId);

  await supabase.from("notes").insert({
    household_id: response.household_id,
    author_id: staff.id,
    body: "Verification response marked reviewed without applying changes.",
  });

  await logAudit("update", "verification_response", responseId, { approved: false });
  revalidatePath("/reviews");
  redirect("/reviews");
}
