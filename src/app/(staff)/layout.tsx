import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { signOut } from "@/app/login/actions";
import { toggleLocale } from "./actions";
import NavLink from "@/components/NavLink";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const { t } = await getDict();

  const nav = [
    { href: "/dashboard", label: t.dashboard },
    { href: "/clients", label: t.clients },
    { href: "/households", label: t.households },
    { href: "/links", label: t.links },
    { href: "/messages", label: t.messages },
    { href: "/reviews", label: t.reviews },
    { href: "/tasks", label: t.tasks },
    { href: "/export", label: t.export },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-ink text-paper">
        <div className="border-b border-white/10 p-4">
          <h1 className="font-display text-lg font-bold text-paper">El Libro Gordo</h1>
          <p className="truncate text-xs text-paper/50">
            {staff.full_name} · {staff.role}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <form action={toggleLocale}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-paper/60 hover:bg-white/5 hover:text-paper/90">
              🌐 {t.language}
            </button>
          </form>
          <form action={signOut}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-paper/60 hover:bg-white/5 hover:text-paper/90">
              {t.signOut}
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
