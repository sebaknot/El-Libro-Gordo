import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";
import { STATUS_BADGE } from "@/components/badges";
import HouseholdPicker from "@/components/HouseholdPicker";
import CopyButton from "@/components/CopyButton";
import { generateLinks, expireLink } from "./actions";

const MESSAGE_TEMPLATES = {
  es: (first: string, url: string) =>
    `Hola ${first}, es hora de renovar su seguro de salud. Por favor confirme su información aquí (toma 1 minuto): ${url} — Si algo cambió (ingreso, dirección, familia), ahí mismo lo puede reportar. ¡Gracias!`,
  en: (first: string, url: string) =>
    `Hi ${first}, it's time to renew your health insurance. Please confirm your information here (takes 1 minute): ${url} — If anything changed (income, address, family), you can report it right there. Thank you!`,
};

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const { created, error } = await searchParams;
  const supabase = await createClient();
  const { t } = await getDict();

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  const { data: links } = await supabase
    .from("verification_links")
    .select(`id, token, purpose, expires_at, use_count, max_uses, dob_attempts, status, created_at,
             households(id, household_name, preferred_language, primary_client_id,
                        clients!clients_household_id_fkey(id, first_name, phone, whatsapp_phone, is_primary))`)
    .order("created_at", { ascending: false })
    .limit(100);

  const input =
    "mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold">{t.links}</h1>

      {created && (
        <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          ✓ {created} link(s) generated. Send each client their link below.
        </p>
      )}
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">{t.generateLinks}</h2>
        <form action={generateLinks} className="mt-3 space-y-4">
          <HouseholdPicker placeholder={t.search} />
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium">Purpose</label>
              <select name="purpose" className={input}>
                <option value="renewal">Renewal</option>
                <option value="income_update">Income update</option>
                <option value="new_client_intake">New client intake</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Expires in (days)</label>
              <input name="days" type="number" defaultValue={14} min={1} max={60} className={input + " w-24"} />
            </div>
          </div>
          <button className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {t.generateLinks}
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {(links ?? []).map((link) => {
          const household = link.households as unknown as {
            id: string;
            household_name: string;
            preferred_language: "es" | "en";
            primary_client_id: string | null;
            clients: { id: string; first_name: string; phone: string | null; whatsapp_phone: string | null; is_primary: boolean }[];
          } | null;
          const primary =
            household?.clients?.find((c) => c.id === household.primary_client_id) ??
            household?.clients?.find((c) => c.is_primary) ??
            household?.clients?.[0];
          const url = `${baseUrl}/v/${link.token}`;
          const lang = household?.preferred_language === "en" ? "en" : "es";
          const message = MESSAGE_TEMPLATES[lang](primary?.first_name ?? "", url);
          const phone = primary?.whatsapp_phone ?? primary?.phone;
          const waHref = phone
            ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
            : null;

          return (
            <div key={link.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/households/${household?.id}`} className="font-medium text-blue-700 hover:underline">
                    {household?.household_name ?? "—"}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">
                    {link.purpose.replace(/_/g, " ")} · expires {new Date(link.expires_at).toLocaleDateString()} ·
                    uses {link.use_count}/{link.max_uses}
                    {link.dob_attempts > 0 && ` · ${link.dob_attempts} failed DOB`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {STATUS_BADGE(link.status)}
                  {link.status === "active" && (
                    <form action={expireLink.bind(null, link.id)}>
                      <button className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600 hover:bg-red-100">
                        Expire
                      </button>
                    </form>
                  )}
                </div>
              </div>
              {link.status === "active" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <code className="max-w-[24rem] truncate rounded bg-slate-100 px-2 py-1">{url}</code>
                  <CopyButton text={url} label="Copy link" />
                  <CopyButton text={message} label={`Copy ${lang.toUpperCase()} message`} />
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-green-700 hover:bg-green-100"
                    >
                      WhatsApp →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(!links || links.length === 0) && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No links yet. Generate some above.
          </p>
        )}
      </section>
    </div>
  );
}
