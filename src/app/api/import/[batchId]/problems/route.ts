import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n";
import { applyMapping } from "@/lib/import/grouping";
import { issueText, DUPLICATE_REASON_TEXT } from "@/lib/import/messages";
import { loadExistingSnapshot, readBatchPayload } from "@/lib/import/server";
import type { ReportRow } from "@/lib/import/run";
import { validateRows } from "@/lib/import/validate";

export const dynamic = "force-dynamic";

/** Neutralize CSV formula injection + quote the cell. */
function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+@\t\r-]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Problem-rows CSV (pre-import) or the full result report (?all=1, post-
 * import). PII-safe by construction: names + row numbers + friendly issue
 * text only — no SSNs (masked), no DOBs, so the file is safe to email around.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: staff } = await supabase
    .from("users")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!staff?.active || !["owner", "agent"].includes(staff.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const locale = await getLocale();
  const all = request.nextUrl.searchParams.get("all") === "1";

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, filename, sheet_name, status, mapping, report")
    .eq("id", batchId)
    .single();
  if (!batch) return NextResponse.json({ error: "not found" }, { status: 404 });

  const header = [
    locale === "es" ? "Fila" : "Row",
    locale === "es" ? "Nombre" : "Name",
    locale === "es" ? "Seguro social" : "SSN",
    locale === "es" ? "Estado" : "Status",
    locale === "es" ? "Notas" : "Notes",
  ];
  const lines: string[] = [header.map(csvCell).join(",")];

  if (batch.report) {
    // Post-import: serve the stored (already masked) report.
    const rows = (batch.report as ReportRow[]).filter(
      (r) => all || r.outcome === "failed" || r.issues.length > 0
    );
    for (const r of rows) {
      lines.push(
        [
          csvCell(r.row),
          csvCell(r.name),
          csvCell(r.ssn),
          csvCell(r.outcome),
          csvCell([r.note, ...r.issues.map((i) => issueText(i, locale))].filter(Boolean).join("; ")),
        ].join(",")
      );
    }
  } else if (batch.sheet_name && batch.mapping) {
    // Pre-import: recompute from the server-held payload.
    const read = await readBatchPayload(batchId);
    const sheet = read.ok ? read.payload.sheets[batch.sheet_name] : undefined;
    if (!sheet) return NextResponse.json({ error: "expired" }, { status: 410 });
    const snapshot = await loadExistingSnapshot();
    const mapped = applyMapping(sheet.rows, batch.mapping as Record<string, string>);
    const validated = validateRows(mapped, snapshot.clients, snapshot.policyNumbers);
    for (const r of validated) {
      if (!all && r.status !== "error" && r.status !== "warning" && r.status !== "duplicate") continue;
      const dupNote = r.duplicate
        ? (DUPLICATE_REASON_TEXT[r.duplicate.reason]?.[locale] ?? r.duplicate.reason)
        : null;
      lines.push(
        [
          csvCell(r.row),
          csvCell(`${r.clean.first_name ?? ""} ${r.clean.last_name ?? ""}`.trim() || "—"),
          csvCell(r.clean.ssn_last4 ? `***-**-${r.clean.ssn_last4}` : "—"),
          csvCell(r.status),
          csvCell([dupNote, ...r.issues.map((i) => issueText(i, locale))].filter(Boolean).join("; ")),
        ].join(",")
      );
    }
  } else {
    return NextResponse.json({ error: "not ready" }, { status: 409 });
  }

  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="import-${all ? "report" : "problems"}.csv"`,
    },
  });
}
