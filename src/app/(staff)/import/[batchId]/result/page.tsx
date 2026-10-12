import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { requireImportAccess } from "@/lib/import/server";
import { issueText } from "@/lib/import/messages";
import type { ReportRow } from "@/lib/import/run";
import type { IssueCode } from "@/lib/import/types";

const COPY = {
  en: {
    title: "Import finished",
    created: "Clients created",
    households: "Households created",
    policies: "Policies created",
    updated: "Clients updated",
    skipped: "Skipped (duplicates)",
    failed: "Unusable rows",
    report: "Download full report (CSV)",
    note: "Clients missing a phone or date of birth were imported and flagged — you'll find them under Tasks as data cleanup.",
    goClients: "Go to clients",
    goHistory: "Past imports (and undo)",
    detailTitle: "Row-by-row detail",
    row: "Row",
    name: "Name",
    outcome: "Result",
    ssn: "SSN",
    notes: "Notes",
  },
  es: {
    title: "Importación terminada",
    created: "Clientes creados",
    households: "Hogares creados",
    policies: "Pólizas creadas",
    updated: "Clientes actualizados",
    skipped: "Omitidos (duplicados)",
    failed: "Filas inutilizables",
    report: "Descargar informe completo (CSV)",
    note: "Los clientes sin teléfono o fecha de nacimiento se importaron y quedaron marcados — los encontrará en Tareas como limpieza de datos.",
    goClients: "Ir a clientes",
    goHistory: "Importaciones anteriores (y deshacer)",
    detailTitle: "Detalle fila por fila",
    row: "Fila",
    name: "Nombre",
    outcome: "Resultado",
    ssn: "Seguro social",
    notes: "Notas",
  },
};

const OUTCOME_PILL: Record<string, string> = {
  created: "bg-sage/15 text-sage",
  updated: "bg-sapphire/10 text-sapphire",
  skipped: "bg-slate/10 text-slate",
  failed: "bg-brick/10 text-brick",
};

export default async function ImportResultPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  await requireImportAccess();
  const { batchId } = await params;
  const { locale } = await getDict();
  const t = COPY[locale];
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("*")
    .eq("id", batchId)
    .single();
  if (!batch || !["imported", "undone"].includes(batch.status)) notFound();

  const report = (batch.report ?? []) as ReportRow[];
  const stats = [
    { label: t.created, value: batch.created_clients },
    { label: t.households, value: batch.created_households },
    { label: t.policies, value: batch.created_policies },
    { label: t.updated, value: batch.updated_clients },
    { label: t.skipped, value: batch.skipped_rows },
    { label: t.failed, value: batch.error_rows },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">✅ {t.title}</h1>
      <p className="mt-1 text-sm text-slate">{batch.filename}</p>

      <div className="mt-6 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate">{s.label}</p>
            <p className="num mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {batch.warning_rows > 0 && (
        <p className="mt-4 rounded-md bg-amber-600/10 p-3 text-sm text-amber-700">⚠️ {t.note}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <a href={`/api/import/${batchId}/problems?all=1`} className="font-medium text-sapphire hover:underline">
          ⬇ {t.report}
        </a>
        <Link href="/clients" className="text-sapphire hover:underline">
          {t.goClients} →
        </Link>
        <Link href="/import/history" className="text-sapphire hover:underline">
          {t.goHistory} →
        </Link>
      </div>

      {report.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">{t.detailTitle}</h2>
          <div className="mt-3 max-h-[32rem] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-3 py-2.5">{t.row}</th>
                  <th className="px-3 py-2.5">{t.name}</th>
                  <th className="px-3 py-2.5">{t.ssn}</th>
                  <th className="px-3 py-2.5">{t.outcome}</th>
                  <th className="px-3 py-2.5">{t.notes}</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.row} className="border-b border-slate-100 last:border-0">
                    <td className="num px-3 py-2 text-slate-400">{r.row}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="num px-3 py-2 text-slate">{r.ssn}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_PILL[r.outcome]}`}>
                        {r.outcome}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate">
                      {[r.note, ...r.issues.map((i) => issueText(i as IssueCode, locale))]
                        .filter(Boolean)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
