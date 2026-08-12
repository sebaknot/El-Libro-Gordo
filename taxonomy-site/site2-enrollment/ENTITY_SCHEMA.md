# `Enrollment` entity — fields to add

Base44 → Entities → `Enrollment` → edit schema. Keep every field you already
have; these are additions and confirmations. Nothing here is destructive.

New fields are marked **NEW** — those are what the household add-on, the
internal version tracking, and the Stripe cross-reference need.

```json
{
  "name": "Enrollment",
  "type": "object",
  "properties": {
    "full_name":   { "type": "string", "description": "Client's full legal name" },
    "email":       { "type": "string", "format": "email" },
    "phone":       { "type": "string" },

    "tier_id": {
      "type": "string",
      "enum": ["basic", "standard", "business"],
      "description": "Base tier. Prices live in planConfig.js, not here."
    },

    "household_coverage": {
      "type": "boolean",
      "default": false,
      "description": "NEW — Household Coverage add-on selected at enrollment (+$15.00/month)"
    },
    "charged_monthly": {
      "type": "number",
      "description": "NEW — total actually charged, written by the Stripe webhook. Cross-check against base tier + add-on."
    },

    "status": {
      "type": "string",
      "enum": ["pending", "active", "canceled", "declined"],
      "default": "pending",
      "description": "The firm's record of the relationship. Separate from Stripe status."
    },
    "source": {
      "type": "string",
      "default": "New",
      "description": "Referral, Tax Prep, New, etc. Defaults to New so the column is never blank."
    },

    "enrolled_at":        { "type": "string", "format": "date-time" },
    "coverage_activates": { "type": "string", "format": "date-time" },

    "agreement_version": {
      "type": "string",
      "description": "NEW — internal only. Stamp at signature time. Never rendered client-side."
    },
    "signed_at":      { "type": "string", "format": "date-time" },
    "signature_name": { "type": "string", "description": "Typed signature as entered" },

    "stripe_customer_id": {
      "type": "string",
      "description": "NEW — cus_… so a record can be opened in Stripe in one click"
    },
    "stripe_subscription_id": {
      "type": "string",
      "description": "NEW — sub_…"
    },
    "stripe_status": {
      "type": "string",
      "enum": ["active", "past_due", "canceled", "incomplete", "unknown"],
      "description": "NEW — written by functions/stripeWebhook.js. Leave unset if you skip the webhook."
    }
  },
  "required": ["email", "tier_id"]
}
```

## Stamping the version at signature time

Wherever your flow currently writes the enrollment record after signing, add:

```js
import { AGREEMENT_VERSION } from "@/components/agreement/agreementText";
import { coverageActivationDate } from "@/components/config/planConfig";

await Enrollment.create({
  ...formValues,
  tier_id: tierId,
  household_coverage: householdCoverage,   // the toggle's value
  agreement_version: AGREEMENT_VERSION,    // internal — never displayed to the client
  enrolled_at: new Date().toISOString(),
  coverage_activates: coverageActivationDate().toISOString(),
  signed_at: new Date().toISOString(),
  status: "pending",
  source: source || "New",
});
```

Stamping the version at signature time rather than reading it live is the whole
point of tracking it — a record signed under 3.2 must keep saying 3.2 after 3.3
ships, or you cannot match a client to the terms they actually agreed to.

## Backfilling existing records

Records created before this change have no `household_coverage` and no
`agreement_version`. Both read correctly anyway — `household_coverage` is falsy
so they show as Base Plan, and the detail panel falls back to the current
version constant when the field is empty. If you want them exact, set
`agreement_version` to `"3.2"` on every record that predates this deploy before
you clear out the test data.
