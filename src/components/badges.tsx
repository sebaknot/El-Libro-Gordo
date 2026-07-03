const COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  canceled: "bg-slate-100 text-slate-600",
  medicare_transition: "bg-purple-100 text-purple-800",
  deceased: "bg-slate-200 text-slate-500",
  terminated: "bg-red-100 text-red-700",
  delinquent: "bg-red-100 text-red-700",
  open: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  dismissed: "bg-slate-100 text-slate-600",
};

export function STATUS_BADGE(status: string) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        COLORS[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
