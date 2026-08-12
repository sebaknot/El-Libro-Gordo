/**
 * Stripe webhook — keeps the admin dashboard's billing status live.
 * Base44 path: functions/stripeWebhook.js  (backend function)
 *
 * This is what makes Section 5B's "active / past due / canceled" column real
 * instead of a manual Stripe lookup. Without it the dashboard still works — it
 * just shows the stored Stripe IDs so you can look a client up in one click.
 *
 * SECRETS:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET     whsec_… from the endpoint you create in Stripe
 *   BASE44_API_KEY            a service key that can update the Enrollment entity
 *   BASE44_APP_ID
 *
 * In Stripe → Developers → Webhooks, point an endpoint at this function and
 * subscribe to:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_failed
 */

/** Stripe subscription status → what the dashboard shows. */
const STATUS_MAP = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  paused: "canceled",
};

/**
 * ►► ADAPTER — the one part you may need to adjust.
 * Writes back to the Base44 `Enrollment` entity. Confirm the entity REST path
 * and auth header against your project's API docs; the rest of this file is
 * plain Stripe and needs no changes.
 */
async function updateEnrollment(enrollmentId, patch) {
  const appId = Deno.env.get("BASE44_APP_ID");
  const apiKey = Deno.env.get("BASE44_API_KEY");
  if (!appId || !apiKey) {
    console.error("Base44 credentials missing — skipping write", { enrollmentId, patch });
    return;
  }

  const res = await fetch(
    `https://app.base44.com/api/apps/${appId}/entities/Enrollment/${enrollmentId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", api_key: apiKey },
      body: JSON.stringify(patch),
    }
  );

  if (!res.ok) {
    console.error("Enrollment update failed", res.status, await res.text());
  }
}

async function findEnrollmentIdBySubscription(subscriptionId) {
  // subscription.* events do not carry our metadata unless it was set on the
  // subscription itself — createCheckoutSession.js does set it. Read it back.
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return null;
  const sub = await res.json();
  return sub?.metadata?.enrollment_id || null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const payload = await req.text();

  if (!signature || !webhookSecret) {
    return new Response("Webhook not configured", { status: 500 });
  }

  // Verify the signature before trusting anything in the body.
  let event;
  try {
    const { Stripe } = await import("https://esm.sh/stripe@17.5.0?target=deno");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: "2024-12-18.acacia" });
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const obj = event.data.object;

    if (event.type === "checkout.session.completed") {
      const enrollmentId = obj.client_reference_id || obj.metadata?.enrollment_id;
      if (enrollmentId) {
        await updateEnrollment(enrollmentId, {
          stripe_customer_id: obj.customer,
          stripe_subscription_id: obj.subscription,
          stripe_status: "active",
          status: "active",
          // amount_total is in cents.
          charged_monthly: obj.amount_total != null ? obj.amount_total / 100 : undefined,
        });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const enrollmentId =
        obj.metadata?.enrollment_id || (await findEnrollmentIdBySubscription(obj.id));
      if (enrollmentId) {
        await updateEnrollment(enrollmentId, {
          stripe_status: STATUS_MAP[obj.status] || "unknown",
          stripe_subscription_id: obj.id,
          stripe_customer_id: obj.customer,
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const subId = obj.subscription;
      const enrollmentId = subId ? await findEnrollmentIdBySubscription(subId) : null;
      if (enrollmentId) {
        await updateEnrollment(enrollmentId, { stripe_status: "past_due" });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Return 200 on a handling error so Stripe does not retry forever on a bug
    // that a retry cannot fix. The log is where you find it.
    console.error("Webhook handling error:", err);
    return new Response(JSON.stringify({ received: true, handled: false }), { status: 200 });
  }
});
