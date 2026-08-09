/**
 * Taxonomy — Book an Appointment
 * Base44 path: pages/BookAppointment.js
 *
 * Two things this page fixes:
 *  1. The form has a real confirmation state — a visible success panel replaces
 *     the form on submit, plus an error state if the write fails. No silent post.
 *  2. "Video meeting link included (if applicable)" is gone. The policy below
 *     is a definite yes/no statement.
 *
 * WIRING THE SUBMIT — one function, one place:
 *   Uncomment the entity import and the create() call in submitAppointment().
 *   Create an "Appointment" entity in Base44 with fields:
 *     full_name (text), email (text), phone (text), service (text),
 *     preferred_time (text), message (long text)
 *   If you use Calendly/Cal.com instead, drop the embed into <CalendarEmbed/>
 *   below and delete the form.
 */

import React, { useState } from "react";
import { CheckCircle2, Video, Clock, FileText, Phone, AlertCircle } from "lucide-react";
// import { Appointment } from "@/entities/Appointment"; // <- uncomment after creating the entity

import {
  Btn,
  Section,
  SectionHead,
  Eyebrow,
  Card,
  IconBadge,
  PHONE,
  PHONE_HREF,
  STARTING_AT,
  TIER_NOTE,
  TREASURY_LINE,
} from "@/components/brand/Brand";

const SERVICES = [
  "Individual tax preparation",
  "Business tax / entity work",
  "IRS notice, audit or collections",
  "IRS Protection Plan enrollment",
  "Tax planning",
  "ITIN / international filing",
  "Something else",
];

const EXPECT = [
  {
    icon: Clock,
    title: "45 minutes, scheduled",
    body: "You get a confirmed time slot, not a callback window. If we need longer, we book a second session rather than rushing this one.",
  },
  {
    icon: Video,
    /* CLEAR POLICY — replaces "Video meeting link included (if applicable)".
       If appointments are actually phone-first, swap this block for:
       title: "Phone appointment", body: "Every appointment is a phone call. We
       call you at the number you provide at your scheduled time. Video is
       available on request — just ask in the confirmation email reply." */
    title: "Every appointment is a video meeting",
    body: "A secure video link is emailed to you as soon as your time is confirmed. Prefer a phone call instead? Reply to the confirmation email and we will switch it — no charge, no rescheduling.",
  },
  {
    icon: FileText,
    title: "Bring your most recent return",
    body: "It is the fastest way for us to see what is solid and what is exposed. It is also how your IRS Protection Plan tier gets assigned if you enroll.",
  },
];

function Field({ label, name, type = "text", required = false, autoComplete }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#0E1116]">
        {label} {required ? <span className="text-[#00A88C]">*</span> : null}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-md border border-[#6B7280]/30 bg-white px-4 py-3 text-sm text-[#0E1116] outline-none transition-colors placeholder:text-[#6B7280]/60 focus:border-[#00A88C] focus:ring-1 focus:ring-[#00A88C]"
      />
    </label>
  );
}

export default function BookAppointment() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function submitAppointment(e) {
    e.preventDefault();
    setStatus("sending");

    const fd = new FormData(e.target);
    const payload = {
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      service: fd.get("service"),
      preferred_time: fd.get("preferred_time"),
      message: fd.get("message"),
    };

    try {
      // await Appointment.create(payload); // <- uncomment after creating the entity
      console.log("Appointment request:", payload);
      setStatus("sent");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <>
      <section className="bg-[#0E1116] px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow tone="dark">Book an appointment</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Start with a conversation.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            {TREASURY_LINE}
          </p>
        </div>
      </section>

      <Section bg="paper">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          {/* ---- Form / confirmation ------------------------------------- */}
          <div>
            {status === "sent" ? (
              <div className="rounded-lg border border-[#00A88C] bg-white p-8 ring-1 ring-[#00A88C]">
                <CheckCircle2 size={40} color="#00A88C" strokeWidth={2} aria-hidden="true" />
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-[#0E1116]">
                  Request received.
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[#6B7280]">
                  We will confirm your appointment by email within one business
                  day, and your secure video link comes with that confirmation.
                  If it is urgent — an IRS deadline, a notice with a response
                  date — call{" "}
                  <a href={PHONE_HREF} className="font-semibold text-[#00A88C] underline">
                    {PHONE}
                  </a>{" "}
                  instead of waiting.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Btn variant="secondary" page="IRSRepresentation">
                    Review the IRS Protection Plan
                  </Btn>
                  <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="text-sm font-semibold text-[#6B7280] underline underline-offset-4 hover:text-[#00A88C]"
                  >
                    Book another appointment
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitAppointment} className="space-y-5">
                {status === "error" ? (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-md border border-[#6B7280]/30 bg-white p-4"
                  >
                    <AlertCircle size={20} color="#0E1116" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-[#0E1116]">
                      Something went wrong sending your request. Please try
                      again, or call{" "}
                      <a href={PHONE_HREF} className="font-semibold underline">
                        {PHONE}
                      </a>
                      .
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Full name" name="full_name" required autoComplete="name" />
                  <Field label="Email" name="email" type="email" required autoComplete="email" />
                  <Field label="Phone" name="phone" type="tel" required autoComplete="tel" />
                  <label className="block">
                    <span className="text-sm font-semibold text-[#0E1116]">
                      What do you need? <span className="text-[#00A88C]">*</span>
                    </span>
                    <select
                      name="service"
                      required
                      defaultValue=""
                      className="mt-2 w-full rounded-md border border-[#6B7280]/30 bg-white px-4 py-3 text-sm text-[#0E1116] outline-none focus:border-[#00A88C] focus:ring-1 focus:ring-[#00A88C]"
                    >
                      <option value="" disabled>
                        Select one
                      </option>
                      {SERVICES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <Field label="Preferred day and time" name="preferred_time" />

                <label className="block">
                  <span className="text-sm font-semibold text-[#0E1116]">
                    Anything we should know beforehand?
                  </span>
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="Deadlines, an IRS notice you have received, or the situation in a sentence."
                    className="mt-2 w-full rounded-md border border-[#6B7280]/30 bg-white px-4 py-3 text-sm text-[#0E1116] outline-none transition-colors placeholder:text-[#6B7280]/60 focus:border-[#00A88C] focus:ring-1 focus:ring-[#00A88C]"
                  />
                </label>

                {/* Primary CTA — filled, matching every other page. */}
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#00D4B4] px-6 py-3.5 text-sm font-semibold tracking-wide text-[#0E1116] transition-colors hover:bg-[#00A88C] disabled:opacity-60 sm:w-auto"
                >
                  {status === "sending" ? "Sending…" : "Book an Appointment"}
                </button>

                <p className="text-xs leading-relaxed text-[#6B7280]">
                  Submitting this form requests an appointment; it does not
                  create a client relationship until we confirm it.
                </p>
              </form>
            )}
          </div>

          {/* ---- Sidebar --------------------------------------------------- */}
          <aside className="space-y-5">
            <Card>
              <IconBadge icon={Phone} size={22} />
              <h3 className="mt-3 text-base font-extrabold text-[#0E1116]">
                Prefer to call?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                Reach us directly at{" "}
                <a href={PHONE_HREF} className="font-semibold text-[#00A88C] underline">
                  {PHONE}
                </a>
                .
              </p>
            </Card>
            <Card>
              <h3 className="text-base font-extrabold text-[#0E1116]">
                Already know you want coverage?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                The IRS Protection Plan — {STARTING_AT.toLowerCase()}. {TIER_NOTE}
              </p>
              <Btn variant="secondary" page="IRSRepresentation" className="mt-4 px-4 py-2 text-xs">
                See the plans
              </Btn>
            </Card>
          </aside>
        </div>
      </Section>

      {/* ---- What to expect ---------------------------------------------- */}
      <Section bg="white">
        <SectionHead eyebrow="What to expect" title="How the appointment works" />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {EXPECT.map((x) => (
            <Card key={x.title}>
              <IconBadge icon={x.icon} size={24} />
              <h3 className="mt-4 text-base font-extrabold text-[#0E1116]">{x.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{x.body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
