"use client";

import { useState } from "react";
import { revealSsn } from "@/app/(staff)/clients/actions";

/** Audited SSN reveal — every click writes an audit_log row server-side. */
export default function SsnReveal({ clientId }: { clientId: string }) {
  const [ssn, setSsn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setBusy(true);
    const value = await revealSsn(clientId);
    setSsn(value ?? "unavailable");
    setBusy(false);
    setTimeout(() => setSsn(null), 30_000); // auto-hide after 30s
  }

  if (ssn) {
    return (
      <span className="rounded bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700">
        {ssn.length === 9 ? `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5)}` : ssn}
      </span>
    );
  }
  return (
    <button
      onClick={reveal}
      disabled={busy}
      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      title="Reveals the full SSN. This action is logged."
    >
      {busy ? "…" : "reveal (logged)"}
    </button>
  );
}
