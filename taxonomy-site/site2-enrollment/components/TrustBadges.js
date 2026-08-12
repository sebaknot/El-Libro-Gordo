/**
 * Trust badge row.
 * Base44 path: components/brand/TrustBadges.js
 *
 * Fix applied: "Florida Licensed" → "Federally Licensed". The Enrolled Agent
 * credential is issued by the U.S. Department of the Treasury at the federal
 * level, not by the State of Florida. Delete the old badge component so the
 * inaccurate label cannot survive somewhere else in the app.
 *
 * @param {"light"|"dark"} tone  the surface it sits on
 * @param {boolean} compact      smaller type, for the confirmation card
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

export default function TrustBadges({ tone = "light", compact = false }) {
  const dark = tone === "dark";
  const accent = dark ? "#00D4B4" : "#00A88C";

  return (
    <ul
      className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${
        compact ? "justify-center" : ""
      }`}
    >
      {BADGES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2">
          <Icon
            size={compact ? 14 : 16}
            color={accent}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span
            className={`font-semibold tracking-wide ${compact ? "text-[11px]" : "text-xs"} ${
              dark ? "text-white/70" : "text-[#6B7280]"
            }`}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
