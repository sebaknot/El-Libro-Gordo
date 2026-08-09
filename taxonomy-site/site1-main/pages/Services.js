/**
 * Taxonomy — Services
 * Base44 path: pages/Services.js
 *
 * Note: the old "IRS Representation — $50/month membership" card is gone.
 * That card now shows "Starting at $19.99/month" and links to the full tiers.
 */

import React from "react";
import { FileText, Briefcase, ShieldCheck, Users, Globe2, Calculator } from "lucide-react";
import {
  Btn,
  BookBtn,
  Section,
  SectionHead,
  Eyebrow,
  Card,
  IconBadge,
  Bullets,
  TierNote,
  TIERS,
  STARTING_AT,
  TREASURY_LINE,
} from "@/components/brand/Brand";

const CORE = [
  {
    icon: FileText,
    title: "Individual Tax Preparation",
    body: "Federal and state returns prepared to withstand review — not just filed.",
    points: [
      "Multi-state and dual-residency returns",
      "Investment, rental and self-employment income",
      "Prior-year and unfiled return cleanup",
      "Amended returns where a prior preparer got it wrong",
    ],
  },
  {
    icon: Briefcase,
    title: "Business Tax & Entity Work",
    body: "Structure, compliance, and the schedules that draw the most IRS attention.",
    points: [
      "S-Corp, partnership and multi-entity filings",
      "Entity selection and reasonable-compensation analysis",
      "1099 and subcontractor compliance",
      "Depreciation, job costing and basis tracking",
    ],
  },
  {
    icon: ShieldCheck,
    title: "IRS Representation",
    body: "Notices, examinations and collections handled by someone with the federal authority to act on your behalf.",
    points: [
      "Notice review and written response",
      "Examination and audit representation",
      "Collections, payment plans and resolution",
      "Ongoing coverage through the IRS Protection Plan",
    ],
    pricing: true,
  },
];

const ADDITIONAL = [
  {
    icon: Calculator,
    title: "Tax Planning",
    body: "Forward-looking work done before the year closes, while the numbers can still change.",
  },
  {
    icon: Globe2,
    title: "ITIN & International Filing",
    body: "ITIN applications, first-time U.S. filing, foreign income reporting and dual-country exposure.",
  },
  {
    icon: Users,
    title: "Year-Round Advisory",
    body: "A direct line for the decisions that carry tax consequences — before you make them.",
  },
];

export default function Services() {
  return (
    <>
      <section className="bg-[#0E1116] px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow tone="dark">Services</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Preparation, planning, and the authority to defend the return.
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

      {/* Three-card grid — single column on mobile, three across from md up. */}
      <Section bg="paper">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CORE.map((s) => (
            <Card key={s.title} className="flex flex-col">
              <IconBadge icon={s.icon} size={26} />
              <h2 className="mt-4 text-lg font-extrabold text-[#0E1116]">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{s.body}</p>
              <Bullets items={s.points} className="mt-5 flex-1" />

              {s.pricing ? (
                <div className="mt-6 border-t border-[#6B7280]/20 pt-5">
                  <p className="text-sm font-extrabold text-[#0E1116]">{STARTING_AT}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
                    Three tiers —{" "}
                    {TIERS.map((t, i) => (
                      <React.Fragment key={t.name}>
                        {i > 0 ? ", " : ""}
                        {t.name.replace(" Protection", "")} ${t.price}
                      </React.Fragment>
                    ))}
                    .
                  </p>
                  <Btn
                    variant="secondary"
                    page="IRSRepresentation"
                    className="mt-4 w-full px-4 py-2 text-xs"
                  >
                    See full tier breakdown
                  </Btn>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
        <TierNote />
      </Section>

      <Section bg="white">
        <SectionHead
          eyebrow="Also available"
          title="Work that happens between filings"
          lede="Most of what saves a client money is decided long before the return is prepared."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ADDITIONAL.map((s) => (
            <Card key={s.title}>
              <IconBadge icon={s.icon} size={24} />
              <h3 className="mt-4 text-base font-extrabold text-[#0E1116]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{s.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section bg="ink">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Not sure which of these you need?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">
            That is what the first conversation is for. Bring your most recent
            return and we will scope it honestly.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <BookBtn tone="dark" />
            <Btn variant="secondary" tone="dark" page="GetStarted">
              See how it works
            </Btn>
          </div>
        </div>
      </Section>
    </>
  );
}
