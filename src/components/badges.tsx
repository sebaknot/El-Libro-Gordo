/**
 * Status badges: pill shape, tinted background (10–15% of the semantic
 * color), solid color text. Sage = success/active, brick = error,
 * sapphire = informational/in-progress, slate = neutral/inactive,
 * amber = needs attention.
 */
const COLORS: Record<string, string> = {
  active: "bg-sage/15 text-sage",
  done: "bg-sage/15 text-sage",
  pending: "bg-amber-600/15 text-amber-700",
  delinquent: "bg-amber-600/15 text-amber-700",
  medicare_transition: "bg-sapphire/10 text-sapphire",
  open: "bg-sapphire/10 text-sapphire",
  used: "bg-sapphire/10 text-sapphire",
  terminated: "bg-brick/10 text-brick",
  locked: "bg-brick/10 text-brick",
  canceled: "bg-slate/10 text-slate",
  deceased: "bg-slate/15 text-slate",
  dismissed: "bg-slate/10 text-slate",
  expired: "bg-slate/10 text-slate",
};

export function STATUS_BADGE(status: string) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        COLORS[status] ?? "bg-slate/10 text-slate"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
