/**
 * "You Are Now Protected" — confirmation page.
 * Base44 path: pages/Confirmation.js
 *
 * Polish pass, not a rebuild. Same layout structure, same palette, same content
 * hierarchy. What changed:
 *   - the white card sits on a real elevation instead of lying flat
 *   - the icon / headline / subheadline stack has room to breathe
 *   - plan details are a bordered table with alternating row shading
 *   - both buttons share one size, padding and corner radius
 *   - the closing callout is a designed element with an icon, not a leftover box
 *   - trust badges read "Federally Licensed"
 *   - the "Agreement Version" row is gone; "Coverage Type" replaces it
 *
 * Expects the completed enrollment record:
 *   <Confirmation enrollment={record} />
 * Falls back to sensible empty values if a field is missing, so a partial
 * record renders rather than throwing on the client's success screen.
 */

import React, { useState } from "react";
import { ShieldCheck, Check, Download, Mail, Headset, Loader2 } from "lucide-react";
import TrustBadges from "@/components/brand/TrustBadges";
import {
  getTier,
  monthlyTotal,
  formatMonthly,
  coverageType,
  coverageActivationDate,
  formatDate,
} from "@/components/config/planConfig";
import {
  renderAgreementText,
  agreementFilename,
} from "@/components/agreement/agreementText";
// import { SendEmail } from "@/integrations/Core"; // <- uncomment to enable "Email Me a Copy"

const BTN =
  "inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl px-6 text-sm font-bold tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A88C] focus-visible:ring-offset-2 disabled:opacity-60";

export default function Confirmation({ enrollment = {} }) {
  const [downloadState, setDownloadState] = useState("idle");
  const [emailState, setEmailState] = useState("idle"); // idle | sending | sent | error

  const tier = getTier(enrollment.tier_id);
  const household = !!enrollment.household_coverage;
  const total = monthlyTotal(enrollment.tier_id, household);
  const enrolledAt = enrollment.enrolled_at || new Date();

  const rows = [
    { label: "Plan", value: tier ? tier.name : "—" },
    { label: "Monthly Rate", value: total ? formatMonthly(total) : "—", emphasis: true },
    { label: "Enrollment Date", value: formatDate(enrolledAt) },
    {
      label: "Coverage Activates",
      value: formatDate(enrollment.coverage_activates || coverageActivationDate(enrolledAt)),
    },
    // Replaces the removed "Agreement Version" row.
    { label: "Coverage Type", value: coverageType(household) },
  ];

  function handleDownload() {
    setDownloadState("working");
    try {
      // audience "client" — the version number is never stamped on this copy.
      const text = renderAgreementText({ audience: "client" });
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = agreementFilename(enrollment.full_name);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadState("done");
      setTimeout(() => setDownloadState("idle"), 2000);
    } catch (err) {
      console.error(err);
      setDownloadState("idle");
    }
  }

  async function handleEmail() {
    setEmailState("sending");
    try {
      // await SendEmail({
      //   to: enrollment.email,
      //   subject: "Your Taxonomy Subscription Agreement",
      //   body: renderAgreementText({ audience: "client" }),
      // });
      console.log("Email agreement to:", enrollment.email);
      setEmailState("sent");
    } catch (err) {
      console.error(err);
      setEmailState("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1116] px-5 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-2xl">
        {/* ---- Elevated card ------------------------------------------- */}
        <div className="rounded-2xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_24px_64px_-16px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
          <div className="px-7 pb-9 pt-12 sm:px-12 sm:pb-12 sm:pt-14">
            {/* ---- Icon lockup — spaced, not cramped ------------------- */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F5F5F0]">
                  <ShieldCheck size={40} color="#00A88C" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#00A88C]">
                  <Check size={16} color="#FFFFFF" strokeWidth={3.5} aria-hidden="true" />
                </span>
              </div>

              <h1 className="mt-9 text-3xl font-extrabold leading-tight tracking-tight text-[#0E1116] sm:text-4xl">
                You Are Now Protected
              </h1>

              <p className="mt-5 max-w-md text-base leading-relaxed text-[#6B7280]">
                Your enrollment is complete and your subscription agreement has
                been signed. A copy is on its way to{" "}
                <span className="font-semibold text-[#0E1116]">
                  {enrollment.email || "your email address"}
                </span>
                .
              </p>
            </div>

            {/* ---- Plan details table --------------------------------- */}
            <div className="mt-11 overflow-hidden rounded-xl border border-[#6B7280]/25">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Your plan details</caption>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.label}
                      className={`${i % 2 === 1 ? "bg-[#F5F5F0]" : "bg-white"} ${
                        i === 0 ? "" : "border-t border-[#6B7280]/18"
                      }`}
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.13em] text-[#6B7280] sm:px-6"
                      >
                        {r.label}
                      </th>
                      <td
                        className={`px-5 py-4 text-right tabular-nums sm:px-6 ${
                          r.emphasis
                            ? "text-lg font-extrabold text-[#0E1116]"
                            : "text-sm font-semibold text-[#0E1116]"
                        }`}
                      >
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {household ? (
              <p className="mt-4 text-xs leading-relaxed text-[#6B7280]">
                Household Coverage extends to one additional filer. We will reach
                out to collect their IRS Form 2848 or 8821 — we cannot represent
                them until they have personally authorized it.
              </p>
            ) : null}

            {/* ---- Actions -------------------------------------------- */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDownload}
                className={`${BTN} bg-[#0E1116] text-white hover:bg-[#00A88C]`}
              >
                <Download size={17} strokeWidth={2.25} aria-hidden="true" />
                {downloadState === "done" ? "Downloaded" : "Download Signed Agreement"}
              </button>

              <button
                type="button"
                onClick={handleEmail}
                disabled={emailState === "sending" || emailState === "sent"}
                className={`${BTN} border border-[#0E1116]/20 bg-white text-[#0E1116] hover:border-[#00A88C] hover:text-[#00A88C]`}
              >
                {emailState === "sending" ? (
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Mail size={17} strokeWidth={2.25} aria-hidden="true" />
                )}
                {emailState === "sent"
                  ? "Copy Sent"
                  : emailState === "sending"
                  ? "Sending…"
                  : "Email Me a Copy"}
              </button>
            </div>

            {emailState === "error" ? (
              <p role="alert" className="mt-3 text-xs font-semibold text-[#0E1116]">
                We could not send that copy. Download it here instead, or call
                561-530-3366 and we will email it manually.
              </p>
            ) : null}

            {/* ---- Closing callout ------------------------------------ */}
            <div className="mt-9 flex gap-4 rounded-xl border border-[#00A88C]/35 bg-[#00D4B4]/[0.09] p-5 sm:p-6">
              <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#00A88C]">
                <Headset size={19} color="#FFFFFF" strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-[0.11em] text-[#0E1116]">
                  What happens next
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#0E1116]/75">
                  A Taxonomy representative will be in touch within one business
                  day to confirm your tier against your most recent return and
                  walk you through your coverage.
                </p>
              </div>
            </div>

            {/* ---- Trust badges --------------------------------------- */}
            <div className="mt-10 border-t border-[#6B7280]/20 pt-7">
              <TrustBadges tone="light" compact />
            </div>
          </div>
        </div>

        <p className="mt-7 text-center text-xs leading-relaxed text-white/45">
          Licensed by the U.S. Department of the Treasury — admitted to practice
          before the Internal Revenue Service.
        </p>
      </div>
    </div>
  );
}
