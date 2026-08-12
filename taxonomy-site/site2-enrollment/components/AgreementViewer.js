/**
 * "Review the Agreement" — the scrollable agreement container.
 * Base44 path: components/agreement/AgreementViewer.js
 *
 * Polish pass over the existing plain text box: formal document framing,
 * generous internal padding, styled scrollbar, and a soft elevation so it reads
 * as a legal instrument rather than a textarea.
 *
 * Structure and flow position are unchanged — this still sits between the form
 * step and the signature step.
 *
 * The version number is deliberately absent. Header reads "Subscription
 * Agreement" and nothing more.
 *
 * `onScrolledToEnd` is optional. Wire it only if your flow already gates the
 * signature button on reaching the bottom; leaving it off changes nothing.
 */

import React, { useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import { AGREEMENT_TITLE, SECTIONS } from "@/components/agreement/agreementText";

function Paragraph({ text }) {
  // The two clauses that open with a bolded lead-in read better with it kept.
  const lead = /^(Important:|Note:)\s/.exec(text);
  if (lead) {
    return (
      <p className="mt-4 text-[13.5px] leading-[1.75] text-[#0E1116]/85">
        <span className="font-bold text-[#0E1116]">{lead[1]}</span>
        {text.slice(lead[0].length - 1)}
      </p>
    );
  }
  return (
    <p className="mt-4 text-[13.5px] leading-[1.75] text-[#0E1116]/85">{text}</p>
  );
}

export default function AgreementViewer({ onScrolledToEnd, maxHeight = 420 }) {
  const firedRef = useRef(false);

  const handleScroll = useCallback(
    (e) => {
      if (!onScrolledToEnd || firedRef.current) return;
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
        firedRef.current = true;
        onScrolledToEnd();
      }
    },
    [onScrolledToEnd]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[#6B7280]/25 bg-white shadow-[0_1px_2px_rgba(14,17,22,0.04),0_12px_32px_-12px_rgba(14,17,22,0.18)]">
      {/* Document header — title only, no version */}
      <div className="flex items-center gap-3 border-b border-[#6B7280]/20 bg-[#F5F5F0] px-6 py-4 sm:px-8">
        <FileText size={18} color="#00A88C" strokeWidth={2} aria-hidden="true" />
        <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#0E1116]">
          {AGREEMENT_TITLE}
        </h3>
      </div>

      {/* Scrollable body */}
      <div
        onScroll={handleScroll}
        style={{ maxHeight }}
        tabIndex={0}
        role="region"
        aria-label="Subscription Agreement text"
        className="tx-agreement-scroll overflow-y-auto px-6 py-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00A88C] sm:px-8 sm:py-9"
      >
        <style>{`
          .tx-agreement-scroll { scrollbar-width: thin; scrollbar-color: #00A88C #ECECE6; }
          .tx-agreement-scroll::-webkit-scrollbar { width: 10px; }
          .tx-agreement-scroll::-webkit-scrollbar-track { background: #ECECE6; border-radius: 999px; }
          .tx-agreement-scroll::-webkit-scrollbar-thumb {
            background: #00A88C; border-radius: 999px;
            border: 3px solid #ECECE6;
          }
          .tx-agreement-scroll::-webkit-scrollbar-thumb:hover { background: #0E1116; }
        `}</style>

        {SECTIONS.map((s, i) => (
          <section key={s.id} className={i === 0 ? "" : "mt-9"}>
            <h4 className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#0E1116]">
              {s.heading}
            </h4>
            <div className="mt-1 h-px w-10 bg-[#00A88C]" aria-hidden="true" />

            {(s.body || []).map((p, j) => (
              <Paragraph key={j} text={p} />
            ))}

            {s.bullets && s.bullets.length ? (
              <ul className="mt-4 space-y-2.5">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-[9px] inline-block h-1 w-1 shrink-0 rounded-full bg-[#00A88C]"
                    />
                    <span className="text-[13.5px] leading-[1.75] text-[#0E1116]/85">{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {(s.trailing || []).map((p, j) => (
              <Paragraph key={`t${j}`} text={p} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
