import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageComposer, { type ComposerTemplate } from "@/components/MessageComposer";

const CHANNEL_ICON: Record<string, string> = { sms: "💬", whatsapp: "🟢", email: "✉️" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, whatsapp_phone, email, households!clients_household_id_fkey(id, household_name, preferred_language)"
    )
    .eq("id", clientId)
    .single();
  if (!client) notFound();

  const household = client.households as unknown as {
    id: string;
    household_name: string;
    preferred_language: string;
  };

  // Opening the thread clears its unread state.
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("client_id", clientId)
    .eq("direction", "inbound")
    .eq("read", false);

  const [{ data: messages }, { data: templates }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, channel, direction, body, created_at, users(full_name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase.from("message_templates").select("id, name, channel, language, body").order("name"),
  ]);

  return (
    <div className="flex h-full max-w-3xl flex-col">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Link href={`/clients/${client.id}`} className="hover:underline">
              {client.first_name} {client.last_name}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-slate">
            <Link href={`/households/${household.id}`} className="text-sapphire hover:underline">
              {household.household_name}
            </Link>
            {client.phone && (
              <>
                {" · "}
                <span className="num">{client.phone}</span>
              </>
            )}
          </p>
        </div>
        <Link href="/messages" className="text-sm text-sapphire hover:underline">
          ← All messages
        </Link>
      </div>

      <div className="mt-6 flex-1 space-y-2">
        {(messages ?? []).map((m) => {
          const sender = m.users as unknown as { full_name: string } | null;
          const outbound = m.direction === "outbound";
          return (
            <div key={m.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg border px-3 py-2 text-sm shadow-sm ${
                  outbound
                    ? "border-sapphire/30 bg-sapphire/5"
                    : "border-slate-200 bg-white"
                }`}
              >
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  <span aria-hidden>{CHANNEL_ICON[m.channel] ?? "💬"}</span> {m.channel} ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                  {sender && ` · ${sender.full_name}`}
                </p>
              </div>
            </div>
          );
        })}
        {(!messages || messages.length === 0) && (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No messages with this client yet.
          </p>
        )}
      </div>

      <div className="mt-6">
        <MessageComposer
          clientId={client.id}
          templates={(templates ?? []) as ComposerTemplate[]}
          preferredLanguage={household.preferred_language === "en" ? "en" : "es"}
        />
      </div>
    </div>
  );
}
