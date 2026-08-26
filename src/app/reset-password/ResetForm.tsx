"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page for the email reset link. The browser client exchanges the
 * recovery code in the URL for a session automatically; once that session
 * exists we let the user set a new password via auth.updateUser().
 */
export default function ResetForm() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Give detectSessionInUrl a moment to exchange the recovery code.
    const check = async (attempt: number) => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady("ok");
      } else if (attempt < 10) {
        setTimeout(() => check(attempt + 1), 300);
      } else {
        setReady("no-session");
      }
    };
    check(0);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    // Recovery sessions are AAL1; sign out so the normal login (+ 2FA) applies.
    await supabase.auth.signOut();
    router.replace("/login?reset=1");
  }

  const input =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 border-t-4 border-t-ink bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Set a new password</h1>

        {ready === "checking" && (
          <p className="mt-4 text-sm text-slate">Checking your reset link…</p>
        )}

        {ready === "no-session" && (
          <div className="mt-4 space-y-3">
            <p className="rounded-md bg-brick/5 p-3 text-sm text-brick">
              This reset link is invalid or has expired. Links also only work in the same
              browser where you requested them.
            </p>
            <Link href="/forgot-password" className="text-sm text-sapphire hover:underline">
              Request a new link →
            </Link>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <p className="rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate">
                New password (min. 8 characters)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-xs font-medium text-slate">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className={input}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
