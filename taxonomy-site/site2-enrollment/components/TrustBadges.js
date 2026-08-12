/**
 * Trust badge row.
 * Base44 path: components/brand/TrustBadges.js
 *
 * Fix applied: "Florida Licensed" → "Federally Licensed". The Enrolled Agent
 * credential is issued by the U.S. Department of the Treasury at the federal
 * level, not by the State of Florida. Delete the old badge component so the
 * inaccurate label cannot survive somewhere else in the app.
 *
 * Two exports:
 *   <TrustBadgeBand />  the full-width strip — use this one on a page. It paints
 *                       the background edge to edge but holds the badges in a
 *                       centered, max-width, padded container like every other
 *                       section, so they stop running flush to the left edge.
 *   <TrustBadges />     the bare row, for placing inside a container you already
 *                       have (the confirmation card, for example).
 *
 * Centering is the default in both. Pass align="left" only where you actually
 * want it left-aligned.
 */

import React from "react";
import { BadgeCheck, Landmark, Lock, PenLine, ShieldCheck } from "lucide-react";

const BADGES = [
  { icon: BadgeCheck, label: "IRS Enrolled Agent" },
  { icon: Landmark, label: "U.S. Treasury Authorized" },
  { icon: Lock, label: "Secure Enrollment" },
  { icon: PenLine, label: "Electronic Signature Certified" },
  { icon: ShieldCheck, label: "Federally Licensed" },
];

/**
 * The bare badge row.
 * @param {"light"|"dark"} tone    the surface it sits on
 * @param {"center"|"left"} align  defaults to center
 * @param {boolean} compact        smaller type, for tight spaces like the card
 */
export function TrustBadges({ tone = "light", align = "center", compact = false, className = "" }) {
  const dark = tone === "dark";
  const accent = dark ? "#00D4B4" : "#00A88C";

  return (
    <ul
      className={`flex flex-wrap items-center ${
        align === "center" ? "justify-center" : "justify-start"
      } ${compact ? "gap-x-5 gap-y-2.5" : "gap-x-7 gap-y-3"} ${className}`}
    >
      {BADGES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2">
          <Icon
            size={compact ? 14 : 16}
            color={accent}
            strokeWidth={2}
            className="flex-none"
            aria-hidden="true"
          />
          <span
            className={`whitespace-nowrap font-semibold tracking-wide ${
              compact ? "text-[11px]" : "text-xs"
            } ${dark ? "text-white/70" : "text-[#6B7280]"}`}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The full-width strip. Background spans edge to edge; the badges sit in a
 * centered container with real horizontal padding, so nothing touches the
 * viewport edge on any screen size.
 *
 * @param {"paper"|"white"|"ink"} bg
 */
export function TrustBadgeBand({ bg = "paper", className = "" }) {
  const dark = bg === "ink";
  const bgClass =
    bg === "ink" ? "bg-[#0E1116]" : bg === "white" ? "bg-white" : "bg-[#F5F5F0]";
  const borderClass = dark ? "border-white/10" : "border-[#6B7280]/15";

  return (
    <div className={`w-full border-y ${borderClass} ${bgClass} ${className}`}>
      <div className="mx-auto w-full max-w-5xl px-5 py-4 sm:px-6">
        <TrustBadges tone={dark ? "dark" : "light"} align="center" />
      </div>
    </div>
  );
}

export default TrustBadges;
