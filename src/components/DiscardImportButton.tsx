"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { discardImport } from "@/app/(staff)/import/actions";

/** Confirm-gated discard for stuck batches (owner/agent; server re-checks). */
export default function DiscardImportButton({
  batchId,
  labels,
}: {
  batchId: string;
  labels: { discard: string; confirmText: string; yes: string; no: string };
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate hover:bg-slate-50"
      >
        {labels.discard}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="max-w-72 text-slate">{labels.confirmText}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await discardImport(batchId);
        }}
        className="inline-flex items-center gap-1 rounded-md bg-slate px-3 py-1.5 font-semibold text-white hover:bg-slate/90 disabled:opacity-50"
      >
        {busy && <Loader2 aria-hidden className="h-3 w-3 animate-spin" />}
        {labels.yes}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate hover:bg-slate-50"
      >
        {labels.no}
      </button>
    </span>
  );
}
