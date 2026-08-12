# Taxonomy — Base44 paste-in source

Drop-in code for two separate Base44 apps. They share one brand system and stay
two independent properties.

> These files are **not** part of the El Libro Gordo Next.js app. They live here
> only as a delivery location. Nothing under `src/` imports them, and they are
> outside the `tsconfig.json` include globs, so builds and typechecks ignore them.

## Paste order

### Site 1 — main company site (tax1a.com)

| Paste this file | Into this Base44 path |
|---|---|
| `site1-main/components/brand/Brand.js` | `components/brand/Brand.js` — **paste this first**, everything imports it |
| `site1-main/Layout.js` | `Layout.js` (root) |
| `site1-main/pages/Home.js` | `pages/Home.js` |
| `site1-main/pages/Services.js` | `pages/Services.js` |
| `site1-main/pages/IRSRepresentation.js` | `pages/IRSRepresentation.js` |
| `site1-main/pages/About.js` | `pages/About.js` |
| `site1-main/pages/BookAppointment.js` | `pages/BookAppointment.js` |
| `site1-main/pages/GetStarted.js` | `pages/GetStarted.js` |

Page names must match exactly — `createPageUrl("BookAppointment")` resolves off
the filename. If your existing pages use different names (e.g. `Membership`
instead of `IRSRepresentation`), either rename the Base44 page or update the
`page=` props and the `NAV` array in `Layout.js`.

Page count and structure are unchanged: Home, Services, IRS Representation,
About Us, Book Appointment, Get Started. The specializations section lives on
the homepage, so no new page was added.

### Site 2 — enrollment site (tax1a-enrollment-plan.base44.app)

**Batch 1 — brand only.**

| Paste this file | Into this Base44 path |
|---|---|
| `site2-enrollment/Layout.js` | `Layout.js` (root) |

**Batch 2 — household add-on, agreement, confirmation polish, admin.**

| Paste this file | Into this Base44 path |
|---|---|
| `site2-enrollment/config/planConfig.js` | `components/config/planConfig.js` — **first**, everything imports it |
| `site2-enrollment/agreement/agreementText.js` | `components/agreement/agreementText.js` |
| `site2-enrollment/components/HouseholdCoverageToggle.js` | `components/enroll/HouseholdCoverageToggle.js` |
| `site2-enrollment/components/TrustBadges.js` | `components/brand/TrustBadges.js` |
| `site2-enrollment/components/AgreementViewer.js` | `components/agreement/AgreementViewer.js` |
| `site2-enrollment/pages/Confirmation.js` | `pages/Confirmation.js` |
| `site2-enrollment/pages/Admin.js` | `pages/Admin.js` |
| `site2-enrollment/components/admin/ClientDetailPanel.js` | `components/admin/ClientDetailPanel.js` |
| `site2-enrollment/components/admin/DeleteEnrollmentDialog.js` | `components/admin/DeleteEnrollmentDialog.js` |
| `site2-enrollment/functions/createCheckoutSession.js` | `functions/createCheckoutSession.js` — only if you take Stripe Path B |
| `site2-enrollment/functions/stripeWebhook.js` | `functions/stripeWebhook.js` — optional, powers live billing status |

Add the entity fields in `site2-enrollment/ENTITY_SCHEMA.md` before pasting the
pages — `Admin.js` and `Confirmation.js` read `household_coverage`,
`agreement_version` and the Stripe IDs.

The enrollment flow order is unchanged (tier → form → agreement → sign → Stripe
→ confirmation), the three base prices are unchanged, and the FAQ, testimonials
and covered/not-covered content are untouched.

### Both apps

Work through `BRAND_MIGRATION.md` — the find-and-replace map for leftover
`TaxOne`, `$50/month`, orange/navy classes, gradients, and the old hexagon badge
in components not listed above.

## Dependencies

Only `react`, `react-router-dom`, `@/utils` (`createPageUrl`), `lucide-react`,
and Tailwind — all standard in Base44. No shadcn/ui imports, so nothing depends
on which component library your app already has.

Colours are written as Tailwind arbitrary values (`bg-[#0E1116]`), so no
`tailwind.config` change is needed. CSS custom properties are also defined in
`Layout.js` if you prefer them elsewhere.

## Before you publish — six things that need your input

1. **Logo.** Upload in Base44, then set `LOGO_URL_HEADER` and `LOGO_URL_FOOTER`
   at the top of each `Layout.js`. Until then a dashed placeholder holds the
   space at the right size (36px header / 64px footer).
2. **Headshot.** Two placeholder containers — About page (primary) and homepage
   founder teaser. Both marked visibly.
3. **Testimonials.** Three placeholder cards on the homepage, dashed-bordered,
   text reads `PLACEHOLDER — TO BE REPLACED`. Do not publish invented quotes.
4. **Spanish.** The "Available in English and Spanish" line is **commented out**
   in `pages/Home.js` (the `languages: null` field on the international block).
   Confirm the capability, then set it to the string. Left off deliberately so
   an unverified service claim cannot ship by accident.
5. **Appointment form wiring.** `submitAppointment()` in `BookAppointment.js`
   currently logs the payload and shows the success state. Create an
   `Appointment` entity in Base44 (`full_name`, `email`, `phone`, `service`,
   `preferred_time`, `message`) and uncomment the two marked lines. Or replace
   the form with your Calendly/Cal.com embed.
6. **Video policy.** Written as: every appointment is a video meeting, secure
   link emailed on confirmation, phone swap available on request. If your actual
   policy is phone-first, the alternate wording is in a comment right above that
   block in `BookAppointment.js`. Either way it is now a definite statement, not
   "if applicable".

Also check the support email — `info@tax1a.com` is a guess, marked with a TODO
in `Layout.js` and `GetStarted.js`.

## Guardrails already enforced in the copy

- No CPA reference anywhere.
- Army intelligence only. No DSS, no Diplomatic Security Service, no current
  federal law enforcement role, agency, or employer named.
- The words "unlimited" and "anytime" never describe service scope. Phone access
  is always "up to 2–3 calls per month, 10 minutes each". The one intentional use
  of "unlimited" is "unlimited representation rights" — the legal term of art for
  EA practice authority.
- No `$50/month`. Pricing comes from the `TIERS` array in `Brand.js`, so all
  three prices have exactly one definition.
- `TIER_NOTE` ("Tier assignment is made by Taxonomy…") renders next to every
  price on every page.
- TurboTax is not named. The comparison is against unlicensed and limited-rights
  preparers, framed on representation rights.
- Copyright year is `new Date().getFullYear()` in both apps.
- Treasury licensing line appears in the homepage hero, About, Services, Get
  Started, Book Appointment, and both footers.
- One CTA pattern: "Book an Appointment" is always the filled primary button;
  every other CTA is the outlined secondary. Enforced by `BookBtn` / `Btn` in
  `Brand.js` rather than by convention.
- Every multi-card grid is `grid-cols-1 md:grid-cols-3` — Services cards, Get
  Started steps, About comparison cards all stack to one column on mobile with
  no fixed widths and no horizontal overflow.
