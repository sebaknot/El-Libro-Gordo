import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { signOut } from "@/app/login/actions";
import { toggleLocale } from "./actions";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const { t } = await getDict();

  const nav = [
    { href: "/dashboard", label: t.dashboard },
    { href: "/clients", label: t.clients },
    { href: "/households", label: t.households },
    { href: "/tasks", label: t.tasks },
    { href: "/export", label: t.export },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h1 className="text-lg font-bold">El Libro Gordo</h1>
          <p className="truncate text-xs text-slate-500">
            {staff.full_name} · {staff.role}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-slate-200 p-3">
          <form action={toggleLocale}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">
              🌐 {t.language}
            </button>
          </form>
          <form action={signOut}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100">
              {t.signOut}
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
