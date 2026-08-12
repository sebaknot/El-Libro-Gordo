/**
 * Stripe Checkout Session — PATH B.
 * Base44 path: functions/createCheckoutSession.js  (backend function)
 *
 * Only needed if you would rather keep one price per product than manage six
 * Payment Links. PATH A (the six-link map in planConfig.js) requires no backend
 * code and is the faster way to ship; this exists for the cleaner data model.
 *
 * The add-on is a SECOND LINE ITEM on one subscription, not a separate price.
 * Stripe sums the line items, so the amount charged is derived from the same
 * selection the client agreed to — there is no place for a hand-computed total
 * to disagree with the invoice.
 *
 * SECRETS — set these in your Base44 project settings, never in this file:
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_BASIC          price_… ($19.99/month recurring)
 *   STRIPE_PRICE_STANDARD       price_… ($34.99/month recurring)
 *   STRIPE_PRICE_BUSINESS       price_… ($59.99/month recurring)
 *   STRIPE_PRICE_HOUSEHOLD      price_… ($15.00/month recurring)
 *   PUBLIC_SITE_URL             https://tax1a-enrollment-plan.base44.app
 *
 * NOTE ON THE WRAPPER: Base44 backend functions run on Deno. If your project
 * uses a different export shape than `Deno.serve`, keep the body and swap the
 * wrapper — the logic does not change.
 */

const TIER_PRICE_ENV = {
  basic: "STRIPE_PRICE_BASIC",
  standard: "STRIPE_PRICE_STANDARD",
  business: "STRIPE_PRICE_BUSINESS",
};

/** Kept in sync with planConfig.js — used only to sanity-check the client. */
const TIER_AMOUNTS = { basic: 19.99, standard: 34.99, business: 59.99 };
const HOUSEHOLD_AMOUNT = 15.0;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { tierId, householdCoverage, email, enrollmentId, expectedTotal } = await req.json();

    const priceEnv = TIER_PRICE_ENV[tierId];
    if (!priceEnv) return json({ error: `Unknown tier "${tierId}"` }, 400);

    const tierPrice = Deno.env.get(priceEnv);
    const householdPrice = Deno.env.get("STRIPE_PRICE_HOUSEHOLD");
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL");

    if (!secret) return json({ error: "STRIPE_SECRET_KEY is not configured" }, 500);
    if (!tierPrice) return json({ error: `${priceEnv} is not configured` }, 500);
    if (householdCoverage && !householdPrice) {
      return json({ error: "STRIPE_PRICE_HOUSEHOLD is not configured" }, 500);
    }

    // Cross-check what the client believed it was agreeing to. A mismatch means
    // stale JS or a tampered payload — refuse rather than charge the wrong amount.
    const serverTotal =
      Math.round((TIER_AMOUNTS[tierId] + (householdCoverage ? HOUSEHOLD_AMOUNT : 0)) * 100) / 100;
    if (typeof expectedTotal === "number" && Math.abs(expectedTotal - serverTotal) > 0.001) {
      return json(
        { error: `Price mismatch: client expected ${expectedTotal}, server computed ${serverTotal}` },
        409
      );
    }

    // Stripe's API is form-encoded, including nested line_items.
    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", tierPrice);
    form.set("line_items[0][quantity]", "1");
    if (householdCoverage) {
      form.set("line_items[1][price]", householdPrice);
      form.set("line_items[1][quantity]", "1");
    }
    if (email) form.set("customer_email", email);
    form.set("success_url", `${siteUrl}/Confirmation?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${siteUrl}/`);
    form.set("client_reference_id", enrollmentId || "");
    // Metadata rides through to the webhook so the record can be matched back.
    form.set("metadata[enrollment_id]", enrollmentId || "");
    form.set("metadata[tier_id]", tierId);
    form.set("metadata[household_coverage]", householdCoverage ? "true" : "false");
    form.set("subscription_data[metadata][enrollment_id]", enrollmentId || "");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const session = await res.json();
    if (!res.ok) {
      console.error("Stripe error:", session);
      return json({ error: session.error?.message || "Stripe rejected the request" }, 502);
    }

    return json({ url: session.url, sessionId: session.id, total: serverTotal });
  } catch (err) {
    console.error(err);
    return json({ error: "Could not create a checkout session" }, 500);
  }
});
