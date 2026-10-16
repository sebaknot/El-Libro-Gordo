import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { applyMapping, groupHouseholds } from "@/lib/import/grouping";
import { maskSsn } from "@/lib/import/parse";
import { DUPLICATE_REASON_TEXT, issueText } from "@/lib/import/messages";
import { loadExistingSnapshot, readBatchPayload, requireImportAccess } from "@/lib/import/server";
import { validateRows } from "@/lib/import/validate";
import SubmitButton from "@/components/SubmitButton";
import { executeImport } from "../../actions";

const PAGE_SIZE = 50;

const COPY = {
  en: {
    title: "Check before importing",
    nothingYet: "Nothing has been saved yet — review below, then press Import.",
    rows: "Rows read",
    newClients: "New clients",
    duplicates: "Duplicates",
    households: "Households",
    problems: "Rows with notes",
    unusable: "Unusable rows",
    duplicatesTitle: "What should we do with duplicates?",
    modeSkip: "Skip them (recommended)",
    modeUpdate: "Update existing clients — only fill in blanks, never overwrite",
    modeNew: "Import them as new clients anyway",
    row: "Row",
    name: "Name",
    phone: "Phone",
    email: "Email",
    dobCol: "DOB",
    ssnCol: "SSN",
    status: "Status",
    notes: "Notes",
    statusNew: "New",
    statusDup: "Duplicate",
    statusWarn: "Warning",
    statusError: "Error",
    dupDb: "already in the system",
    dupFile: "repeated in this file (row {row})",
    problemCsv: "Download problem rows (CSV)",
    importBtn: "Import now",
    importing: "Importing… this can take a minute for big files.",
    expired:
      "This upload expired (uploads are kept for 30 minutes for privacy). Please upload the file again.",
    backMap: "← Back to column matching",
    page: "Page",
    of: "of",
    errors: {
      not_ready: "This upload isn't ready to import — check the column matching first.",
      expired: "This upload expired. Please upload the file again.",
      missing_function:
        "The database is missing the import functions — run supabase/migrations/0003_import_batches.sql in the Supabase SQL editor.",
      server_config:
        "The server is missing SSN_ENCRYPTION_KEY — add it in Vercel's environment variables and redeploy.",
      error: "The upload couldn't be read back. The server log has the exact reason.",
      import_failed:
        "The import hit a problem partway and everything it had created was removed — nothing partial was saved. Try again, and if it keeps failing, send us the file.",
    } as Record<string, string>,
  },
  es: {
    title: "Revisar antes de importar",
    nothingYet: "Todavía no se guardó nada — revise abajo y luego presione Importar.",
    rows: "Filas leídas",
    newClients: "Clientes nuevos",
    duplicates: "Duplicados",
    households: "Hogares",
    problems: "Filas con notas",
    unusable: "Filas inutilizables",
    duplicatesTitle: "¿Qué hacemos con los duplicados?",
    modeSkip: "Omitirlos (recomendado)",
    modeUpdate: "Actualizar clientes existentes — solo llenar espacios en blanco, nunca sobrescribir",
    modeNew: "Importarlos como clientes nuevos de todos modos",
    row: "Fila",
    name: "Nombre",
    phone: "Teléfono",
    email: "Correo",
    dobCol: "F. de nac.",
    ssnCol: "Seguro social",
    status: "Estado",
    notes: "Notas",
    statusNew: "Nuevo",
    statusDup: "Duplicado",
    statusWarn: "Aviso",
    statusError: "Error",
    dupDb: "ya está en el sistema",
    dupFile: "repetido en este archivo (fila {row})",
    problemCsv: "Descargar filas con problemas (CSV)",
    importBtn: "Importar ahora",
    importing: "Importando… puede tardar un minuto con archivos grandes.",
    expired:
      "Esta subida venció (se guardan 30 minutos por privacidad). Vuelva a subir el archivo.",
    backMap: "← Volver al emparejado de columnas",
    page: "Página",
    of: "de",
    errors: {
      not_ready: "Esta subida no está lista — revise primero el emparejado de columnas.",
      expired: "Esta subida venció. Vuelva a subir el archivo.",
      missing_function:
        "A la base de datos le faltan las funciones de importación — ejecute supabase/migrations/0003_import_batches.sql en el editor SQL de Supabase.",
      server_config:
        "Al servidor le falta SSN_ENCRYPTION_KEY — agréguela en las variables de entorno de Vercel y vuelva a desplegar.",
      error: "No se pudo leer la subida. El registro del servidor tiene la razón exacta.",
      import_failed:
        "La importación falló a medias y todo lo que había creado fue eliminado — no quedó nada a medias. Intente de nuevo y, si sigue fallando, envíenos el archivo.",
    } as Record<string, string>,
  },
};

const STATUS_PILL: Record<string, string> = {
  new: "bg-sage/15 text-sage",
  duplicate: "bg-sapphire/10 text-sapphire",
  warning: "bg-amber-600/15 text-amber-700",
  error: "bg-brick/10 text-brick",
};

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ page?: string; error?: string }>;
}) {
  await requireImportAccess();
  const { batchId } = await params;
  const sp = await searchParams;
  const { locale } = await getDict();
  const t = COPY[locale];
  const supabase = await createClient();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, filename, sheet_name, status, mapping")
    .eq("id", batchId)
    .single();
  if (!batch || !["mapped", "importing"].includes(batch.status) || !batch.mapping || !batch.sheet_name) {
    notFound();
  }

  const read = await readBatchPayload(batchId);
  if (!read.ok || !read.payload.sheets[batch.sheet_name]) {
    const reason = read.ok ? "expired" : read.reason;
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">
          {t.errors[reason] ?? t.errors.expired}
        </p>
        <p className="mt-4">
          <Link href="/import" className="text-sm text-sapphire hover:underline">
            ← {t.backMap}
          </Link>
        </p>
      </div>
    );
  }
  const payload = read.payload;

  // Server-side validation — this exact computation re-runs at import time.
  const snapshot = await loadExistingSnapshot();
  const mapped = applyMapping(
    payload.sheets[batch.sheet_name].rows,
    batch.mapping as Record<string, string>
  );
  const validated = validateRows(mapped, snapshot.clients, snapshot.policyNumbers);

  const counts = {
    total: validated.length,
    new: validated.filter((r) => r.status === "new").length,
    dup: validated.filter((r) => r.status === "duplicate").length,
    warn: validated.filter((r) => r.status === "warning").length,
    error: validated.filter((r) => r.status === "error").length,
    households: groupHouseholds(validated).size,
  };

  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(validated.length / PAGE_SIZE));
  const pageRows = validated.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusLabel = { new: t.statusNew, duplicate: t.statusDup, warning: t.statusWarn, error: t.statusError };
  const stats = [
    { label: t.rows, value: counts.total },
    { label: t.newClients, value: counts.new + counts.warn },
    { label: t.duplicates, value: counts.dup },
    { label: t.households, value: counts.households },
    { label: t.problems, value: counts.warn },
    { label: t.unusable, value: counts.error },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link href={`/import/${batchId}/map`} className="text-sm text-sapphire hover:underline">
          {t.backMap}
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate">
        {batch.filename} · {t.nothingYet}
      </p>

      {sp.error && (
        <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">
          {t.errors[sp.error] ?? t.errors.not_ready}
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate">{s.label}</p>
            <p className="num mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <form action={executeImport.bind(null, batchId)} className="mt-6 rounded-lg border border-sapphire/30 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold">{t.duplicatesTitle}</h2>
        <div className="mt-2 space-y-1.5 text-sm">
          {(
            [
              ["skip", t.modeSkip],
              ["update", t.modeUpdate],
              ["import_new", t.modeNew],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-start gap-2">
              <input
                type="radio"
                name="duplicate_mode"
                value={value}
                defaultChecked={value === "skip"}
                className="mt-1"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <a
            href={`/api/import/${batchId}/problems`}
            className="text-sm font-medium text-sapphire hover:underline"
          >
            ⬇ {t.problemCsv}
          </a>
          <div className="text-right">
            <SubmitButton className="px-6 py-2.5 text-sm">{t.importBtn}</SubmitButton>
            <p className="mt-1 text-xs text-slate-400">{t.importing}</p>
          </div>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-3 py-2.5">{t.row}</th>
              <th className="px-3 py-2.5">{t.name}</th>
              <th className="px-3 py-2.5">{t.phone}</th>
              <th className="px-3 py-2.5">{t.dobCol}</th>
              <th className="px-3 py-2.5">{t.ssnCol}</th>
              <th className="px-3 py-2.5">{t.status}</th>
              <th className="px-3 py-2.5">{t.notes}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const dupNote = r.duplicate
                ? `${DUPLICATE_REASON_TEXT[r.duplicate.reason]?.[locale] ?? r.duplicate.reason} — ${
                    r.duplicate.kind === "db"
                      ? t.dupDb
                      : t.dupFile.replace("{row}", String(r.duplicate.row))
                  }`
                : null;
              return (
                <tr key={r.row} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="num px-3 py-2 text-slate-400">{r.row}</td>
                  <td className="px-3 py-2 font-medium">
                    {r.clean.first_name ?? "—"} {r.clean.last_name ?? ""}
                  </td>
                  <td className="num px-3 py-2 text-slate">{r.clean.phone ?? "—"}</td>
                  {/* DOB is deliberately shown as present/absent only — never the value. */}
                  <td className="px-3 py-2">{r.clean.dob ? "✓" : "—"}</td>
                  <td className="num px-3 py-2 text-slate">{maskSsn(r.clean.ssn_last4)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate">
                    {[dupNote, ...r.issues.map((i) => issueText(i, locale))]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/import/${batchId}/preview?page=${page - 1}`} className="text-sapphire hover:underline">
              ←
            </Link>
          )}
          <span className="text-slate">
            {t.page} <span className="num">{page}</span> {t.of} <span className="num">{pages}</span>
          </span>
          {page < pages && (
            <Link href={`/import/${batchId}/preview?page=${page + 1}`} className="text-sapphire hover:underline">
              →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
