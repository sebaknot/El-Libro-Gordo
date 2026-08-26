import Link from "next/link";
import { sendPasswordReset } from "./actions";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 border-t-4 border-t-ink bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-slate">
          Enter your staff email and we&apos;ll send you a reset link.
        </p>

        {sent === "1" ? (
          <p className="mt-6 rounded-md bg-sage/10 p-3 text-sm text-sage">
            If that email belongs to a staff account, a reset link is on its way. Check
            your inbox (and spam folder).
          </p>
        ) : (
          <form action={sendPasswordReset} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-sapphire hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
