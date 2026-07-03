import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">El Libro Gordo</h1>
        <p className="mt-1 text-sm text-slate-500">Staff sign in · Acceso del personal</p>

        {error === "invalid" && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Invalid email or password.
          </p>
        )}
        {error === "not_staff" && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            This account is not an active staff account.
          </p>
        )}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
