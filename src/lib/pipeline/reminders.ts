import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendViaProvider } from "@/lib/messaging/send";

export type PipelineAutomationSummary = {
  first_reminders: number;
  second_reminders: number;
  marked_unresponsive: number;
  prioritized: number;
};

const DAY = 24 * 60 * 60 * 1000;

const REMINDER_TEXT = {
  es: (first: string, url: string | null) =>
    `Hola${first ? ` ${first}` : ""}, un recordatorio de su agente de seguros: aún necesitamos que confirme su información para renovar su cobertura de salud.${url ? ` Solo toma 1 minuto: ${url}` : " Por favor responda a este mensaje."} ¡Gracias!`,
  en: (first: string, url: string | null) =>
    `Hi${first ? ` ${first}` : ""}, a reminder from your insurance agent: we still need you to confirm your information to renew your health coverage.${url ? ` It only takes 1 minute: ${url}` : " Please reply to this message."} Thank you!`,
};

/**
 * Daily pipeline sweep for rows in 'contacted' or 'link_sent':
 *   4+ days since last contact, no reminders yet  → first reminder
 *   8+ days, one reminder                          → second reminder
 *   12+ days                                       → stage 'unresponsive'
 * Reminders go to the household's primary client (any member as fallback)
 * through the same messages + sendViaProvider() path as manual sends, with
 * sent_by = null (messages.sent_by is nullable; these are system sends).
 * Also flags priority on rows whose household has a policy terminating
 * within 30 days. Reminder sends do NOT touch last_contact_at — the 4/8/12
 * day ladder is measured from the last human contact.
 */
export async function runPipelineAutomation(
  supabase: SupabaseClient,
  baseUrl: string | null
): Promise<PipelineAutomationSummary> {
  const now = Date.now();
  const summary: PipelineAutomationSummary = {
    first_reminders: 0,
    second_reminders: 0,
    marked_unresponsive: 0,
    prioritized: 0,
  };

  const { data: rows } = await supabase
    .from("renewal_pipeline")
    .select(
      "id, household_id, stage, last_contact_at, auto_reminder_count, households(household_name, preferred_language, preferred_channel)"
    )
    .in("stage", ["contacted", "link_sent"]);

  const actionable = (rows ?? []).filter((r) => r.last_contact_at != null);
  const householdIds = [...new Set(actionable.map((r) => r.household_id))];

  // Primary (or any) client per household, plus each household's newest
  // active renewal link so the reminder can include the URL.
  const [{ data: clients }, { data: links }] = householdIds.length
    ? await Promise.all([
        supabase
          .from("clients")
          .select("id, household_id, first_name, phone, whatsapp_phone, is_primary")
          .in("household_id", householdIds),
        supabase
          .from("verification_links")
          .select("household_id, token, created_at")
          .in("household_id", householdIds)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const clientFor = new Map<string, NonNullable<typeof clients>[number]>();
  for (const c of clients ?? []) {
    const current = clientFor.get(c.household_id);
    if (!current || (c.is_primary && !current.is_primary)) clientFor.set(c.household_id, c);
  }
  const linkFor = new Map<string, string>();
  for (const l of links ?? []) {
    if (!linkFor.has(l.household_id)) linkFor.set(l.household_id, l.token);
  }

  async function sendReminder(row: (typeof actionable)[number]): Promise<boolean> {
    const household = row.households as unknown as {
      household_name: string;
      preferred_language: string;
      preferred_channel: string | null;
    };
    const recipient = clientFor.get(row.household_id);
    if (!recipient) return false;

    const channel =
      household.preferred_channel === "whatsapp" && (recipient.whatsapp_phone || recipient.phone)
        ? "whatsapp"
        : "sms";
    const to = channel === "whatsapp" ? recipient.whatsapp_phone || recipient.phone : recipient.phone;
    if (!to) return false;

    const token = linkFor.get(row.household_id);
    const url = token && baseUrl ? `${baseUrl}/v/${token}` : null;
    const lang = household.preferred_language === "en" ? "en" : "es";
    const body = REMINDER_TEXT[lang](recipient.first_name, url);

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        client_id: recipient.id,
        channel,
        direction: "outbound",
        from_address: "pending-config",
        to_address: to,
        body,
        sent_by: null, // system-generated
        read: true,
      })
      .select("id, channel, to_address, body")
      .single();
    if (error || !message) return false;

    await sendViaProvider({
      id: message.id,
      channel: message.channel as "sms" | "whatsapp" | "email",
      to_address: message.to_address,
      body: message.body,
    });
    return true;
  }

  for (const row of actionable) {
    const age = now - new Date(row.last_contact_at as string).getTime();

    if (age >= 12 * DAY) {
      await supabase
        .from("renewal_pipeline")
        .update({ stage: "unresponsive" })
        .eq("id", row.id);
      summary.marked_unresponsive++;
      continue;
    }
    if (age >= 8 * DAY && row.auto_reminder_count === 1) {
      if (await sendReminder(row)) {
        await supabase
          .from("renewal_pipeline")
          .update({ auto_reminder_count: 2 })
          .eq("id", row.id);
        summary.second_reminders++;
      }
      continue;
    }
    if (age >= 4 * DAY && row.auto_reminder_count === 0) {
      if (await sendReminder(row)) {
        await supabase
          .from("renewal_pipeline")
          .update({ auto_reminder_count: 1 })
          .eq("id", row.id);
        summary.first_reminders++;
      }
    }
  }

  // Priority flag: household has a policy terminating within 30 days.
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(now + 30 * DAY).toISOString().slice(0, 10);
  const { data: terminating } = await supabase
    .from("policies")
    .select("household_id")
    .gte("termination_date", today)
    .lte("termination_date", in30);
  const terminatingHouseholds = [...new Set((terminating ?? []).map((p) => p.household_id))];
  if (terminatingHouseholds.length > 0) {
    const { data: updated } = await supabase
      .from("renewal_pipeline")
      .update({ priority: true })
      .in("household_id", terminatingHouseholds)
      .eq("priority", false)
      .select("id");
    summary.prioritized = updated?.length ?? 0;
  }

  return summary;
}
