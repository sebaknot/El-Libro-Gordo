/**
 * Taxonomy enrollment — plan configuration.
 * Base44 path: components/config/planConfig.js
 * Import as:   import { TIERS, HOUSEHOLD_ADDON, ... } from "@/components/config/planConfig";
 *
 * Single source of truth for what a client is charged. Every screen — tier
 * selection, agreement, Stripe handoff, confirmation, admin — reads its numbers
 * from here so the displayed total and the charged total cannot drift apart.
 *
 * The three base tier prices are fixed. Do not change them.
 */

/* ---------------------------------------------------------------------------
 * BASE TIERS — unchanged
 * ------------------------------------------------------------------------ */

export const TIERS = [
  {
    id: "basic",
    name: "Basic Protection",
    price: 19.99,
    who: "W-2 only filers, no business schedules",
  },
  {
    id: "standard",
    name: "Standard Protection",
    price: 34.99,
    who: "Schedule C/E/D or passive K-1 income",
  },
  {
    id: "business",
    name: "Business Protection",
    price: 59.99,
    who: "Active business owners, S-Corps, multi-entity",
  },
];

export const TIER_NOTE =
  "Tier assignment is made by Taxonomy based on review of your most recent tax return.";

/* ---------------------------------------------------------------------------
 * HOUSEHOLD COVERAGE ADD-ON
 * An optional toggle at tier selection. Not a tier of its own.
 * ------------------------------------------------------------------------ */

export const HOUSEHOLD_ADDON = {
  id: "household_coverage",
  label: "Household Coverage",
  price: 15.0,
  description:
    "Extend coverage to household members who file their own separate tax return — for example, a dependent adult child who files independently. Covers IRS representation for one additional filer in your household under the same terms as your plan.",
};

/**
 * Days between enrollment and the date coverage becomes active.
 * TODO — CONFIRM against the waiting-period clause in your agreement before
 * publishing. 30 is a placeholder, not a value read out of your current text.
 */
export const WAITING_PERIOD_DAYS = 30;

/* ---------------------------------------------------------------------------
 * PRICING MATH — the only place a total is computed
 * ------------------------------------------------------------------------ */

export function getTier(tierId) {
  return TIERS.find((t) => t.id === tierId) || null;
}

/** Base tier price + $15.00 when the add-on is selected. */
export function monthlyTotal(tierId, householdCoverage) {
  const tier = getTier(tierId);
  if (!tier) return 0;
  const total = tier.price + (householdCoverage ? HOUSEHOLD_ADDON.price : 0);
  // Guard against float drift (19.99 + 15 must be exactly 34.99).
  return Math.round(total * 100) / 100;
}

export function formatUSD(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

/** "$34.99/month" — use everywhere a rate is displayed. */
export function formatMonthly(amount) {
  return `${formatUSD(amount)}/month`;
}

/** Shown to the client in place of the removed Agreement Version row. */
export function coverageType(householdCoverage) {
  return householdCoverage ? "Base Plan + Household Coverage" : "Base Plan";
}

/** A plain-language breakdown for the tier step and the confirmation screen. */
export function priceBreakdown(tierId, householdCoverage) {
  const tier = getTier(tierId);
  if (!tier) return { lines: [], total: 0 };
  const lines = [{ label: tier.name, amount: tier.price }];
  if (householdCoverage) {
    lines.push({ label: HOUSEHOLD_ADDON.label, amount: HOUSEHOLD_ADDON.price });
  }
  return { lines, total: monthlyTotal(tierId, householdCoverage) };
}

export function coverageActivationDate(enrolledAt = new Date()) {
  const d = new Date(enrolledAt);
  d.setDate(d.getDate() + WAITING_PERIOD_DAYS);
  return d;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ---------------------------------------------------------------------------
 * STRIPE — PATH A (recommended, no backend code)
 *
 * Six Payment Links: one per tier, one per tier-with-add-on. Create the three
 * add-on links in Stripe as a subscription with TWO line items (the tier price
 * and a $15.00/month "Household Coverage" price), then paste the URLs below.
 *
 * This is the zero-risk path — Stripe itself owns the arithmetic, so the amount
 * charged cannot disagree with the amount displayed.
 *
 * PATH B (a single Checkout Session built from line items) lives in
 * functions/createCheckoutSession.js. Use it if you would rather manage one
 * price object per product than six links.
 * ------------------------------------------------------------------------ */

export const STRIPE_LINKS = {
  // TODO — paste your existing three Payment Link URLs:
  basic: "",
  standard: "",
  business: "",

  // TODO — create these three in Stripe (tier price + $15.00 add-on price as
  // two line items on one subscription), then paste the URLs:
  basic_household: "",
  standard_household: "",
  business_household: "",
};

/**
 * Resolve the Payment Link for a selection.
 * Throws rather than silently falling back to the base-tier link — charging a
 * client $19.99 when they selected and agreed to $34.99 is the one failure mode
 * worth crashing the flow over.
 */
export function stripeLinkFor(tierId, householdCoverage) {
  const key = householdCoverage ? `${tierId}_household` : tierId;
  const url = STRIPE_LINKS[key];
  if (!url) {
    throw new Error(
      `No Stripe Payment Link configured for "${key}". Add it to STRIPE_LINKS in planConfig.js before enabling this option.`
    );
  }
  return url;
}

/** True when every link the flow can reach is configured. */
export function stripeLinksReady() {
  return Object.values(STRIPE_LINKS).every((v) => typeof v === "string" && v.length > 0);
}
