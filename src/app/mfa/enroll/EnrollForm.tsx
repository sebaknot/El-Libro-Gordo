"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EnrollForm() {
  const router = useRouter();
  const supabase = createClient();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Clean up any unverified factor from an abandoned enrollment.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const stale = factors?.all?.find((f) => f.status === "unverified");
      if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (error) {
        setError(error.message);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);

    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) {
      setError(chErr.message);
      setBusy(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (vErr) {
      setError("Code didn't match. Try again with the current code from your app.");
      setBusy(false);
      return;
    }
    await fetch("/mfa/complete", { method: "POST" });
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Set up two-factor authentication</h1>
        <p className="mt-2 text-sm text-slate-600">
          2FA is required for all staff accounts. Scan the QR code with Google Authenticator,
          1Password, or any TOTP app, then enter the 6-digit code.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {qr && (
          <div className="mt-6 flex flex-col items-center gap-3">
            {/* Supabase returns the QR as an SVG data URI */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="TOTP QR code" className="h-44 w-44 rounded border border-slate-200" />
            {secret && (
              <p className="text-xs text-slate-500">
                Manual key: <code className="rounded bg-slate-100 px-1">{secret}</code>
              </p>
            )}
          </div>
        )}

        <form onSubmit={verify} className="mt-6 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !factorId}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "…" : "Verify"}
          </button>
        </form>
      </div>
    </main>
  );
}
