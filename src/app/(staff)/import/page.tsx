import Link from "next/link";
import { Upload } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { requireImportAccess } from "@/lib/import/server";
import SubmitButton from "@/components/SubmitButton";
import { uploadSpreadsheet } from "./actions";

const COPY = {
  en: {
    title: "Import clients",
    intro:
      "Upload your book as an Excel (.xlsx) or CSV file. We'll read it, let you check everything, and nothing is saved until you confirm.",
    limits: "Up to 10 MB and 5,000 rows. Excel files with macros are not accepted.",
    choose: "Choose a file",
    upload: "Upload and continue",
    template: "Download template",
    templateHint: "Not sure about the columns? Start from our template.",
    history: "Past imports",
    errors: {
      no_file: "Please choose a file first.",
      too_big: "That file is too big — the limit is 10 MB.",
      too_many_rows: "That sheet has more than 5,000 rows. Split it into smaller files.",
      bad_type: "Only .xlsx and .csv files work here. Legacy .xls files need to be re-saved as .xlsx.",
      macros: "That file contains macros, which we don't accept for safety. Re-save it as a plain .xlsx.",
      unreadable: "We couldn't read that file. Re-save it as .xlsx or .csv and try again.",
      empty: "That file doesn't seem to have any rows.",
      rate_limited: "That's a lot of uploads in one hour — please wait a bit and try again.",
      save_failed: "Something went wrong saving the upload. Try again.",
    } as Record<string, string>,
  },
  es: {
    title: "Importar clientes",
    intro:
      "Suba su libro como archivo de Excel (.xlsx) o CSV. Lo leeremos, le dejaremos revisar todo, y no se guarda nada hasta que usted confirme.",
    limits: "Hasta 10 MB y 5,000 filas. No se aceptan archivos de Excel con macros.",
    choose: "Elegir un archivo",
    upload: "Subir y continuar",
    template: "Descargar plantilla",
    templateHint: "¿No está segura de las columnas? Empiece con nuestra plantilla.",
    history: "Importaciones anteriores",
    errors: {
      no_file: "Primero elija un archivo.",
      too_big: "Ese archivo es demasiado grande — el límite es 10 MB.",
      too_many_rows: "Esa hoja tiene más de 5,000 filas. Divídala en archivos más pequeños.",
      bad_type: "Aquí solo funcionan archivos .xlsx y .csv. Los .xls antiguos deben guardarse como .xlsx.",
      macros: "Ese archivo contiene macros y por seguridad no se acepta. Guárdelo como .xlsx normal.",
      unreadable: "No pudimos leer ese archivo. Guárdelo como .xlsx o .csv e intente de nuevo.",
      empty: "Ese archivo no parece tener filas.",
      rate_limited: "Son muchas subidas en una hora — espere un poco e intente de nuevo.",
      save_failed: "Algo falló al guardar la subida. Intente de nuevo.",
    } as Record<string, string>,
  },
};

export default async function ImportUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireImportAccess();
  const { error } = await searchParams;
  const { locale } = await getDict();
  const t = COPY[locale];

  return (
    <div className="max-w-2xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link href="/import/history" className="text-sm text-sapphire hover:underline">
          {t.history} →
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate">{t.intro}</p>

      {error && (
        <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">
          {t.errors[error] ?? t.errors.save_failed}
        </p>
      )}

      <form
        action={uploadSpreadsheet}
        className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 px-4 py-10 text-center">
          <Upload aria-hidden className="h-8 w-8 text-slate-300" />
          <label className="text-sm font-medium">
            {t.choose}
            <input
              type="file"
              name="file"
              required
              accept=".xlsx,.csv"
              className="mt-2 block w-full text-sm text-slate file:mr-3 file:rounded-md file:border-0 file:bg-sapphire/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-sapphire"
            />
          </label>
          <p className="text-xs text-slate-400">{t.limits}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-slate">
            {t.templateHint}{" "}
            <a href="/api/import/template" className="font-medium text-sapphire hover:underline">
              {t.template}
            </a>
          </div>
          <SubmitButton>{t.upload}</SubmitButton>
        </div>
      </form>
    </div>
  );
}
