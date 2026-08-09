/**
 * Taxonomy — IRS Representation / IRS Protection Plan (the membership page)
 * Base44 path: pages/IRSRepresentation.js
 *
 * Rules enforced here:
 *  - No "$50/month" anywhere. Hero reads "Starting at $19.99/month".
 *  - "Unlimited" and "anytime" never describe service scope. Phone access is
 *    always bounded: "up to 2-3 calls per month, 10 minutes each".
 *    ("Unlimited representation rights" is the legal term of art for Enrolled
 *    Agent practice authority before the IRS — that one is correct and stays.)
 *  - This page carries the representation-rights argument. The About page
 *    covers standards of practice instead, so the two no longer overlap.
 */

import React, { useState } from "react";
import { ChevronDown, ExternalLink, ShieldCheck, PhoneCall, FileSearch, Scale } from "lucide-react";
import {
  Btn,
  BookBtn,
  Section,
  SectionHead,
  Eyebrow,
  Card,
  IconBadge,
  TierCards,
  TierNote,
  STARTING_AT,
  ENROLLMENT_URL,
  TREASURY_LINE,
} from "@/components/brand/Brand";

const INCLUDED = [
  {
    icon: ShieldCheck,
    title: "Representation on any notice",
    body: "If the IRS contacts you about a covered year, we respond as your representative — you do not call them yourself.",
  },
  {
    icon: FileSearch,
    title: "Notice review and written response",
    body: "Every letter is read, interpreted, and answered in writing with the supporting documentation attached.",
  },
  {
    icon: PhoneCall,
    title: "Direct phone access",
    body: "Up to 2–3 calls per month, 10 minutes each — enough to get a clear answer before you act on something.",
  },
  {
    icon: Scale,
    title: "Examination representation",
    body: "If a return is selected for examination, we appear on your behalf under federal practice authority.",
  },
];

const FAQ = [
  {
    q: "What is actually covered?",
    a: "Representation before the IRS on covered tax years: notice review and written response, examinations, collections contact, and the correspondence that follows. Your plan also includes direct phone access — up to 2–3 calls per month, 10 minutes each — for questions that come up between filings.",
  },
  {
    q: "What is not covered?",
    a: "Tax return preparation itself is billed separately from the plan. Also excluded: representation before state agencies or in United States Tax Court, criminal tax matters, bookkeeping and payroll services, and issues arising from information you did not disclose. If something falls outside the plan we tell you before any work begins.",
  },
  {
    q: "How is my tier assigned?",
    a: "Taxonomy assigns your tier after reviewing your most recent tax return. W-2 only filers with no business schedules fall under Basic Protection. Returns with Schedule C, E or D activity or passive K-1 income fall under Standard Protection. Active business owners, S-Corps and multi-entity filers fall under Business Protection. You are not asked to self-select — we look at the return and tell you.",
  },
  {
    q: "Is there a minimum commitment?",
    a: "The plan is billed monthly and can be cancelled at any time; coverage runs through the end of the billing period you have paid for. Representation applies to matters that arise while your plan is active — it is protection going forward, not retroactive coverage for a notice you already received.",
  },
  {
    q: "I already have a notice. Can I still enroll?",
    a: "Yes, but the existing notice is handled as separate engagement work rather than under the plan. Book an appointment and we will quote that matter directly, then set up coverage going forward.",
  },
];

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-[#6B7280]/20">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-bold text-[#0E1116]">{item.q}</span>
        <ChevronDown
          size={20}
          color="#00A88C"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <p className="pb-5 pr-8 text-sm leading-relaxed text-[#6B7280]">{item.a}</p>
      ) : null}
    </div>
  );
}

export default function IRSRepresentation() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <>
      <section className="bg-[#0E1116] px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow tone="dark">IRS Protection Plan</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            {STARTING_AT}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            Ongoing IRS representation coverage, priced by the complexity of your
            return. {TREASURY_LINE}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BookBtn tone="dark" />
            <Btn variant="secondary" tone="dark" href={ENROLLMENT_URL} external>
              Enroll now
              <ExternalLink size={15} aria-hidden="true" />
            </Btn>
          </div>
        </div>
      </section>

      {/* ---- Representation rights: this page's distinct argument --------- */}
      <Section bg="white">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Representation rights</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0E1116] sm:text-4xl">
              What representation actually means
            </h2>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-[#6B7280]">
            <p>
              Most people who prepare tax returns cannot speak to the IRS for
              you. They can sign the return, and that is where their authority
              ends. If a letter arrives, it arrives at your address and it is
              your problem to answer.
            </p>
            <p>
              An Enrolled Agent holds unlimited representation rights before the
              IRS — the same practice authority held by tax attorneys, granted
              directly by the U.S. Department of the Treasury. That means the
              correspondence, the examination, and the negotiation are handled
              by your representative rather than by you.
            </p>
            <p>
              The Protection Plan exists so that authority is already in place
              before you need it, instead of being retained in a hurry after a
              notice arrives.
            </p>
          </div>
        </div>
      </Section>

      {/* ---- Tiers -------------------------------------------------------- */}
      <Section bg="paper">
        <SectionHead
          eyebrow="Plans"
          title="Three tiers, assigned by us"
          lede="You are not asked to guess which plan fits. We review your most recent return and tell you where you land."
        />
        <div className="mt-10">
          <TierCards />
        </div>
        <TierNote />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <BookBtn />
          <Btn variant="secondary" href={ENROLLMENT_URL} external>
            Enroll in the Protection Plan
            <ExternalLink size={15} aria-hidden="true" />
          </Btn>
        </div>
      </Section>

      {/* ---- What's included ---------------------------------------------- */}
      <Section bg="white">
        <SectionHead eyebrow="Included in every tier" title="What you get each month" />
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {INCLUDED.map((f) => (
            <Card key={f.title}>
              <IconBadge icon={f.icon} size={24} />
              <h3 className="mt-4 text-base font-extrabold text-[#0E1116]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{f.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 rounded-lg border border-[#6B7280]/20 bg-[#F5F5F0] p-6">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#0E1116]">
            Scope of phone access
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
            Plan members get direct phone access of up to 2–3 calls per month,
            10 minutes each. Matters that need longer than that are scheduled as
            a full appointment so they get the attention they require.
          </p>
        </div>
      </Section>

      {/* ---- Enrollment callout ------------------------------------------- */}
      <Section bg="ink">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Ready to enroll?
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/70">
              Enrollment runs on our secure signup site. It takes a few minutes,
              and your tier is confirmed after we review your most recent return.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
            <BookBtn tone="dark" />
            <Btn variant="secondary" tone="dark" href={ENROLLMENT_URL} external>
              Go to enrollment
              <ExternalLink size={15} aria-hidden="true" />
            </Btn>
          </div>
        </div>
      </Section>

      {/* ---- FAQ ----------------------------------------------------------- */}
      <Section bg="paper" id="faq">
        <SectionHead eyebrow="FAQ" title="Questions people ask before enrolling" />
        <div className="mt-8 max-w-3xl">
          {FAQ.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <BookBtn />
          <Btn variant="secondary" page="Services">
            Browse services
          </Btn>
        </div>
      </Section>
    </>
  );
}
