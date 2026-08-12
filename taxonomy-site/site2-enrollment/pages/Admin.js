/**
 * Admin dashboard.
 * Base44 path: pages/Admin.js
 *
 * Keeps the four summary cards and the searchable table, and adds the client
 * record view, real delete, and Stripe cross-reference.
 *
 * ENTITY — this assumes a Base44 entity named `Enrollment`. If yours is named
 * something else, change the import and the four call sites (list / update /
 * delete). Required fields are listed in ENTITY_SCHEMA.md.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Search, Eye, Trash2, RefreshCw, Users, AlertCircle } from "lucide-react";
import { Enrollment } from "@/entities/Enrollment";
import ClientDetailPanel, { StatusPill } from "@/components/admin/ClientDetailPanel";
import DeleteEnrollmentDialog from "@/components/admin/DeleteEnrollmentDialog";
import {
  getTier, monthlyTotal, formatMonthly, formatDate,
} from "@/components/config/planConfig";

/* ---------------------------------------------------------------------------
 * Display normalization — the fix for blank dashes in Client and Source.
 * A record always has *something* identifying it; fall through until we find it.
 * ------------------------------------------------------------------------ */

export function displayName(r) {
  const full = (r.full_name || "").trim();
  if (full) return full;
  const composed = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
  if (composed) return composed;
  if (r.signature_name) return String(r.signature_name).trim();
  if (r.email) return String(r.email).split("@")[0];
  return "Unnamed record";
}

/** Source defaults to "New" rather than rendering an empty cell. */
export function displaySource(r) {
  const s = (r.source || "").trim();
  return s || "New";
}

function isThisMonth(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-[#6B7280]/20 bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6B7280]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-[#0E1116]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#6B7280]">{hint}</p> : null}
    </div>
  );
}

export default function Admin() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await Enrollment.list("-created_date");
      setRecords(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setError("Could not load enrollments. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = records.filter((r) => r.status === "active").length;
    const pending = records.filter((r) => !r.status || r.status === "pending").length;
    const month = records.filter((r) => isThisMonth(r.enrolled_at || r.created_date)).length;
    const household = records.filter((r) => r.household_coverage).length;
    return { total: records.length, active, pending, month, household };
  }, [records]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (statusFilter !== "all" && (r.status || "pending") !== statusFilter) return false;
      if (!q) return true;
      return [
        displayName(r), r.email, r.phone, displaySource(r),
        r.stripe_customer_id, r.stripe_subscription_id,
        getTier(r.tier_id)?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [records, query, statusFilter]);

  async function updateRecord(id, patch) {
    await Enrollment.update(id, patch);
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }

  async function deleteRecord(record) {
    await Enrollment.delete(record.id);
    setRecords((prev) => prev.filter((r) => r.id !== record.id));
    setPendingDelete(null);
    setSelected((prev) => (prev && prev.id === record.id ? null : prev));
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1116]">
              Enrollments
            </h1>
            <p className="mt-1.5 text-sm text-[#6B7280]">
              Client records, agreement copies, and Stripe cross-reference.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-[#6B7280]/30 bg-white px-4 py-2.5 text-sm font-bold text-[#0E1116] hover:border-[#00A88C] hover:text-[#00A88C]"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ---- Summary cards ------------------------------------------ */}
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total Enrollments" value={stats.total} />
          <SummaryCard label="Active / Signed" value={stats.active} />
          <SummaryCard label="Pending Review" value={stats.pending} />
          <SummaryCard
            label="This Month"
            value={stats.month}
            hint={stats.household ? `${stats.household} with Household Coverage` : undefined}
          />
        </div>

        {/* ---- Controls ----------------------------------------------- */}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={17}
              color="#6B7280"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone, source, or Stripe ID"
              aria-label="Search enrollments"
              className="w-full rounded-lg border border-[#6B7280]/25 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#00A88C] focus:ring-1 focus:ring-[#00A88C]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "active", "pending", "canceled", "declined"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-[#0E1116] text-white"
                    : "border border-[#6B7280]/25 bg-white text-[#0E1116] hover:border-[#00A88C] hover:text-[#00A88C]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg border border-[#6B7280]/25 bg-white p-4 text-sm text-[#0E1116]">
            <AlertCircle size={17} /> {error}
          </p>
        ) : null}

        {/* ---- Table --------------------------------------------------- */}
        <div className="mt-5 overflow-hidden rounded-xl border border-[#6B7280]/20 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#6B7280]/20 bg-[#F5F5F0]">
                  {["Client", "Plan", "Rate", "Coverage", "Status", "Stripe", "Source", "Enrolled", ""].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#6B7280]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-[#6B7280]">Loading…</td></tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-[#6B7280]">
                      {records.length === 0 ? "No enrollments yet." : "No records match that search."}
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => {
                    const tier = getTier(r.tier_id);
                    const total = monthlyTotal(r.tier_id, r.household_coverage);
                    return (
                      <tr key={r.id} className="border-b border-[#6B7280]/12 last:border-0 hover:bg-[#F5F5F0]/60">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-[#0E1116]">{displayName(r)}</p>
                          <p className="text-xs text-[#6B7280]">{r.email || "no email on record"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#0E1116]">{tier ? tier.name : "—"}</td>
                        <td className="px-4 py-3.5 text-sm font-semibold tabular-nums text-[#0E1116]">
                          {total ? formatMonthly(total) : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          {r.household_coverage ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0E1116]">
                              <Users size={13} color="#00A88C" /> Household
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B7280]">Base</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5"><StatusPill value={r.status || "pending"} /></td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-[#6B7280]">
                            {r.stripe_status || (r.stripe_customer_id ? "ID on file" : "not linked")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#0E1116]">{displaySource(r)}</td>
                        <td className="px-4 py-3.5 text-xs text-[#6B7280]">
                          {formatDate(r.enrolled_at || r.created_date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelected(r)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#6B7280]/25 px-3 py-1.5 text-xs font-bold text-[#0E1116] hover:border-[#00A88C] hover:text-[#00A88C]"
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(r)}
                              aria-label={`Delete ${displayName(r)}`}
                              className="rounded-lg border border-[#6B7280]/25 p-1.5 text-[#6B7280] hover:border-[#0E1116] hover:text-[#0E1116]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#6B7280]">
          Showing {visible.length} of {records.length} records.
        </p>
      </div>

      {selected ? (
        <ClientDetailPanel
          enrollment={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateRecord}
          onDelete={(r) => setPendingDelete(r)}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteEnrollmentDialog
          enrollment={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={deleteRecord}
        />
      ) : null}
    </div>
  );
}
