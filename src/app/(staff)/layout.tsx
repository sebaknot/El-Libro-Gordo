import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { signOut } from "@/app/login/actions";
import { toggleLocale } from "./actions";
import NavLink from "@/components/NavLink";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const { t } = await getDict();

  const book = [
    { href: "/clients", label: t.clients, icon: "clients" },
    { href: "/households", label: t.households, icon: "households" },
    { href: "/links", label: t.links, icon: "links" },
    { href: "/reviews", label: t.reviews, icon: "reviews" },
    { href: "/messages", label: t.messages, icon: "messages" },
  ];
  const operations = [
    { href: "/campaigns", label: t.campaigns, icon: "campaigns" },
    { href: "/carriers", label: t.carriers, icon: "carriers" },
    { href: "/commissions", label: t.commissions, icon: "commissions" },
    { href: "/tasks", label: t.tasks, icon: "tasks" },
  ];

  const sectionHeader =
    "px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-widest text-slate";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-ink text-paper">
        <div className="border-b border-white/10 p-4">
          <h1 className="font-display text-lg font-bold text-paper">El Libro Gordo</h1>
          <p className="truncate text-xs text-paper/50">
            {staff.full_name} · {staff.role}
          </p>
        </div>
        <nav className="flex-1 p-3">
          <NavLink href="/dashboard" label={t.dashboard} icon="dashboard" />

          <p className={sectionHeader}>Book</p>
          <div className="space-y-1">
            {book.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <p className={`${sectionHeader} mt-2 border-t border-white/10`}>Operations</p>
          <div className="space-y-1">
            {operations.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3">
            <NavLink href="/export" label={t.export} icon="export" />
          </div>
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
