"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendViaProvider } from "@/lib/messaging/send";

export type Channel = "sms" | "whatsapp" | "email";

const CHANNELS: Channel[] = ["sms", "whatsapp", "email"];

export async function sendMessage(
  clientId: string,
  channel: Channel,
  body: string
): Promise<{ ok: true } | { error: string }> {
  const staff = await requireStaff();
  if (!CHANNELS.includes(channel)) return { error: "Unknown channel" };
  const text = body.trim();
  if (!text) return { error: "Message is empty" };

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, phone, whatsapp_phone, email")
    .eq("id", clientId)
    .single();
  if (!client) return { error: "Client not found" };

  const to =
    channel === "whatsapp"
      ? client.whatsapp_phone || client.phone
      : channel === "email"
        ? client.email
        : client.phone;
  if (!to) return { error: `No ${channel} contact on file for this client` };

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      client_id: clientId,
      channel,
      direction: "outbound",
      from_address: "pending-config",
      to_address: to,
      body: text,
      sent_by: staff.id,
      read: true,
    })
    .select("id, channel, to_address, body")
    .single();
  if (error || !message) return { error: error?.message ?? "Could not save message" };

  // Isolated provider step — a stub until Twilio approval lands.
  const result = await sendViaProvider({
    id: message.id,
    channel: message.channel as Channel,
    to_address: message.to_address,
    body: message.body,
  });
  if (result.ref) {
    await supabase.from("messages").update({ message_ref: result.ref }).eq("id", message.id);
  }

  await logAudit("create", "message", message.id, {
    client_id: clientId,
    channel,
    sent: result.sent,
  });
  revalidatePath("/messages");
  revalidatePath(`/messages/${clientId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function parseTemplate(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "");
  const language = String(formData.get("language") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!name || !body || !CHANNELS.includes(channel as Channel) || !["en", "es"].includes(language)) {
    return null;
  }
  return { name, channel, language, body };
}

export async function createTemplate(formData: FormData) {
  await requireStaff();
  const parsed = parseTemplate(formData);
  if (!parsed) {
    redirect("/messages/templates?error=Name%2C+channel%2C+language+and+body+are+required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert(parsed)
    .select("id")
    .single();
  if (error || !data) {
    redirect(`/messages/templates?error=${encodeURIComponent(error?.message ?? "insert failed")}`);
  }

  await logAudit("create", "message_template", data.id, { name: parsed.name });
  revalidatePath("/messages/templates");
  redirect("/messages/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  await requireStaff();
  const parsed = parseTemplate(formData);
  if (!parsed) {
    redirect("/messages/templates?error=Name%2C+channel%2C+language+and+body+are+required");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").update(parsed).eq("id", id);
  if (error) redirect(`/messages/templates?error=${encodeURIComponent(error.message)}`);

  await logAudit("update", "message_template", id);
  revalidatePath("/messages/templates");
  redirect("/messages/templates");
}

export async function deleteTemplate(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("message_templates").delete().eq("id", id);
  await logAudit("delete", "message_template", id);
  revalidatePath("/messages/templates");
}
