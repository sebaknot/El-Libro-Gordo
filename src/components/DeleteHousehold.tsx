"use client";

import { useState } from "react";
import { deleteHousehold } from "@/app/(staff)/households/actions";

/**
 * Owner-only danger zone: the delete button stays disabled until the staff
 * member types the household's exact name. The server action re-verifies both
 * the name and the owner role — this component is just the seatbelt.
 */
export default function DeleteHousehold({
  householdId,
  householdName,
}: {
  householdId: string;
  householdName: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const match = typed === householdName;

  return (
    <section className="mt-10 rounded-lg border border-brick/30 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-brick">Danger zone</h2>
      {!open ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate">
            Permanently delete this household, its members, policies, documents, notes,
            messages, links, and tasks. Audit history is kept.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-brick/40 bg-brick/5 px-4 py-2 text-sm font-medium text-brick hover:bg-brick/10"
          >
            Delete this household…
          </button>
        </div>
      ) : (
        <form action={deleteHousehold.bind(null, householdId)} className="mt-2">
          <p className="text-sm text-slate">
            This cannot be undone. Type <strong className="text-ink">{householdName}</strong>{" "}
            to confirm:
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              name="confirm_name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={householdName}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brick focus:outline-none"
            />
            <button
              type="submit"
              disabled={!match}
              className="rounded-md bg-brick px-4 py-2 text-sm font-semibold text-white hover:bg-brick/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete permanently
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
