import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLinkByToken } from "@/lib/links";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyLinkSession,
  LINK_SESSION_COOKIE,
  CONSENT_TEXT,
  maskMemberName,
  formatIncome,
} from "@/lib/verification";
import { pickLang, V_DICT } from "@/lib/vdict";
import { submitNoChanges } from "../actions";
import Shell from "../Shell";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
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
    admin
      .from("households")
      .select("household_name, address_street, address_city, address_state, address_zip, annual_income, preferred_language, primary_client_id")
      .eq("id", link.household_id)
      .single(),
    admin
      .from("clients")
      .select("id, first_name, last_name, is_primary, status")
      .eq("household_id", link.household_id)
      .neq("status", "deceased")
      .order("is_primary", { ascending: false }),
  ]);
  if (!household) redirect(`/v/${token}`);

  const lang = pickLang(household.preferred_language, langOverride);
  const t = V_DICT[lang];

  const primary = (members ?? []).find((m) => m.is_primary) ?? (members ?? [])[0];
  const { data: activePolicy } = await admin
    .from("policies")
    .select("plan_name, plan_year, carriers(name)")
    .eq("household_id", link.household_id)
    .eq("status", "active")
    .order("plan_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  const address =
    [household.address_street, household.address_city, household.address_state, household.address_zip]
      .filter(Boolean)
      .join(", ") || "—";

  const noChanges = submitNoChanges.bind(null, token, lang);

  return (
    <Shell lang={lang}>
      <h1 className="text-xl font-bold">{t.confirmTitle}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.confirmIntro}</p>

      <dl className="mt-5 space-y-3 text-sm">
        <Row label={t.name} value={primary ? maskMemberName(primary.first_name, primary.last_name) : "—"} />
        <Row label={t.address} value={address} />
        <Row
          label={t.members}
          value={(members ?? []).map((m) => maskMemberName(m.first_name, m.last_name)).join(", ") || "—"}
        />
        <Row label={t.income} value={formatIncome(household.annual_income)} />
        <Row
          label={t.plan}
          value={
            activePolicy
              ? `${(activePolicy.carriers as unknown as { name: string } | null)?.name ?? ""} ${activePolicy.plan_name ?? ""} (${activePolicy.plan_year})`.trim()
              : "—"
          }
        />
      </dl>

      {error === "consent" && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {lang === "es" ? "Debe aceptar el consentimiento para continuar." : "You must accept the consent to continue."}
        </p>
      )}

      <form action={noChanges} className="mt-6 space-y-4">
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" name="consent" required className="mt-0.5" />
          <span>
            <span className="font-medium">{t.consentLabel}</span> {CONSENT_TEXT[lang]}
          </span>
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700"
        >
          {t.allSame}
        </button>
      </form>

      <Link
        href={`/v/${token}/changes?lang=${lang}`}
        className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold text-slate-700 hover:bg-slate-50"
      >
        {t.somethingChanged}
      </Link>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}
