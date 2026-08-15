"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, type Channel } from "@/app/(staff)/messages/actions";

export type ComposerTemplate = {
  id: string;
  name: string;
  channel: string;
  language: string;
  body: string;
};

export default function MessageComposer({
  clientId,
  templates,
  preferredLanguage,
}: {
  clientId: string;
  templates: ComposerTemplate[];
  preferredLanguage: string;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("sms");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const matching = useMemo(
    () => templates.filter((t) => t.channel === channel && t.language === preferredLanguage),
    [templates, channel, preferredLanguage]
  );

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(clientId, channel, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  const select =
    "rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:border-sapphire focus:outline-none";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel)}
          className={select}
        >
          <option value="sms">💬 sms</option>
          <option value="whatsapp">🟢 whatsapp</option>
          <option value="email">✉️ email</option>
        </select>
        <select
          aria-label="Template"
          defaultValue=""
          onChange={(e) => {
            const tp = matching.find((t) => t.id === e.target.value);
            if (tp) setBody(tp.body);
          }}
          className={`${select} min-w-0 flex-1`}
        >
          <option value="">
            {matching.length > 0
              ? `Template… (${matching.length} for ${channel}/${preferredLanguage})`
              : `No ${channel}/${preferredLanguage} templates`}
          </option>
          {matching.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Type a message…"
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sapphire focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-brick">{error}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Sending is not live yet — messages are saved to the log until Twilio is configured.
        </p>
        <button
          onClick={send}
          disabled={busy || !body.trim()}
          className="rounded-md bg-sapphire px-5 py-2 text-sm font-semibold text-white hover:bg-sapphire/90 disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
