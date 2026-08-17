"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  ClipboardCheck,
  DollarSign,
  Download,
  Home,
  LayoutDashboard,
  Link as LinkIcon,
  MessageSquare,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

// Icon names cross the server→client boundary as strings; components can't.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  clients: Users,
  households: Home,
  links: LinkIcon,
  messages: MessageSquare,
  reviews: ClipboardCheck,
  campaigns: Target,
  carriers: Building2,
  commissions: DollarSign,
  tasks: CheckSquare,
  export: Download,
};

/**
 * Sidebar nav item. The active page gets a small left-edge tab in sapphire —
 * a nod to the index tabs of a physical ledger book.
 */
export default function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const Icon = icon ? ICONS[icon] : undefined;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
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
      {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 opacity-80" />}
      {label}
    </Link>
  );
}
