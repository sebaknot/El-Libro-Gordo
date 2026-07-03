import { getDict } from "@/lib/i18n";

export default async function ExportPage() {
  const { t } = await getDict();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{t.export}</h1>
      <p className="mt-2 text-sm text-slate-600">
        Exports are generated on the server and every download is recorded in the audit log.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{t.fullBookExport}</h2>
        <p className="mt-1 text-sm text-slate-600">
          One row per client: contact info, household, current plan, carrier, premium, subsidy, status.
        </p>
        <a
          href="/api/export/full-book"
          className="mt-4 inline-block rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          ⬇ {t.download} .xlsx
        </a>
      </div>
    </div>
  );
}
