import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDict } from "@/lib/i18n";

const CHANNEL_ICON: Record<string, string> = { sms: "💬", whatsapp: "🟢", email: "✉️" };

type Conversation = {
  clientId: string;
  clientName: string;
  lastBody: string | null;
  lastChannel: string;
  lastAt: string;
  unread: number;
};

export default async function MessagesInboxPage() {
  const supabase = await createClient();
  const { t } = await getDict();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, client_id, channel, direction, body, read, created_at, clients(first_name, last_name)")
    .not("client_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  // Group into one conversation per client, newest message first.
  const conversations = new Map<string, Conversation>();
  for (const m of messages ?? []) {
    const client = m.clients as unknown as { first_name: string; last_name: string } | null;
    let convo = conversations.get(m.client_id);
    if (!convo) {
      convo = {
        clientId: m.client_id,
        clientName: client ? `${client.first_name} ${client.last_name}` : "Unknown client",
        lastBody: m.body,
        lastChannel: m.channel,
        lastAt: m.created_at,
        unread: 0,
      };
      conversations.set(m.client_id, convo);
    }
    if (m.direction === "inbound" && !m.read) convo.unread++;
  }

  const rows = [...conversations.values()];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.messages}</h1>
        <Link
          href="/messages/templates"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate hover:bg-slate-50"
        >
          {t.templates}
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {rows.map((c) => (
          <li key={c.clientId}>
            <Link
              href={`/messages/${c.clientId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <span aria-hidden className="text-lg">
                {CHANNEL_ICON[c.lastChannel] ?? "💬"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${c.unread > 0 ? "font-semibold" : "font-medium"}`}>
                    {c.clientName}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(c.lastAt).toLocaleString()}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-slate">
                  {c.lastBody ?? "(no text)"}
                </span>
              </span>
              {c.unread > 0 && (
                <span className="num shrink-0 rounded-full bg-sapphire px-2 py-0.5 text-xs font-semibold text-white">
                  {c.unread}
                </span>
              )}
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-slate-400">No messages yet.</li>
        )}
      </ul>
    </div>
  );
}
