"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate hover:bg-slate-50"
    >
      {copied ? "✓" : label}
    </button>
  );
}
