/**
 * Taxonomy — Get Started
 * Base44 path: pages/GetStarted.js
 *
 * Bug fixed here: the "Questions? We're here to help" box no longer renders the
 * placeholder number (123) 456-7890. It uses the real business line, 561-530-3366,
 * matching the footer.
 */

import React from "react";
import { CalendarCheck, FileSearch, ShieldCheck, Phone, Mail, ExternalLink } from "lucide-react";
import {
  Btn,
  BookBtn,
  Section,
  SectionHead,
  Eyebrow,
  Card,
  IconBadge,
  PHONE,
  PHONE_HREF,
  ENROLLMENT_URL,
  TIER_NOTE,
  STARTING_AT,
  TREASURY_LINE,
} from "@/components/brand/Brand";

const STEPS = [
  {
    n: "01",
    icon: CalendarCheck,
    title: "Book an appointment",
    body: "Pick a time and tell us in a sentence what you are dealing with. You get a confirmed slot, not a callback window.",
  },
  {
    n: "02",
    icon: FileSearch,
    title: "We review your last return",
    body: "We read what was filed and tell you plainly what is solid, what is exposed, and what it takes to fix it. This review is also how your Protection Plan tier gets assigned.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Get covered and stay covered",
    body: "Preparation, planning, and ongoing IRS representation — so if a notice arrives, it is handled by someone with federal authority to act on your behalf.",
  },
];

export default function GetStarted() {
  return (
    <>
      <section className="bg-[#0E1116] px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow tone="dark">Get started</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Three steps, no guesswork.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            {TREASURY_LINE}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BookBtn tone="dark" />
            <Btn variant="secondary" tone="dark" page="IRSRepresentation">
              IRS Protection Plan
            </Btn>
          </div>
        </div>
      </section>

      {/* Three-step cards — single column on mobile, three across from md up. */}
      <Section bg="paper">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n} className="flex flex-col">
              <div className="flex items-center justify-between">
                <IconBadge icon={s.icon} size={26} />
                <span className="text-2xl font-extrabold tracking-tight text-[#6B7280]/35">
                  {s.n}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-[#0E1116]">{s.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B7280]">{s.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section bg="white">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <SectionHead
              eyebrow="What to bring"
              title="Have these ready and the first meeting does real work"
            />
            <ul className="mt-6 space-y-3">
              {[
                "Your most recent filed tax return (federal and state)",
                "Any IRS or state notices you have received, including the envelope",
                "Income documents for the current year — W-2s, 1099s, K-1s",
                "For business owners: entity documents and year-to-date books",
                "For crypto or investment activity: exchange and brokerage statements",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#00A88C]"
                  />
                  <span className="text-sm leading-relaxed text-[#6B7280]">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            {/* ---- Questions box — real number, no placeholder ------------ */}
            <div className="rounded-lg border border-[#6B7280]/20 bg-[#F5F5F0] p-6 sm:p-7">
              <h3 className="text-lg font-extrabold text-[#0E1116]">
                Questions? We're here to help.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                If you would rather talk it through before booking anything,
                call us. Same number as the footer — a real line, answered by
                our office.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0E1116]/25 px-5 py-3 text-sm font-semibold text-[#0E1116] transition-colors hover:border-[#00A88C] hover:text-[#00A88C]"
                >
                  <Phone size={16} color="#00A88C" aria-hidden="true" />
                  {PHONE}
                </a>
                {/* TODO: confirm the public support inbox before publishing. */}
                <a
                  href="mailto:info@tax1a.com"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0E1116]/25 px-5 py-3 text-sm font-semibold text-[#0E1116] transition-colors hover:border-[#00A88C] hover:text-[#00A88C]"
                >
                  <Mail size={16} color="#00A88C" aria-hidden="true" />
                  Email us
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-[#6B7280]/20 bg-white p-6 sm:p-7">
              <h3 className="text-lg font-extrabold text-[#0E1116]">
                Skip ahead and enroll
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                Already decided on IRS Protection? {STARTING_AT}. {TIER_NOTE}
              </p>
              <Btn variant="secondary" href={ENROLLMENT_URL} external className="mt-5 w-full">
                Go to enrollment
                <ExternalLink size={15} aria-hidden="true" />
              </Btn>
            </div>
          </div>
        </div>
      </Section>

      <Section bg="ink">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready when you are.
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <BookBtn tone="dark" />
            <Btn variant="secondary" tone="dark" page="Services">
              Browse services
            </Btn>
          </div>
        </div>
      </Section>
    </>
  );
}
