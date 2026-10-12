import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { requireImportAccess } from "@/lib/import/server";
import { STATUS_BADGE } from "@/components/badges";
import EmptyState from "@/components/EmptyState";
import UndoImportButton from "@/components/UndoImportButton";

const COPY = {
  en: {
    title: "Past imports",
    newImport: "+ New import",
    file: "File",
    when: "When",
    by: "By",
    created: "Created",
    updated: "Updated",
    skipped: "Skipped",
    status: "Status",
    undone: "✓ Import undone. Records created by it (and untouched since) were removed; anything edited by a person was kept.",
    undo: "Undo this import…",
    confirmText:
      "Delete everything this import created? Records edited by a person since are kept. This cannot be re-done.",
    yes: "Yes, undo it",
    no: "Cancel",
    empty: "No imports yet.",
    createdCell: (c: number, h: number, p: number) => `${c} clients · ${h} households · ${p} policies`,
  },
  es: {
    title: "Importaciones anteriores",
    newImport: "+ Nueva importación",
    file: "Archivo",
    when: "Cuándo",
    by: "Por",
    created: "Creados",
    updated: "Actualizados",
    skipped: "Omitidos",
    status: "Estado",
    undone: "✓ Importación deshecha. Se eliminaron los registros que creó (y nadie tocó); lo editado por una persona se conservó.",
    undo: "Deshacer esta importación…",
    confirmText:
      "¿Eliminar todo lo que creó esta importación? Lo que una persona editó después se conserva. Esto no se puede rehacer.",
    yes: "Sí, deshacer",
    no: "Cancelar",
    empty: "Aún no hay importaciones.",
    createdCell: (c: number, h: number, p: number) => `${c} clientes · ${h} hogares · ${p} pólizas`,
  },
};

export default async function ImportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; undone?: string }>;
}) {
  const staff = await requireImportAccess();
  const { error, undone } = await searchParams;
  const { locale } = await getDict();
  const t = COPY[locale];
  const supabase = await createClient();

  const { data: batches } = await supabase
    .from("import_batches")
    .select(
      "id, created_at, filename, status, row_count, created_clients, created_households, created_policies, updated_clients, skipped_rows, error_rows, users!import_batches_uploaded_by_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-4xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link
          href="/import"
          className="rounded-md bg-sapphire px-4 py-2 text-sm font-semibold text-white hover:bg-sapphire/90"
        >
          {t.newImport}
        </Link>
      </div>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}
      {undone === "1" && <p className="mt-4 rounded-md bg-sage/10 p-3 text-sm text-sage">{t.undone}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-4 py-2.5">{t.file}</th>
              <th className="px-4 py-2.5">{t.when}</th>
              <th className="px-4 py-2.5">{t.by}</th>
              <th className="px-4 py-2.5">{t.created}</th>
              <th className="px-4 py-2.5 text-right">{t.updated}</th>
              <th className="px-4 py-2.5 text-right">{t.skipped}</th>
              <th className="px-4 py-2.5">{t.status}</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {(batches ?? []).map((b) => {
              const uploader = b.users as unknown as { full_name: string } | null;
              return (
                <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium">
                    {["imported", "undone"].includes(b.status) ? (
                      <Link href={`/import/${b.id}/result`} className="text-sapphire hover:underline">
                        {b.filename}
                      </Link>
                    ) : (
                      b.filename
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-slate">{uploader?.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate">
                    {t.createdCell(b.created_clients, b.created_households, b.created_policies)}
                  </td>
                  <td className="num px-4 py-2.5 text-right">{b.updated_clients}</td>
                  <td className="num px-4 py-2.5 text-right">{b.skipped_rows}</td>
                  <td className="px-4 py-2.5">{STATUS_BADGE(b.status)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {b.status === "imported" && staff.role === "owner" && (
                      <UndoImportButton
                        batchId={b.id}
                        labels={{ undo: t.undo, confirmText: t.confirmText, yes: t.yes, no: t.no }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {(!batches || batches.length === 0) && (
              <tr>
                <td colSpan={8}>
                  <EmptyState icon={FileSpreadsheet} message={t.empty} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
