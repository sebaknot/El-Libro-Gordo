# Brand migration — mechanical find & replace

Run these on **both** Base44 apps. The `<style>` override block in each
`Layout.js` covers you in the meantime, but these replacements are the real fix.
Once both apps are clean, delete the "LEGACY COLOUR OVERRIDES" section from the
enrollment site's `Layout.js`.

## 1. Name

| Find | Replace |
|---|---|
| `TaxOne Advisors` | `Taxonomy` |
| `TaxOne` | `Taxonomy` |
| `taxone` | `taxonomy` |

Check page titles, `<title>` / meta description, header, footer, body copy,
image `alt` text, and any entity or email template strings.

## 2. Retired pricing — must return zero results afterwards

| Find | Replace |
|---|---|
| `$50/month` | `Starting at $19.99/month` |
| `$50 / month` | `Starting at $19.99/month` |
| `$50 a month` | `Starting at $19.99/month` |
| `Starting at $50` | `Starting at $19.99` |

Search for the bare string `50` near a `$` before declaring this done.

## 3. Banned words — these must appear nowhere on either site

| Find | Replace with |
|---|---|
| `Unlimited Consultation` | `Direct Phone Access` |
| `call us anytime` | `up to 2–3 calls per month, 10 minutes each` |
| `unlimited` (in a service-scope context) | bounded language, always |
| `anytime` (in a service-scope context) | a stated limit |

Exception: "unlimited representation rights" is a **legal term of art** for
Enrolled Agent practice authority and is correct. It refers to IRS practice
rights, not to service volume. Keep that one.

## 4. Placeholder contact data

| Find | Replace |
|---|---|
| `(123) 456-7890` | `561-530-3366` |
| `tel:1234567890` | `tel:+15615303366` |

## 5. Colour classes

| Old | New |
|---|---|
| `bg-orange-500` / `bg-orange-600` / `bg-amber-*` | `bg-[#00D4B4]` (with `text-[#0E1116]`) |
| `text-orange-*` / `text-amber-*` | `text-[#00A88C]` on light, `text-[#00D4B4]` on dark |
| `border-orange-*` | `border-[#00A88C]` |
| `hover:bg-orange-*` | `hover:bg-[#00A88C]` |
| `bg-slate-900` / `bg-blue-900` / `bg-navy` | `bg-[#0E1116]` |
| `text-slate-900` / `text-navy` | `text-[#0E1116]` |
| `bg-gray-50` / `bg-slate-50` (page bg) | `bg-[#F5F5F0]` |
| `text-gray-500` / `text-slate-500` | `text-[#6B7280]` |
| any `bg-gradient-to-*` | delete — flat fills only |

Full token table:

| Token | Hex |
|---|---|
| Ink | `#0E1116` |
| Signal | `#00D4B4` |
| Signal Dark | `#00A88C` |
| Paper | `#F5F5F0` |
| Slate | `#6B7280` |
| White | `#FFFFFF` |

## 6. Icons

Every icon: single teal treatment, flat, no coloured circle background.

```jsx
// before — five different hues, coloured pills
<div className="rounded-full bg-blue-100 p-3">
  <Shield className="text-blue-600" />
</div>

// after
<Shield size={24} strokeWidth={2} color="#00A88C" />   {/* on light */}
<Shield size={24} strokeWidth={2} color="#00D4B4" />   {/* on dark  */}
```

Or use the shared helper: `<IconBadge icon={Shield} tone="light" />`.

## 7. Gradients and shadows

- Remove every gradient. The only one permitted is a single flat two-stop teal
  on a large dark hero — and the code as written does not use one, so the
  simplest correct state is: no gradients at all.
- No drop shadow on the logo or wordmark anywhere, in either app.

## 8. Old logo

Delete the hexagon TaxOne badge component and every reference to its asset.
The `LogoSlot` component in each `Layout.js` renders a correctly-sized dashed
placeholder until you paste the new asset URL into `LOGO_URL_HEADER` /
`LOGO_URL_FOOTER`.

## 9. Final sweep — search each term, expect zero hits

```
TaxOne          $50            unlimited consultation
anytime         (123) 456      © 2024
hexagon         bg-orange      bg-gradient
turbotax        CPA            DSS
```

`CPA` and `DSS` must return zero hits. CPA licensure is not referenced until
conferred; no current federal law enforcement role, agency, or employer is
named anywhere — Army intelligence only.
