"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientSchema, field } from "@/lib/clients";

function parseClientForm(formData: FormData) {
  return clientSchema.safeParse({
    household_id: field(formData, "household_id"),
    first_name: field(formData, "first_name"),
    last_name: field(formData, "last_name"),
    dob: field(formData, "dob"),
    phone: field(formData, "phone"),
    whatsapp_phone: field(formData, "whatsapp_phone"),
    email: field(formData, "email"),
    status: field(formData, "status"),
    is_primary: formData.get("is_primary") === "on",
    immigration_doc_type: field(formData, "immigration_doc_type"),
    notes_summary: field(formData, "notes_summary"),
  });
}

export async function createClientRecord(formData: FormData) {
  await requireStaff();
  const parsed = parseClientForm(formData);
  if (!parsed.success) redirect(`/clients/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error || !data) redirect(`/clients/new?error=${encodeURIComponent(error?.message ?? "insert failed")}`);

  const ssn = field(formData, "ssn").replace(/\D/g, "");
  if (ssn.length === 9) {
    await supabase.rpc("set_client_ssn", {
      p_client_id: data.id,
      p_ssn: ssn,
      p_key: process.env.SSN_ENCRYPTION_KEY!,
    });
  }

  await logAudit("create", "client", data.id);
  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClientRecord(id: string, formData: FormData) {
  await requireStaff();
  const parsed = parseClientForm(formData);
  if (!parsed.success) redirect(`/clients/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(parsed.data).eq("id", id);
  if (error) redirect(`/clients/${id}/edit?error=${encodeURIComponent(error.message)}`);

  const ssn = field(formData, "ssn").replace(/\D/g, "");
  if (ssn.length === 9) {
    await supabase.rpc("set_client_ssn", {
      p_client_id: id,
      p_ssn: ssn,
      p_key: process.env.SSN_ENCRYPTION_KEY!,
    });
  }

  await logAudit("update", "client", id);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

/** Dedicated, audited SSN decryption (owner/agent only; DB re-checks the role). */
export async function revealSsn(clientId: string): Promise<string | null> {
  await requireRole(["owner", "agent"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reveal_client_ssn", {
    p_client_id: clientId,
    p_key: process.env.SSN_ENCRYPTION_KEY!,
  });
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function addNote(clientId: string, householdId: string, formData: FormData) {
  const staff = await requireStaff();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .insert({ client_id: clientId, household_id: householdId, author_id: staff.id, body })
    .select("id")
    .single();
  await logAudit("create", "note", data?.id, { client_id: clientId });
  revalidatePath(`/clients/${clientId}`);
}

export async function togglePinNote(noteId: string, clientId: string, pinned: boolean) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("notes").update({ pinned }).eq("id", noteId);
  revalidatePath(`/clients/${clientId}`);
}

export async function uploadDocument(clientId: string, householdId: string, formData: FormData) {
  const staff = await requireStaff();
  const file = formData.get("file") as File | null;
  const docType = String(formData.get("doc_type") ?? "other");
  if (!file || file.size === 0) return;
  if (file.size > 20 * 1024 * 1024) return; // 20 MB cap

  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${householdId}/${clientId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) return;

  const { data } = await supabase
    .from("documents")
    .insert({
      client_id: clientId,
      household_id: householdId,
      storage_path: path,
      doc_type: docType,
      uploaded_by: staff.id,
      file_name: file.name,
      size_bytes: file.size,
    })
    .select("id")
    .single();

  await logAudit("create", "document", data?.id, { client_id: clientId, file_name: file.name });
  revalidatePath(`/clients/${clientId}`);
}
