/**
 * Taxonomy — Home
 * Base44 path: pages/Home.js
 */

import React from "react";
import {
  Bitcoin,
  Building2,
  HardHat,
  Rocket,
  Landmark,
  Globe2,
  ShieldCheck,
  GraduationCap,
  Scale,
  Star,
} from "lucide-react";
import {
  Btn,
  BookBtn,
  Section,
  SectionHead,
  Eyebrow,
  Card,
  IconBadge,
  Placeholder,
  TierCards,
  TierNote,
  STARTING_AT,
  TREASURY_LINE,
} from "@/components/brand/Brand";

/* ---- Section 7 content: deep-vertical specializations ------------------- */
const SPECIALIZATIONS = [
  {
    icon: Bitcoin,
    title: "Crypto & Digital Assets",
    body:
      "We understand the tax treatment of cryptocurrency, staking rewards, NFTs, and digital asset transactions — an area most tax preparers still get wrong. From capital gains tracking across wallets and exchanges to the reporting requirements the IRS is actively enforcing, we help investors and traders stay compliant without overpaying.",
  },
  {
    icon: Building2,
    title: "Real Estate Investors & Owners",
    body:
      "From rental property depreciation to 1031 exchanges, capital gains on sale, and cost basis reconstruction, we specialize in the tax complexity that comes with owning, renting, and selling real estate — residential and commercial alike.",
  },
  {
    icon: HardHat,
    title: "Construction Industry",
    body:
      "Contractors, subcontractors, and construction business owners face tax situations that generic preparers rarely handle well — job costing, equipment depreciation, 1099 subcontractor compliance, and multi-project accounting. We understand this industry because we have worked directly with it.",
  },
  {
    icon: Rocket,
    title: "Startups & Emerging Businesses",
    body:
      "From entity selection and startup deductions to multi-year loss planning and eventual exit or acquisition strategy, we help founders build their tax position correctly from day one instead of untangling mistakes later.",
  },
  {
    icon: Landmark,
    title: "Government Employees & Foreign Service",
    body:
      "Federal employees, military members, and Foreign Service officers face tax situations most preparers rarely encounter — TSP contributions, combat zone exclusions, foreign earned income, dual-state residency, and PCS-related moves. We understand these situations firsthand.",
  },
  {
    icon: Globe2,
    title: "International Clients & Latin American Community",
    body:
      "We serve a large base of clients navigating the tax transition from Latin America to the United States, and understanding both sides of that picture matters. From ITIN applications and first-time U.S. filing to foreign income reporting, dual-country tax exposure, and the specific documentation the IRS expects from newly arrived taxpayers, we bridge the gap between where our clients came from and the U.S. tax system they now navigate.",
    /* ------------------------------------------------------------------
     * TODO — CONFIRM LANGUAGE CAPABILITY BEFORE PUBLISHING, then set:
     *   languages: "Available in English and Spanish."
     * Left unset on purpose so an unverified service claim cannot ship.
     * ---------------------------------------------------------------- */
    languages: null,
  },
];

const CREDENTIALS = [
  {
    icon: ShieldCheck,
    title: "Federally Licensed Enrolled Agent",
    body: "Licensed by the U.S. Department of the Treasury and admitted to practice before the IRS.",
  },
  {
    icon: Scale,
    title: "Unlimited Representation Rights",
    body: "The same representation authority before the IRS held by tax attorneys — granted directly by the federal government.",
  },
  {
    icon: GraduationCap,
    title: "Master's in Accounting, Taxation",
    body: "Advanced technical grounding well beyond standard licensure exam preparation.",
  },
];

/* ---- Section 4 content: testimonials (placeholder structure) ------------ */
const TESTIMONIALS = [
  {
    quote:
      "PLACEHOLDER — TO BE REPLACED WITH A REAL CLIENT QUOTE. Two to three sentences describing the specific problem they came in with and what changed after working with Taxonomy.",
    name: "First name + last initial",
  },
  {
    quote:
      "PLACEHOLDER — TO BE REPLACED WITH A REAL CLIENT QUOTE. Ideally one that speaks to an IRS notice or examination being handled directly, since representation is the core differentiator.",
    name: "First name + last initial",
  },
  {
    quote:
      "PLACEHOLDER — TO BE REPLACED WITH A REAL CLIENT QUOTE. A specialization client (crypto, real estate, construction, international) reinforces the vertical expertise above.",
    name: "First name + last initial",
  },
];

export default function Home() {
  return (
    <>
      {/* ---- Hero: solid Ink, no stock gradient imagery ------------------ */}
      <section className="bg-[#0E1116] px-5 py-20 sm:px-6 md:py-28">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow tone="dark">Taxonomy</Eyebrow>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Tax work backed by the right to{" "}
              <span className="text-[#00D4B4]">represent you before the IRS</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              {TREASURY_LINE} When a notice arrives, we do not hand you a phone
              number — we handle it.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BookBtn tone="dark" />
              <Btn variant="secondary" tone="dark" page="IRSRepresentation">
                IRS Protection Plan — {STARTING_AT.toLowerCase()}
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Credential strip -------------------------------------------- */}
      <Section bg="white">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CREDENTIALS.map((c) => (
            <Card key={c.title}>
              <IconBadge icon={c.icon} size={26} />
              <h3 className="mt-4 text-base font-extrabold text-[#0E1116]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{c.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Who We Serve ------------------------------------------------- */}
      <Section bg="paper">
        <SectionHead
          eyebrow="Who we serve"
          title="Individuals and businesses that cannot afford a guess"
          lede="Filing is the easy part. What matters is whether the position you took can be defended — and whether someone with federal authority is standing behind it if the IRS asks."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            ["Individuals & families", "Accurate filing, year-round answers, and someone who picks up when a letter shows up."],
            ["Business owners", "Entity structure, payroll exposure, and the schedules that draw the most IRS attention."],
            ["Taxpayers already under IRS contact", "Notices, examinations, collections, and unfiled years — handled by someone admitted to practice."],
          ].map(([t, b]) => (
            <Card key={t}>
              <h3 className="text-base font-extrabold text-[#0E1116]">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{b}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Section 7: Our Specializations ------------------------------- */}
      <Section bg="white" id="specializations">
        <SectionHead
          eyebrow="Our specializations"
          title="Who we specialize in"
          lede="Generalists learn your industry on your return. We already know it — these are the situations we handle every week."
        />
        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-11 md:grid-cols-2">
          {SPECIALIZATIONS.map((s) => (
            <div key={s.title}>
              <IconBadge icon={s.icon} size={26} />
              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-[#0E1116]">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">{s.body}</p>
              {s.languages ? (
                <p className="mt-2 text-sm font-medium text-[#0E1116]">{s.languages}</p>
              ) : null}
              <Btn
                variant="secondary"
                page="BookAppointment"
                className="mt-5 px-4 py-2 text-xs"
              >
                Talk through your situation
              </Btn>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Membership preview ------------------------------------------ */}
      <Section bg="ink">
        <SectionHead
          tone="dark"
          eyebrow="IRS Protection Plan"
          title={STARTING_AT}
          lede="Ongoing representation coverage, priced by the complexity of your return rather than a single flat rate."
        />
        <div className="mt-10">
          <TierCards tone="dark" detailed={false} />
        </div>
        <TierNote tone="dark" />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <BookBtn tone="dark" />
          <Btn variant="secondary" tone="dark" page="IRSRepresentation">
            See full tier breakdown
          </Btn>
        </div>
      </Section>

      {/* ---- Founder teaser + headshot placeholder ------------------------ */}
      <Section bg="paper">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <Placeholder
            label="Professional headshot — replace with real photo (portrait, ~4:5)"
            minH="360px"
          />
          <div>
            <Eyebrow>Who you work with</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0E1116] sm:text-4xl">
              Sebastian Penaranda, EA
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#6B7280]">
              A Federally Licensed Enrolled Agent — licensed by the U.S.
              Department of the Treasury and admitted to practice before the
              Internal Revenue Service — with a master's degree in accounting
              and taxation and a background in Army intelligence.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <BookBtn />
              <Btn variant="secondary" page="About">
                Read the full background
              </Btn>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Testimonials (placeholder structure) ------------------------- */}
      <Section bg="white">
        <SectionHead
          eyebrow="Client feedback"
          title="What clients say"
          lede="PLACEHOLDER SECTION — replace all three quotes with real client feedback before publishing. Do not publish invented quotes."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="border-dashed">
              <div className="flex gap-1" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} size={15} color="#00A88C" fill="#00A88C" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#6B7280]">"{t.quote}"</p>
              <p className="mt-5 text-sm font-bold text-[#0E1116]">— {t.name}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Closing CTA -------------------------------------------------- */}
      <Section bg="ink">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start with a conversation.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">
            Bring your last return. We will tell you plainly what is solid, what
            is exposed, and what it takes to fix it.
          </p>
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
