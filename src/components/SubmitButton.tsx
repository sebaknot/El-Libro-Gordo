"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Form submit button with a pending state: while its form's server action
 * runs it disables itself and shows a small spinner. Must be rendered inside
 * (or via the `form` attribute, belong to) the form it submits.
 */
export default function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();

  const base =
    variant === "primary"
      ? "rounded-md bg-sapphire text-white hover:bg-sapphire/90"
      : variant === "danger"
        ? "rounded-md bg-brick text-white hover:bg-brick/90"
        : "rounded-md border border-slate-300 bg-white text-slate hover:bg-slate-50";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${base} ${className || "px-4 py-2 text-sm"}`}
    >
      {pending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
