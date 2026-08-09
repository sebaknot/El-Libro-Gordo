/**
 * Taxonomy — shared brand primitives.
 * Base44 path: components/brand/Brand.js
 * Import as:   import { Btn, Section, ... } from "@/components/brand/Brand";
 *
 * This file is the single source of truth for colors, pricing tiers, and the
 * CTA hierarchy. Change a price here and it changes on every page.
 *
 * Deliberately uses only plain HTML + Tailwind utility classes and lucide-react
 * icons — no shadcn/ui imports — so it drops into any Base44 app without
 * matching an existing component library.
 */

import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/* ---------------------------------------------------------------------------
 * 1. BRAND TOKENS
 * ------------------------------------------------------------------------ */

export const C = {
  ink: "#0E1116",       // primary dark — header/footer, dark surfaces
  signal: "#00D4B4",    // accent — buttons, links, icons on dark
  signalDark: "#00A88C", // accent, light-mode safe — icons on light bg
  paper: "#F5F5F0",     // light page + card background
  slate: "#6B7280",     // secondary text, muted labels, borders
  white: "#FFFFFF",
};

/** Real business contact. Never render a placeholder number. */
export const PHONE = "561-530-3366";
export const PHONE_HREF = "tel:+15615303366";

/** Live standalone enrollment site (Site 2). Kept separate by design. */
export const ENROLLMENT_URL = "https://tax1a-enrollment-plan.base44.app";

/** The strongest trust signal available. Repeated across the site. */
export const TREASURY_LINE =
  "Licensed by the U.S. Department of the Treasury — admitted to practice before the Internal Revenue Service.";

/* ---------------------------------------------------------------------------
 * 2. PRICING — SINGLE SOURCE OF TRUTH
 * The retired flat "$50/month" number must not appear anywhere on either site.
 * ------------------------------------------------------------------------ */

export const TIERS = [
  {
    name: "Basic Protection",
    price: "19.99",
    who: "W-2 only filers, no business schedules",
    points: [
      "Full IRS representation on any notice or examination",
      "Notice review and response drafted for you",
      "Direct phone access — up to 2–3 calls per month, 10 minutes each",
      "Annual filing-position review",
    ],
  },
  {
    name: "Standard Protection",
    price: "34.99",
    who: "Schedule C/E/D or passive K-1 income",
    featured: true,
    points: [
      "Everything in Basic Protection",
      "Coverage for Schedule C, E and D positions",
      "Passive K-1 income reporting support",
      "Basis and carryforward tracking review",
    ],
  },
  {
    name: "Business Protection",
    price: "59.99",
    who: "Active business owners, S-Corps, multi-entity",
    points: [
      "Everything in Standard Protection",
      "S-Corp, partnership and multi-entity coverage",
      "Reasonable-compensation and payroll notice support",
      "Entity-level correspondence handled end to end",
    ],
  },
];

/** Must appear anywhere pricing is shown. */
export const TIER_NOTE =
  "Tier assignment is made by Taxonomy based on review of your most recent tax return.";

export const STARTING_AT = "Starting at $19.99/month";

/* ---------------------------------------------------------------------------
 * 3. CTA HIERARCHY  (one pattern, every page)
 *    "Book an Appointment"  -> ALWAYS the filled primary button
 *    everything else        -> ALWAYS the outlined secondary button
 * ------------------------------------------------------------------------ */

const BASE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00D4B4]";

function btnClasses(variant, tone) {
  if (variant === "primary") {
    // Teal fill + ink text reads correctly on both light and dark surfaces.
    return `${BASE_BTN} bg-[#00D4B4] text-[#0E1116] hover:bg-[#00A88C] focus-visible:ring-offset-transparent`;
  }
  return tone === "dark"
    ? `${BASE_BTN} border border-white/35 text-white hover:border-[#00D4B4] hover:text-[#00D4B4] focus-visible:ring-offset-[#0E1116]`
    : `${BASE_BTN} border border-[#0E1116]/25 text-[#0E1116] hover:border-[#00A88C] hover:text-[#00A88C] focus-visible:ring-offset-[#F5F5F0]`;
}

/**
 * Btn — the only button in the system.
 * @param {"primary"|"secondary"} variant  primary is reserved for "Book an Appointment"
 * @param {"light"|"dark"} tone            the background it sits on
 * @param {string} page                    internal Base44 page name
 * @param {string} href                    external URL (takes precedence over page)
 */
export function Btn({
  children,
  variant = "secondary",
  tone = "light",
  page,
  href,
  external = false,
  className = "",
  ...rest
}) {
  const cls = `${btnClasses(variant, tone)} ${className}`;
  if (href) {
    return (
      <a
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={createPageUrl(page)} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/** The primary CTA, pre-labelled so it can never drift page to page. */
export function BookBtn({ tone = "light", className = "" }) {
  return (
    <Btn variant="primary" tone={tone} page="BookAppointment" className={className}>
      Book an Appointment
    </Btn>
  );
}

/* ---------------------------------------------------------------------------
 * 4. LAYOUT + TYPE PRIMITIVES
 * ------------------------------------------------------------------------ */

/** @param {"paper"|"white"|"ink"} bg */
export function Section({ bg = "paper", id, className = "", children }) {
  const bgClass =
    bg === "ink" ? "bg-[#0E1116]" : bg === "white" ? "bg-white" : "bg-[#F5F5F0]";
  return (
    <section id={id} className={`${bgClass} px-5 py-16 sm:px-6 md:py-24 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ tone = "light", children }) {
  return (
    <p
      className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${
        tone === "dark" ? "text-[#00D4B4]" : "text-[#00A88C]"
      }`}
    >
      {children}
    </p>
  );
}

export function H2({ tone = "light", className = "", children }) {
  return (
    <h2
      className={`font-[var(--tx-font-head)] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${
        tone === "dark" ? "text-white" : "text-[#0E1116]"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

export function Lede({ tone = "light", className = "", children }) {
  return (
    <p
      className={`mt-4 max-w-2xl text-base leading-relaxed sm:text-lg ${
        tone === "dark" ? "text-white/70" : "text-[#6B7280]"
      } ${className}`}
    >
      {children}
    </p>
  );
}

export function SectionHead({ tone = "light", eyebrow, title, lede, center = false }) {
  return (
    <div className={center ? "mx-auto max-w-3xl text-center" : ""}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <H2 tone={tone}>{title}</H2>
      {lede ? (
        <Lede tone={tone} className={center ? "mx-auto" : ""}>
          {lede}
        </Lede>
      ) : null}
    </div>
  );
}

export function Card({ tone = "light", className = "", children }) {
  return (
    <div
      className={`rounded-lg border p-6 sm:p-7 ${
        tone === "dark"
          ? "border-white/12 bg-white/[0.04]"
          : "border-[#6B7280]/20 bg-white"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * IconBadge — every icon on the site renders through this.
 * Flat Signal teal, no colored circle backgrounds, no gradients, no shadows.
 */
export function IconBadge({ icon: IconCmp, tone = "light", size = 22, className = "" }) {
  return (
    <IconCmp
      size={size}
      strokeWidth={2}
      className={className}
      color={tone === "dark" ? C.signal : C.signalDark}
      aria-hidden="true"
    />
  );
}

/** Teal check used in every feature list. */
export function Tick({ tone = "light" }) {
  return (
    <span
      aria-hidden="true"
      className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: tone === "dark" ? C.signal : C.signalDark }}
    />
  );
}

export function Bullets({ items, tone = "light", className = "" }) {
  return (
    <ul className={`space-y-2.5 ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <Tick tone={tone} />
          <span
            className={`text-sm leading-relaxed ${
              tone === "dark" ? "text-white/75" : "text-[#6B7280]"
            }`}
          >
            {t}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Placeholder — a clearly marked container for an asset that is not final yet
 * (logo, headshot, photography). Visible on purpose so nothing ships by accident.
 */
export function Placeholder({ label, className = "", minH = "220px" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg border-2 border-dashed border-[#6B7280]/45 bg-[#6B7280]/[0.06] p-6 text-center ${className}`}
      style={{ minHeight: minH }}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
        {label}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * 5. TIER CARDS — reused on Services (summary) and IRS Representation (full)
 * ------------------------------------------------------------------------ */

export function TierCards({ tone = "light", detailed = true }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {TIERS.map((t) => (
        <div
          key={t.name}
          className={`flex flex-col rounded-lg border p-6 sm:p-7 ${
            tone === "dark"
              ? "border-white/12 bg-white/[0.04]"
              : "border-[#6B7280]/20 bg-white"
          } ${t.featured ? "border-[#00A88C] ring-1 ring-[#00A88C]" : ""}`}
        >
          {t.featured ? (
            <span className="mb-3 inline-block w-fit rounded bg-[#00D4B4] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0E1116]">
              Most common
            </span>
          ) : null}
          <h3
            className={`font-[var(--tx-font-head)] text-lg font-extrabold ${
              tone === "dark" ? "text-white" : "text-[#0E1116]"
            }`}
          >
            {t.name}
          </h3>
          <p className="mt-3 flex items-baseline gap-1">
            <span
              className={`font-[var(--tx-font-head)] text-4xl font-extrabold tracking-tight ${
                tone === "dark" ? "text-white" : "text-[#0E1116]"
              }`}
            >
              ${t.price}
            </span>
            <span className="text-sm text-[#6B7280]">/month</span>
          </p>
          <p
            className={`mt-2 text-sm ${
              tone === "dark" ? "text-white/70" : "text-[#6B7280]"
            }`}
          >
            {t.who}
          </p>
          {detailed ? (
            <Bullets items={t.points} tone={tone} className="mt-5 flex-1" />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      ))}
    </div>
  );
}

/** The tier-assignment disclosure. Render this next to every price. */
export function TierNote({ tone = "light", className = "" }) {
  return (
    <p
      className={`mt-6 text-sm ${
        tone === "dark" ? "text-white/60" : "text-[#6B7280]"
      } ${className}`}
    >
      {TIER_NOTE}
    </p>
  );
}
