import "server-only";

export type OutboundMessage = {
  id: string;
  channel: "sms" | "whatsapp" | "email";
  to_address: string;
  body: string | null;
};

export type SendResult = { sent: boolean; reason?: string; ref?: string };

/**
 * TODO: once Twilio A2P 10DLC / WhatsApp approval completes, replace this
 * stub with real Twilio API calls using TWILIO_ACCOUNT_SID /
 * TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER env vars. Everything else in the
 * Communications Hub already treats sending as an isolated step: swap this
 * function's body, store the returned message SID in messages.message_ref,
 * and outbound delivery is live — no UI or action changes needed.
 */
export async function sendViaProvider(message: OutboundMessage): Promise<SendResult> {
  console.log(
    "[stub] Twilio not yet configured — message saved to database only:",
    message.id
  );
  return { sent: false, reason: "provider_not_configured" };
}
