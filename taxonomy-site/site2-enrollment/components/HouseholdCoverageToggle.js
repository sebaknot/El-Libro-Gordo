/**
 * Household Coverage add-on toggle.
 * Base44 path: components/enroll/HouseholdCoverageToggle.js
 *
 * Drops into the tier selection step, below the three tier cards. It is a
 * toggle on top of the chosen tier — never a fourth tier.
 *
 * Usage in your tier step:
 *
 *   const [tierId, setTierId] = useState(null);
 *   const [household, setHousehold] = useState(false);
 *   ...
 *   <HouseholdCoverageToggle
 *     tierId={tierId}
 *     checked={household}
 *     onChange={setHousehold}
 *   />
 *
 * Then carry `household` through to the agreement, the Stripe handoff, and the
 * enrollment record. `monthlyTotal(tierId, household)` is the amount to charge.
 */

import React from "react";
import { Users, Check } from "lucide-react";
import {
  HOUSEHOLD_ADDON,
  getTier,
  priceBreakdown,
  formatUSD,
  formatMonthly,
} from "@/components/config/planConfig";

export default function HouseholdCoverageToggle({ tierId, checked, onChange, disabled = false }) {
  const tier = getTier(tierId);
  const { lines, total } = priceBreakdown(tierId, checked);
  const inputId = "household-coverage-toggle";

  return (
    <div className="mt-8">
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer gap-4 rounded-xl border bg-white p-5 transition-all sm:p-6 ${
          checked
            ? "border-[#00A88C] shadow-[0_2px_16px_-4px_rgba(0,168,140,0.35)] ring-1 ring-[#00A88C]"
            : "border-[#6B7280]/25 hover:border-[#00A88C]/60"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {/* Custom control — the native input stays in the DOM for a11y. */}
        <span className="relative mt-0.5 flex-none">
          <input
            id={inputId}
            type="checkbox"
            checked={!!checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#00A88C] peer-focus-visible:ring-offset-2 ${
              checked ? "border-[#00A88C] bg-[#00A88C]" : "border-[#6B7280]/45 bg-white"
            }`}
          >
            {checked ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : null}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Users size={18} color="#00A88C" strokeWidth={2} aria-hidden="true" />
            <span className="text-base font-extrabold text-[#0E1116]">
              {HOUSEHOLD_ADDON.label}
            </span>
            <span className="rounded bg-[#F5F5F0] px-2 py-0.5 text-xs font-bold tracking-wide text-[#0E1116]">
              + {formatMonthly(HOUSEHOLD_ADDON.price)}
            </span>
          </span>

          <span className="mt-2.5 block text-sm leading-relaxed text-[#6B7280]">
            {HOUSEHOLD_ADDON.description}
          </span>

          <span className="mt-2.5 block text-xs leading-relaxed text-[#6B7280]">
            The additional filer must sign their own IRS Form 2848 or 8821 before
            we can represent them. Covers one additional filer.
          </span>
        </span>
      </label>

      {/* Running total — visible before the client ever reaches Stripe. */}
      {tier ? (
        <div className="mt-4 rounded-xl border border-[#6B7280]/20 bg-[#F5F5F0] p-5">
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-[#6B7280]">{l.label}</span>
                <span className="font-semibold tabular-nums text-[#0E1116]">
                  {formatUSD(l.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[#6B7280]/25 pt-3">
            <span className="text-sm font-extrabold uppercase tracking-[0.1em] text-[#0E1116]">
              Total today and monthly
            </span>
            <span className="text-xl font-extrabold tabular-nums text-[#0E1116]">
              {formatMonthly(total)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
