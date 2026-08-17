import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Centered empty state: muted icon, message, optional call-to-action. */
export default function EmptyState({
  icon: Icon,
  message,
  ctaHref,
  ctaLabel,
}: {
  icon: LucideIcon;
  message: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <Icon aria-hidden className="h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">{message}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
