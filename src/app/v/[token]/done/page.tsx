import { pickLang, V_DICT } from "@/lib/vdict";
import Shell from "../Shell";

export const dynamic = "force-dynamic";

export default async function DonePage({
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: langOverride } = await searchParams;
  const lang = pickLang(null, langOverride);
  const t = V_DICT[lang];

  return (
    <Shell lang={lang}>
      <div className="py-6 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-3 text-xl font-bold">{t.doneTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.doneBody}</p>
      </div>
    </Shell>
  );
}
