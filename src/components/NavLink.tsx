"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar nav item. The active page gets a small left-edge tab in sapphire —
 * a nod to the index tabs of a physical ledger book.
 */
export default function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative block rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-white/5 text-paper"
          : "text-paper/60 hover:bg-white/5 hover:text-paper/90"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-sapphire"
        />
      )}
      {label}
    </Link>
  );
}
