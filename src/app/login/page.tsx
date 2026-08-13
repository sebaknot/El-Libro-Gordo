import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 border-t-4 border-t-ink bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">El Libro Gordo</h1>
        <p className="mt-1 text-sm text-slate">Staff sign in · Acceso del personal</p>

        {error === "invalid" && (
          <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">
            Invalid email or password.
          </p>
        )}
        {error === "not_staff" && (
          <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">
            This account is not an active staff account.
          </p>
        )}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
