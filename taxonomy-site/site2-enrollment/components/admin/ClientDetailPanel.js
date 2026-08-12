/**
 * Client record — full detail view.
 * Base44 path: components/admin/ClientDetailPanel.js
 *
 * Opens from "View" in the dashboard table. Slide-over rather than a new route
 * so the operator keeps their place in the list.
 *
 * This is the one screen where the internal agreement version IS shown — the
 * whole point of tracking it is matching a signed record to the right text.
 */

import React, { useState } from "react";
import {
  X, Mail, Phone, CreditCard, ExternalLink, Download, Users, Trash2, Copy, Check,
} from "lucide-react";
import {
  getTier, monthlyTotal, formatMonthly, coverageType, formatDate,
} from "@/components/config/planConfig";
import {
  renderAgreementText, AGREEMENT_VERSION, SECTIONS,
} from "@/components/agreement/agreementText";

export const STATUS_OPTIONS = ["pending", "active", "canceled", "declined"];

const STATUS_STYLE = {
  active:   "bg-[#00D4B4]/15 text-[#0E1116] ring-[#00A88C]/45",
  pending:  "bg-[#6B7280]/12 text-[#0E1116] ring-[#6B7280]/35",
  canceled: "bg-[#0E1116]/8 text-[#6B7280] ring-[#6B7280]/30",
  declined: "bg-[#0E1116]/8 text-[#6B7280] ring-[#6B7280]/30",
};

const STRIPE_STYLE = {
  active:     "bg-[#00D4B4]/15 text-[#0E1116] ring-[#00A88C]/45",
  past_due:   "bg-[#0E1116] text-white ring-[#0E1116]",
  canceled:   "bg-[#0E1116]/8 text-[#6B7280] ring-[#6B7280]/30",
  incomplete: "bg-[#6B7280]/12 text-[#0E1116] ring-[#6B7280]/35",
  unknown:    "bg-[#6B7280]/12 text-[#6B7280] ring-[#6B7280]/30",
};

export function StatusPill({ value, map = STATUS_STYLE }) {
  const key = (value || "unknown").toLowerCase();
  const cls = map[key] || map.unknown || STATUS_STYLE.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ring-1 ${cls}`}>
      {key.replace("_", " ")}
    </span>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-[#6B7280]/15 py-3.5 sm:grid-cols-[168px_1fr] sm:gap-4">
      <dt className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#6B7280]">{label}</dt>
      <dd className="text-sm text-[#0E1116]">{children}</dd>
    </div>
  );
}

function CopyableId({ value }) {
  const [copied, setCopied] = useState(false);
  if (!value) {
    return (
      <span className="text-[#6B7280]">
        Not recorded — look this client up in Stripe by email
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-2 rounded-md bg-[#F5F5F0] px-2.5 py-1.5 font-mono text-xs text-[#0E1116] hover:ring-1 hover:ring-[#00A88C]"
    >
      {value}
      {copied ? <Check size={13} color="#00A88C" /> : <Copy size={13} color="#6B7280" />}
    </button>
  );
}

export default function ClientDetailPanel({ enrollment, onClose, onUpdate, onDelete }) {
  const [saving, setSaving] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  if (!enrollment) return null;

  const tier = getTier(enrollment.tier_id);
  const household = !!enrollment.household_coverage;
  const total = monthlyTotal(enrollment.tier_id, household);
  const signedVersion = enrollment.agreement_version || AGREEMENT_VERSION;

  async function setStatus(next) {
    setSaving(true);
    try {
      await onUpdate(enrollment.id, { status: next });
    } finally {
      setSaving(false);
    }
  }

  function downloadFirmCopy() {
    // audience "firm" — this copy IS stamped with the internal version.
    const text = renderAgreementText({ audience: "firm", signedVersion });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agreement-v${signedVersion}-${(enrollment.full_name || "client")
      .replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const stripeDashboardUrl = enrollment.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${enrollment.stripe_customer_id}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#0E1116]/55"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Client record"
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-[-24px_0_64px_-16px_rgba(0,0,0,0.4)]"
      >
        {/* ---- Header ------------------------------------------------- */}
        <div className="flex items-start justify-between gap-4 border-b border-[#6B7280]/20 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold tracking-tight text-[#0E1116]">
              {enrollment.full_name || "Unnamed client"}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill value={enrollment.status} />
              {household ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00D4B4]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#0E1116] ring-1 ring-[#00A88C]/40">
                  <Users size={12} /> Household
                </span>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#6B7280] hover:text-[#0E1116]">
            <X size={22} />
          </button>
        </div>

        {/* ---- Body --------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88C]">Contact</h3>
          <dl className="mt-2">
            <Row label="Email">
              {enrollment.email ? (
                <a href={`mailto:${enrollment.email}`} className="inline-flex items-center gap-2 font-medium underline underline-offset-2 hover:text-[#00A88C]">
                  <Mail size={14} color="#00A88C" /> {enrollment.email}
                </a>
              ) : <span className="text-[#6B7280]">—</span>}
            </Row>
            <Row label="Phone">
              {enrollment.phone ? (
                <a href={`tel:${String(enrollment.phone).replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-2 font-medium underline underline-offset-2 hover:text-[#00A88C]">
                  <Phone size={14} color="#00A88C" /> {enrollment.phone}
                </a>
              ) : <span className="text-[#6B7280]">—</span>}
            </Row>
            <Row label="Source">{enrollment.source || "New"}</Row>
          </dl>

          <h3 className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88C]">Plan</h3>
          <dl className="mt-2">
            <Row label="Tier">{tier ? tier.name : "—"}</Row>
            <Row label="Household Coverage">
              {household ? "Yes — +$15.00/month, one additional filer" : "No"}
            </Row>
            <Row label="Coverage Type">{coverageType(household)}</Row>
            <Row label="Monthly Rate">
              <span className="text-base font-extrabold tabular-nums">
                {total ? formatMonthly(total) : "—"}
              </span>
              {household && tier ? (
                <span className="ml-2 text-xs text-[#6B7280]">
                  ({tier.price.toFixed(2)} base + 15.00 add-on)
                </span>
              ) : null}
            </Row>
            <Row label="Enrollment Date">{formatDate(enrollment.enrolled_at)}</Row>
            <Row label="Coverage Activates">{formatDate(enrollment.coverage_activates)}</Row>
          </dl>

          <h3 className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88C]">Billing</h3>
          <dl className="mt-2">
            <Row label="Stripe Status">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill value={enrollment.stripe_status} map={STRIPE_STYLE} />
                {stripeDashboardUrl ? (
                  <a href={stripeDashboardUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00A88C] underline underline-offset-2">
                    Open in Stripe <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
              {!enrollment.stripe_status ? (
                <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                  Live status needs the webhook in functions/stripeWebhook.js. Until
                  it is deployed, use the IDs below to check Stripe directly.
                </p>
              ) : null}
            </Row>
            <Row label="Stripe Customer ID"><CopyableId value={enrollment.stripe_customer_id} /></Row>
            <Row label="Stripe Subscription ID"><CopyableId value={enrollment.stripe_subscription_id} /></Row>
          </dl>

          <h3 className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[#00A88C]">
            Signed agreement
          </h3>
          <dl className="mt-2">
            <Row label="Version (internal)">
              <span className="rounded bg-[#F5F5F0] px-2 py-1 font-mono text-xs font-bold">
                v{signedVersion}
              </span>
              <span className="ml-2 text-xs text-[#6B7280]">Firm reference only — never shown to the client.</span>
            </Row>
            <Row label="Signed">
              {enrollment.signed_at ? formatDate(enrollment.signed_at) : "—"}
              {enrollment.signature_name ? ` — ${enrollment.signature_name}` : ""}
            </Row>
            <Row label="Document">
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setShowAgreement((v) => !v)}
                        className="rounded-lg border border-[#6B7280]/30 px-3.5 py-2 text-xs font-bold hover:border-[#00A88C] hover:text-[#00A88C]">
                  {showAgreement ? "Hide agreement" : "View agreement"}
                </button>
                <button type="button" onClick={downloadFirmCopy}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0E1116] px-3.5 py-2 text-xs font-bold text-white hover:opacity-90">
                  <Download size={13} /> Download firm copy
                </button>
              </div>
            </Row>
          </dl>

          {showAgreement ? (
            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-[#6B7280]/25 bg-[#F5F5F0] p-5">
              <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                Subscription Agreement — internal v{signedVersion}
              </p>
              {SECTIONS.map((s) => (
                <div key={s.id} className="mb-5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-[#0E1116]">{s.heading}</h4>
                  {(s.body || []).map((p, i) => (
                    <p key={i} className="mt-2 text-xs leading-relaxed text-[#0E1116]/80">{p}</p>
                  ))}
                  {(s.bullets || []).map((b, i) => (
                    <p key={`b${i}`} className="mt-1.5 pl-4 text-xs leading-relaxed text-[#0E1116]/80">• {b}</p>
                  ))}
                  {(s.trailing || []).map((p, i) => (
                    <p key={`t${i}`} className="mt-2 text-xs leading-relaxed text-[#0E1116]/80">{p}</p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* ---- Footer actions ----------------------------------------- */}
        <div className="border-t border-[#6B7280]/20 px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-[#6B7280]">
                Set status
              </span>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={saving || enrollment.status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                    enrollment.status === s
                      ? "bg-[#0E1116] text-white"
                      : "border border-[#6B7280]/30 text-[#0E1116] hover:border-[#00A88C] hover:text-[#00A88C]"
                  } disabled:opacity-60`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onDelete(enrollment)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#6B7280]/30 px-3.5 py-2 text-xs font-bold text-[#6B7280] hover:border-[#0E1116] hover:text-[#0E1116]"
            >
              <Trash2 size={14} /> Delete record
            </button>
          </div>

          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-[#6B7280]">
            <CreditCard size={13} className="mt-0.5 flex-none" />
            Status here is your record of the relationship. It does not change
            anything in Stripe — cancel or refund there separately.
          </p>
        </div>
      </div>
    </div>
  );
}
