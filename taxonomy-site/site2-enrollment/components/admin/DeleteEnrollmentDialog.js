/**
 * Delete confirmation dialog.
 * Base44 path: components/admin/DeleteEnrollmentDialog.js
 *
 * Deliberately separate from status changes. "Declined" and "Canceled" are
 * states a real client can be in; delete permanently removes the record and is
 * for test enrollments and duplicates only. The copy says so, and the operator
 * has to type the client's name to arm the button — a misclick cannot destroy a
 * signed agreement.
 */

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DeleteEnrollmentDialog({ enrollment, onCancel, onConfirm }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!enrollment) return null;

  const name = (enrollment.full_name || enrollment.email || "").trim();
  const armed = typed.trim().toLowerCase() === name.toLowerCase() && name.length > 0;

  async function confirm() {
    if (!armed || busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(enrollment);
    } catch (err) {
      console.error(err);
      setError("Could not delete that record. Nothing was removed — try again.");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0E1116]/70 p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#6B7280]/20 px-6 py-5">
          <div className="flex gap-3">
            <AlertTriangle size={22} color="#0E1116" strokeWidth={2} aria-hidden="true" />
            <h2 id="delete-title" className="text-base font-extrabold text-[#0E1116]">
              Delete this enrollment record
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancel"
            className="text-[#6B7280] hover:text-[#0E1116]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-[#6B7280]">
            This permanently removes{" "}
            <span className="font-bold text-[#0E1116]">{name || "this record"}</span>{" "}
            and the signed agreement stored with it. It cannot be undone.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
            If this is a real client who is leaving, set their status to{" "}
            <span className="font-semibold text-[#0E1116]">Canceled</span> or{" "}
            <span className="font-semibold text-[#0E1116]">Declined</span> instead
            — that keeps the record and the agreement on file.
          </p>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#0E1116]">
            Deleting from Stripe is a separate step
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[#6B7280]">
            This does not cancel their Stripe subscription. If one is active,
            cancel it in Stripe first or it will keep billing.
          </p>

          <label className="mt-5 block">
            <span className="text-xs font-semibold text-[#0E1116]">
              Type <span className="font-extrabold">{name}</span> to confirm
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-[#6B7280]/30 px-3.5 py-2.5 text-sm outline-none focus:border-[#0E1116] focus:ring-1 focus:ring-[#0E1116]"
            />
          </label>

          {error ? (
            <p role="alert" className="mt-3 text-xs font-semibold text-[#0E1116]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#6B7280]/20 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[#6B7280]/30 px-4 py-2.5 text-sm font-semibold text-[#0E1116] hover:border-[#0E1116] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!armed || busy}
            className="rounded-lg bg-[#0E1116] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
