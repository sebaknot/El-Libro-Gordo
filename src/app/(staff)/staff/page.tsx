import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { STATUS_BADGE } from "@/components/badges";
import SubmitButton from "@/components/SubmitButton";
import { setStaffActive, setStaffPassword } from "./actions";

const input =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string; error?: string; done?: string }>;
}) {
  const owner = await requireRole(["owner"]);
  const { pw, error, done } = await searchParams;
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: staff } = await supabase
    .from("users")
    .select("id, full_name, email, role, active, totp_enabled")
    .order("full_name");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{t.staff}</h1>
      <p className="mt-1 text-sm text-slate">
        Accounts, roles, and passwords. New accounts are created with the{" "}
        <code className="rounded bg-slate-100 px-1">staff:create</code> script; passwords set
        here take effect immediately, no email involved.
      </p>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}
      {done === "password" && (
        <p className="mt-4 rounded-md bg-sage/10 p-3 text-sm text-sage">
          ✓ Password updated — it works on their next sign-in.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">2FA</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">
                  {u.full_name}
                  {u.id === owner.id && <span className="ml-2 text-xs text-slate-400">you</span>}
                </td>
                <td className="px-4 py-2.5 text-slate">{u.email}</td>
                <td className="px-4 py-2.5">{u.role}</td>
                <td className="px-4 py-2.5">{u.totp_enabled ? "✓" : "—"}</td>
                <td className="px-4 py-2.5">{STATUS_BADGE(u.active ? "active" : "inactive")}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={pw === u.id ? "/staff" : `/staff?pw=${u.id}`}
                      className="text-xs font-medium text-sapphire hover:underline"
                    >
                      {pw === u.id ? "Cancel" : "Set new password"}
                    </Link>
                    {u.id !== owner.id && (
                      <form action={setStaffActive.bind(null, u.id, !u.active)}>
                        <SubmitButton variant="secondary" className="px-2.5 py-1 text-xs">
                          {u.active ? "Deactivate" : "Activate"}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pw &&
        (staff ?? [])
          .filter((u) => u.id === pw)
          .map((u) => (
            <form
              key={u.id}
              action={setStaffPassword.bind(null, u.id)}
              className="mt-4 rounded-lg border border-sapphire/30 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-semibold">
                Set a new password for {u.full_name}
              </h2>
              <p className="mt-1 text-xs text-slate">
                Takes effect immediately. Tell them in person or over a call — don&apos;t text
                passwords.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="New password (min. 8 characters)"
                  autoComplete="new-password"
                  className={`${input} min-w-56`}
                />
                <input
                  type="password"
                  name="confirm"
                  required
                  minLength={8}
                  placeholder="Confirm"
                  autoComplete="new-password"
                  className={`${input} min-w-40`}
                />
                <SubmitButton>Set password</SubmitButton>
              </div>
            </form>
          ))}
    </div>
  );
}
