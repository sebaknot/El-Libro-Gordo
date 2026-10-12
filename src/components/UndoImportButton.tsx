"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { undoImport } from "@/app/(staff)/import/actions";

/**
 * Owner-only undo with an explicit confirmation step. The server (and the
 * database function itself) re-check the owner role; this is just the UI.
 */
export default function UndoImportButton({
  batchId,
  labels,
}: {
  batchId: string;
  labels: { undo: string; confirmText: string; yes: string; no: string };
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-brick/40 bg-brick/5 px-3 py-1.5 text-xs font-medium text-brick hover:bg-brick/10"
      >
        {labels.undo}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="max-w-72 text-brick">{labels.confirmText}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await undoImport(batchId);
        }}
        className="inline-flex items-center gap-1 rounded-md bg-brick px-3 py-1.5 font-semibold text-white hover:bg-brick/90 disabled:opacity-50"
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
