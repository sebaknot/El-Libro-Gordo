import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLinkByToken } from "@/lib/links";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLinkSession, LINK_SESSION_COOKIE, CONSENT_TEXT, maskMemberName } from "@/lib/verification";
import { pickLang, V_DICT } from "@/lib/vdict";
import { submitChanges } from "../actions";
import Shell from "../Shell";

export const dynamic = "force-dynamic";

const input =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none";

export default async function ChangesPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string; error?: string }>;
}) {
  const { token } = await params;
  const { lang: langOverride, error } = await searchParams;

  const result = await getLinkByToken(token);
  if (!result.ok) redirect(`/v/${token}`);
  const cookieStore = await cookies();
  if (!verifyLinkSession(cookieStore.get(LINK_SESSION_COOKIE)?.value, token)) {
    redirect(`/v/${token}`);
  }
  const link = result.link;

  const admin = createAdminClient();
  const [{ data: household }, { data: members }] = await Promise.all([
    admin.from("households").select("preferred_language").eq("id", link.household_id).single(),
    admin
      .from("clients")
      .select("id, first_name, last_name, status")
      .eq("household_id", link.household_id)
      .neq("status", "deceased")
      .order("is_primary", { ascending: false }),
  ]);

  const lang = pickLang(household?.preferred_language, langOverride);
  const t = V_DICT[lang];
  const action = submitChanges.bind(null, token, lang);

  return (
    <Shell lang={lang}>
      <h1 className="text-xl font-bold">{t.changesTitle}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.changesIntro}</p>

      {error === "consent" && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {lang === "es" ? "Debe aceptar el consentimiento para continuar." : "You must accept the consent to continue."}
        </p>
      )}

      <form action={action} className="mt-5 space-y-5">
        <div>
          <label className="block text-sm font-medium">{t.newIncome}</label>
          <input name="new_income" inputMode="decimal" placeholder="45000" className={input} />
        </div>

        <div>
          <label className="block text-sm font-medium">{t.employment}</label>
          <textarea name="employment" rows={2} className={input} />
        </div>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium">{t.newAddress}</legend>
          <input name="street" placeholder={t.street} className={input} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input name="city" placeholder={t.city} className={input + " col-span-2 mt-0"} />
            <input name="state" placeholder={t.state} maxLength={2} className={input + " mt-0"} />
          </div>
          <input name="zip" placeholder={t.zip} className={input + " mt-2"} />
        </fieldset>

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium">{t.contact}</legend>
          <input name="phone" type="tel" placeholder={t.phone} className={input} />
          <input name="email" type="email" placeholder={t.email} className={input + " mt-2"} />
        </fieldset>

        {(members ?? []).length > 0 && (
          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium">{t.removeMembers}</legend>
            <div className="space-y-2">
              {(members ?? []).map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="remove_member" value={maskMemberName(m.first_name, m.last_name)} />
                  {maskMemberName(m.first_name, m.last_name)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium">{t.addMembers}</legend>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mt-2 grid grid-cols-2 gap-2 first:mt-0">
              <input name={`add_first_${i}`} placeholder={t.firstName} className={input + " mt-0"} />
              <input name={`add_last_${i}`} placeholder={t.lastName} className={input + " mt-0"} />
              <input name={`add_dob_${i}`} type="date" aria-label={t.dob} className={input + " col-span-2 mt-0"} />
            </div>
          ))}
        </fieldset>

        <div>
          <label className="block text-sm font-medium">{t.uploadLabel}</label>
          <input name="income_proof" type="file" accept="image/*,.pdf" className="mt-1 w-full text-sm" />
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="consent" required className="mt-0.5" />
          <span>
            <span className="font-medium">{t.consentLabel}</span> {CONSENT_TEXT[lang]}
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700"
        >
          {t.submit}
        </button>
      </form>
    </Shell>
  );
}
