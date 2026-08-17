import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/EmptyState";
import SubmitButton from "@/components/SubmitButton";
import { getDict } from "@/lib/i18n";
import { createTemplate, deleteTemplate, updateTemplate } from "../actions";

const input =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none";

function TemplateFields({
  defaults,
}: {
  defaults?: { name: string; channel: string; language: string; body: string };
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="Renewal reminder (ES)"
          defaultValue={defaults?.name}
          className={`${input} min-w-0 flex-1`}
        />
        <select name="channel" defaultValue={defaults?.channel ?? "sms"} className={input}>
          <option value="sms">sms</option>
          <option value="whatsapp">whatsapp</option>
          <option value="email">email</option>
        </select>
        <select name="language" defaultValue={defaults?.language ?? "es"} className={input}>
          <option value="es">es</option>
          <option value="en">en</option>
        </select>
      </div>
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Hola, es hora de renovar su seguro de salud…"
        defaultValue={defaults?.body}
        className={`${input} mt-2 w-full`}
      />
    </>
  );
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: templates } = await supabase
    .from("message_templates")
    .select("id, name, channel, language, body")
    .order("name");

  return (
    <div className="max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t.templates}</h1>
        <Link href="/messages" className="text-sm text-sapphire hover:underline">
          ← {t.messages}
        </Link>
      </div>

      {error && <p className="mt-4 rounded-md bg-brick/5 p-3 text-sm text-brick">{error}</p>}

      <form
        action={createTemplate}
        className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold">New template</h2>
        <div className="mt-3">
          <TemplateFields />
        </div>
        <SubmitButton className="mt-3 px-5 py-2 text-sm">+ Create</SubmitButton>
      </form>

      <ul className="mt-6 space-y-4">
        {(templates ?? []).map((tp) => (
          <li key={tp.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <form action={updateTemplate.bind(null, tp.id)}>
              <TemplateFields defaults={tp} />
              <SubmitButton className="mt-3 px-4 py-2 text-sm">{t.save}</SubmitButton>
            </form>
            <form action={deleteTemplate.bind(null, tp.id)} className="mt-2">
              <button className="text-xs text-brick hover:underline">Delete</button>
            </form>
          </li>
        ))}
        {(!templates || templates.length === 0) && (
          <li className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <EmptyState
              icon={FileText}
              message="No templates yet. The thread composer uses these, filtered by channel and the household's language."
            />
          </li>
        )}
      </ul>
    </div>
  );
}
