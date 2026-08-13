"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyForm() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.[0];
    if (fErr || !totp) {
      router.replace("/mfa/enroll");
      return;
    }

    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (chErr) {
      setError(chErr.message);
      setBusy(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (vErr) {
      setError("Code didn't match. Try again.");
      setBusy(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 border-t-4 border-t-ink bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Two-factor code</h1>
        <p className="mt-2 text-sm text-slate">
          Enter the 6-digit code from your authenticator app.
        </p>

        {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

        <form onSubmit={verify} className="mt-6 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            autoFocus
            required
            className="num w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-sapphire focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90 disabled:opacity-50"
          >
            {busy ? "…" : "Verify"}
          </button>
        </form>
      </div>
    </main>
  );
}
