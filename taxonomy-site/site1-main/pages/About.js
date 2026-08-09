/**
 * Taxonomy — About Us
 * Base44 path: pages/About.js
 *
 * Replaces the old generic "Our Philosophy" section with a real founder bio.
 *
 * HARD CONSTRAINTS baked into this copy — do not edit them back in:
 *  - No mention of DSS, Diplomatic Security Service, or any current/ongoing
 *    federal law enforcement role, agency, or employer. Army intelligence only.
 *  - No reference to CPA licensure until it is officially conferred.
 *  - The comparison section is against unlicensed / non-representation
 *    preparers. TurboTax is not the competitor and is not named.
 */

import React from "react";
import { ShieldCheck, GraduationCap, Radar, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Btn,
  BookBtn,
  Section,
  SectionHead,
  Eyebrow,
  Card,
  IconBadge,
  Placeholder,
  TREASURY_LINE,
} from "@/components/brand/Brand";

const COMPARISON = [
  {
    tone: "bad",
    icon: AlertTriangle,
    title: "Unlicensed preparers",
    points: [
      "No credential required to prepare a return for pay in most states",
      "Cannot represent you before the IRS at all",
      "Often unreachable once filing season ends",
      "A notice becomes entirely your problem to answer",
    ],
  },
  {
    tone: "bad",
    icon: AlertTriangle,
    title: "Limited-rights preparers",
    points: [
      "May only represent returns they personally prepared, and only at the initial audit level",
      "No authority in collections or appeals",
      "Prior-year problems fall outside what they can touch",
      "You are referred out at exactly the point it gets serious",
    ],
  },
  {
    tone: "good",
    icon: CheckCircle2,
    title: "Taxonomy",
    points: [
      "Federally Licensed Enrolled Agent — unlimited representation rights before the IRS",
      "Authority to act on any tax year, including returns we did not prepare",
      "Notices, examinations, collections and appeals handled directly",
      "Year-round, not seasonal",
    ],
  },
];

export default function About() {
  return (
    <>
      <section className="bg-[#0E1116] px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow tone="dark">About</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Federal licensure, advanced tax education, and an analytical
            background built for complexity.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            {TREASURY_LINE}
          </p>
        </div>
      </section>

      {/* ---- Founder bio --------------------------------------------------- */}
      <Section bg="paper">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[340px_1fr] md:gap-14">
          <div>
            <Placeholder
              label="Professional headshot — replace with real photo (portrait, ~4:5)"
              minH="420px"
            />
            <p className="mt-4 text-sm font-extrabold text-[#0E1116]">
              Sebastian Penaranda, EA
            </p>
            <p className="text-sm text-[#6B7280]">Founder, Taxonomy</p>
          </div>

          <div>
            <Eyebrow>Credentials</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#0E1116] sm:text-4xl">
              A Federally Licensed Enrolled Agent
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#6B7280]">
              Sebastian Penaranda is a Federally Licensed Enrolled Agent —
              licensed by the U.S. Department of the Treasury and admitted to
              practice before the Internal Revenue Service. This is the same
              unlimited representation authority held by tax attorneys, granted
              directly by the federal government.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex gap-4">
                <div className="pt-1">
                  <IconBadge icon={GraduationCap} size={24} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0E1116]">Education</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                    Holds a Bachelor of Science in Accounting and a Master of
                    Science in Accounting with a specialization in Taxation —
                    deep technical grounding beyond standard Enrolled Agent
                    licensure exam preparation alone.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="pt-1">
                  <IconBadge icon={Radar} size={24} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0E1116]">
                    Background — Army intelligence
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                    Before tax practice, Sebastian served in Army intelligence,
                    developing skills in critical thinking, complex analysis,
                    and evidence-based decision-making at the highest levels of
                    military operations. That work meant assembling a complete
                    picture from incomplete information, verifying every
                    assumption before acting on it, and handling sensitive
                    material with absolute discretion.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
                    That same discipline — careful analysis, precision under
                    pressure, and seeing the full picture before acting — now
                    shapes how every client's tax situation is handled.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="pt-1">
                  <IconBadge icon={ShieldCheck} size={24} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0E1116]">
                    Why it matters together
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                    The result is a rare combination: federal licensure,
                    advanced tax education, and an analytical background built
                    for handling complexity — brought together for one purpose,
                    protecting clients' financial interests with the same rigor
                    once applied to national security matters.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <BookBtn />
              <Btn variant="secondary" page="IRSRepresentation">
                IRS Protection Plan
              </Btn>
            </div>
          </div>
        </div>
      </Section>

      {/* ---- How we work (distinct from the representation-rights section
             on the IRS Representation page — this one is about standards) --- */}
      <Section bg="white">
        <SectionHead
          eyebrow="How we work"
          title="Standards, not volume"
          lede="The representation argument lives on the IRS Protection Plan page. This is about how the work itself gets done."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            [
              Scale,
              "Positions we can defend",
              "Every position taken on a return is one we are prepared to support in writing if the IRS asks. If a deduction cannot survive scrutiny, we say so before it is filed rather than after.",
            ],
            [
              Radar,
              "Documented, not assumed",
              "Numbers get traced to source documents. Where records are missing, we reconstruct them properly instead of estimating and hoping the question never comes.",
            ],
            [
              ShieldCheck,
              "Discretion by default",
              "Client financial information is handled with the same care as sensitive material — limited access, deliberate handling, nothing discussed outside the engagement.",
            ],
          ].map(([Icon, t, b]) => (
            <Card key={t}>
              <IconBadge icon={Icon} size={24} />
              <h3 className="mt-4 text-base font-extrabold text-[#0E1116]">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{b}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---- Comparison — vs unlicensed / limited-rights preparers --------- */}
      <Section bg="paper">
        <SectionHead
          eyebrow="The difference"
          title="Not every preparer can speak to the IRS for you"
          lede="The line that matters is not price or software. It is whether the person who signed your return has the authority to defend it."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {COMPARISON.map((col) => {
            const good = col.tone === "good";
            return (
              <div
                key={col.title}
                className={`rounded-lg border p-6 sm:p-7 ${
                  good
                    ? "border-[#00A88C] bg-white ring-1 ring-[#00A88C]"
                    : "border-[#6B7280]/25 bg-white"
                }`}
              >
                <col.icon
                  size={24}
                  color={good ? "#00A88C" : "#6B7280"}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <h3
                  className={`mt-4 text-base font-extrabold ${
                    good ? "text-[#0E1116]" : "text-[#6B7280]"
                  }`}
                >
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.points.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: good ? "#00A88C" : "#6B7280" }}
                      />
                      <span className="text-sm leading-relaxed text-[#6B7280]">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      <Section bg="ink">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Work with someone licensed to represent you.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70">
            {TREASURY_LINE}
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
