import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { detectMapping, PLATFORM_FIELDS } from "@/lib/import/columns";
import { readBatchPayload, requireImportAccess } from "@/lib/import/server";
import type { ColumnMapping } from "@/lib/import/types";
import SubmitButton from "@/components/SubmitButton";
import { FIELD_LABELS } from "../../field-labels";
import { saveMapping } from "../../actions";

const COPY = {
  en: {
    title: "Match the columns",
    intro:
      "We guessed which column is which. Check the guesses, fix anything wrong, and set columns you don't want to Ignore.",
    sheet: "Sheet",
    useSheet: "Use this sheet",
    column: "Spreadsheet column",
    becomes: "Becomes",
    sample: "First value",
    ignore: "Ignore this column",
    needNames: "First name and Last name must both be matched to continue.",
    saveAs: "Remember this mapping as (optional):",
    savedMapping: "Use a saved mapping",
    none: "— none —",
    continue: "Continue to preview",
    expired:
      "This upload expired (uploads are kept for 30 minutes for privacy). Please upload the file again.",
    back: "← Upload a different file",
    tooBig: "This sheet has more than 5,000 rows and can't be used.",
  },
  es: {
    title: "Emparejar las columnas",
    intro:
      "Adivinamos qué columna es cada cosa. Revise, corrija lo que esté mal, y marque Ignorar en las columnas que no quiera.",
    sheet: "Hoja",
    useSheet: "Usar esta hoja",
    column: "Columna del archivo",
    becomes: "Se convierte en",
    sample: "Primer valor",
    ignore: "Ignorar esta columna",
    needNames: "Nombre y Apellido deben estar emparejados para continuar.",
    saveAs: "Recordar este emparejamiento como (opcional):",
    savedMapping: "Usar un emparejamiento guardado",
    none: "— ninguno —",
    continue: "Continuar a la vista previa",
    expired:
      "Esta subida venció (se guardan 30 minutos por privacidad). Vuelva a subir el archivo.",
    back: "← Subir otro archivo",
    tooBig: "Esta hoja tiene más de 5,000 filas y no se puede usar.",
  },
};

export default async function MapColumnsPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ error?: string; sheet?: string; use_mapping?: string }>;
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
  if (!batch || !["uploaded", "mapped"].includes(batch.status)) notFound();

  const payload = await readBatchPayload(batchId);

  if (!payload) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{t.expired}</p>
        <p className="mt-4">
          <Link href="/import" className="text-sm text-sapphire hover:underline">
            {t.back}
          </Link>
        </p>
      </div>
    );
  }

  const sheetNames = Object.keys(payload.sheets);
  const sheetName =
    sp.sheet && payload.sheets[sp.sheet]
      ? sp.sheet
      : (batch.sheet_name ?? sheetNames.find((s) => !payload.sheets[s].overLimit) ?? sheetNames[0]);
  const sheet = payload.sheets[sheetName];

  // Saved mappings for repeat uploads.
  const { data: savedMappings } = await supabase
    .from("import_mappings")
    .select("id, name, mapping")
    .order("created_at", { ascending: false })
    .limit(20);
  const chosenSaved = sp.use_mapping
    ? savedMappings?.find((m) => m.id === sp.use_mapping)
    : undefined;

  const defaults: ColumnMapping = {
    ...detectMapping(sheet.headers),
    ...((batch.mapping as ColumnMapping | null) ?? {}),
    ...((chosenSaved?.mapping as ColumnMapping | undefined) ?? {}),
  };

  // Masked sample values: never SSNs or DOB-looking data for unmapped columns
  // either — samples only for columns whose guess is not ssn/dob.
  const sampleFor = (header: string): string => {
    const guess = defaults[header];
    if (guess === "ssn" || guess === "dob") return "•••";
    const v = sheet.rows[0]?.[header] ?? "";
    return String(v).slice(0, 30);
  };

  const saveAction = saveMapping.bind(null, batchId);
  const input =
    "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sapphire focus:outline-none";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="mt-1 text-sm text-slate">
        {batch.filename} · {t.intro}
      </p>

      {sp.error === "need_names" && (
        <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{t.needNames}</p>
      )}

      {(sheetNames.length > 1 || (savedMappings?.length ?? 0) > 0) && (
        <form method="GET" className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {sheetNames.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate">{t.sheet}</label>
              <select name="sheet" defaultValue={sheetName} className={input}>
                {sheetNames.map((s) => (
                  <option key={s} value={s} disabled={payload.sheets[s].overLimit}>
                    {s} ({payload.sheets[s].overLimit ? "5,000+" : payload.sheets[s].rows.length})
                  </option>
                ))}
              </select>
            </div>
          )}
          {(savedMappings?.length ?? 0) > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate">{t.savedMapping}</label>
              <select name="use_mapping" defaultValue={sp.use_mapping ?? ""} className={input}>
                <option value="">{t.none}</option>
                {savedMappings!.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate hover:bg-slate-50">
            {t.useSheet}
          </button>
        </form>
      )}

      {sheet.overLimit ? (
        <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{t.tooBig}</p>
      ) : (
        <form action={saveAction} className="mt-4">
          <input type="hidden" name="sheet" value={sheetName} />
          <input type="hidden" name="header_count" value={sheet.headers.length} />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-4 py-2.5">{t.column}</th>
                  <th className="px-4 py-2.5">{t.sample}</th>
                  <th className="px-4 py-2.5">{t.becomes}</th>
                </tr>
              </thead>
              <tbody>
                {sheet.headers.map((header, i) => (
                  <tr key={header} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">
                      {header}
                      <input type="hidden" name={`header_${i}`} value={header} />
                    </td>
                    <td className="num px-4 py-2 text-slate-400">{sampleFor(header)}</td>
                    <td className="px-4 py-2">
                      <select
                        name={`map_${i}`}
                        defaultValue={defaults[header] ?? "ignore"}
                        className={`${input} w-full`}
                      >
                        <option value="ignore">{t.ignore}</option>
                        {PLATFORM_FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {FIELD_LABELS[f][locale]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate">
              {t.saveAs}
              <input
                name="save_mapping_name"
                placeholder="e.g. Carrier report"
                className={input}
              />
            </label>
            <SubmitButton>{t.continue}</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
