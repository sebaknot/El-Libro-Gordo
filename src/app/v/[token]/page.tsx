import { getLinkByToken } from "@/lib/links";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLang, V_DICT } from "@/lib/vdict";
import { verifyDob } from "./actions";
import Shell from "./Shell";

export const dynamic = "force-dynamic";

export default async function DobGatePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string; error?: string }>;
}) {
  const { token } = await params;
  const { lang: langOverride, error } = await searchParams;

  const result = await getLinkByToken(token);

  let preferred: string | null = null;
  if (result.ok) {
    const admin = createAdminClient();
    const { data: h } = await admin
      .from("households")
      .select("preferred_language")
      .eq("id", result.link.household_id)
      .single();
    preferred = h?.preferred_language ?? null;
  }
  const lang = pickLang(preferred, langOverride);
  const t = V_DICT[lang];

  if (!result.ok) {
    const message =
      result.reason === "locked" ? t.locked : result.reason === "used" ? t.used : t.expired;
    return (
      <Shell lang={lang}>
        <p className="text-center text-slate-700">{message}</p>
      </Shell>
    );
  }

  const action = verifyDob.bind(null, token, lang);

  return (
    <Shell lang={lang}>
      <h1 className="text-xl font-bold">{t.title}</h1>
      <p className="mt-3 text-sm text-slate-600">{t.dobPrompt}</p>
      {error === "wrong" && (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{t.wrongDob}</p>
      )}
      <form action={action} className="mt-5 space-y-4">
        <div>
          <label htmlFor="dob" className="block text-sm font-medium">{t.dobLabel}</label>
          <input
            id="dob" name="dob" type="date" required
            className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700"
        >
          {t.continue}
        </button>
      </form>
    </Shell>
  );
}
