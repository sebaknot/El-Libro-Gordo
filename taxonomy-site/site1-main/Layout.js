/**
 * Taxonomy — Site 1 (main company site) layout.
 * Base44 path: Layout.js  (root — wraps every page)
 *
 * Owns: brand tokens, header, mobile nav, footer, logo containers,
 * auto-updating copyright year.
 */

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, Phone, Mail } from "lucide-react";
import { BookBtn, PHONE, PHONE_HREF, TREASURY_LINE, ENROLLMENT_URL } from "@/components/brand/Brand";

/* ---------------------------------------------------------------------------
 * LOGO
 * Upload the logo in Base44, then paste its URL into these two constants.
 * While they are empty, a correctly-sized dashed placeholder renders instead,
 * so the space is reserved and nothing ships with the old hexagon badge.
 * No drop shadows, no gradients on the logo — ever.
 * ------------------------------------------------------------------------ */
const LOGO_URL_HEADER = ""; // ~36px tall, light-on-dark version
const LOGO_URL_FOOTER = ""; // ~64px tall, light-on-dark version

const NAV = [
  { label: "Home", page: "Home" },
  { label: "Services", page: "Services" },
  { label: "IRS Representation", page: "IRSRepresentation" },
  { label: "About Us", page: "About" },
  { label: "Get Started", page: "GetStarted" },
];

function LogoSlot({ height, url, label }) {
  if (url) {
    return (
      <img
        src={url}
        alt="Taxonomy"
        style={{ height }}
        className="w-auto"
        // no shadow / no filter by design
      />
    );
  }
  return (
    <div
      style={{ height, minWidth: height * 3.6 }}
      className="flex items-center justify-center rounded border border-dashed border-white/35 px-3"
      aria-label="Taxonomy"
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">
        {label}
      </span>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const year = new Date().getFullYear(); // auto-updates — never goes stale

  const isActive = (page) =>
    currentPageName === page || location.pathname === createPageUrl(page);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#0E1116] antialiased">
      {/* ---- Brand tokens + type scale ---------------------------------- */}
      <style>{`
        :root {
          --tx-ink:         #0E1116;
          --tx-signal:      #00D4B4;
          --tx-signal-dark: #00A88C;
          --tx-paper:       #F5F5F0;
          --tx-slate:       #6B7280;
          --tx-white:       #FFFFFF;

          /* Headings: bold geometric sans (keep whatever the site already
             uses — replace the first entry if you have a specific family).
             Body: clean readable sans. No serif fonts anywhere. */
          --tx-font-head: "Space Grotesk", "Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          --tx-font-body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        html, body { font-family: var(--tx-font-body); background: var(--tx-paper); }
        h1, h2, h3, h4, .tx-head { font-family: var(--tx-font-head); letter-spacing: -0.02em; }
        ::selection { background: var(--tx-signal); color: var(--tx-ink); }
        a { text-underline-offset: 3px; }
      `}</style>

      {/* ---- Header ------------------------------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0E1116]">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          {/* Logo container — left aligned, ~36px */}
          <Link to={createPageUrl("Home")} className="flex shrink-0 items-center">
            <LogoSlot height={36} url={LOGO_URL_HEADER} label="Logo 36px" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.page)
                    ? "text-[#00D4B4]"
                    : "text-white/80 hover:text-[#00D4B4]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <BookBtn tone="dark" className="px-5 py-2.5" />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="text-white lg:hidden"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-white/10 bg-[#0E1116] lg:hidden">
            <nav className="mx-auto flex w-full max-w-6xl flex-col px-5 py-4 sm:px-6">
              {NAV.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setOpen(false)}
                  className={`border-b border-white/10 py-3.5 text-base font-medium ${
                    isActive(item.page) ? "text-[#00D4B4]" : "text-white/85"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-5" onClick={() => setOpen(false)}>
                <BookBtn tone="dark" className="w-full" />
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      {/* ---- Footer ------------------------------------------------------ */}
      <footer className="bg-[#0E1116] px-5 pb-10 pt-16 text-white sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              {/* Logo container — larger, ~64px */}
              <LogoSlot height={64} url={LOGO_URL_FOOTER} label="Logo 64px" />
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65">
                {TREASURY_LINE}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#00D4B4]">
                Site
              </h3>
              <ul className="mt-4 space-y-2.5">
                {NAV.map((item) => (
                  <li key={item.page}>
                    <Link
                      to={createPageUrl(item.page)}
                      className="text-sm text-white/70 hover:text-[#00D4B4]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to={createPageUrl("BookAppointment")}
                    className="text-sm text-white/70 hover:text-[#00D4B4]"
                  >
                    Book an Appointment
                  </Link>
                </li>
                <li>
                  <a
                    href={ENROLLMENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white/70 hover:text-[#00D4B4]"
                  >
                    Enroll in the Protection Plan
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#00D4B4]">
                Contact
              </h3>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href={PHONE_HREF}
                    className="flex items-center gap-2.5 text-sm text-white/70 hover:text-[#00D4B4]"
                  >
                    <Phone size={16} color="#00D4B4" aria-hidden="true" />
                    {PHONE}
                  </a>
                </li>
                <li>
                  {/* TODO: confirm the public support inbox before publishing. */}
                  <a
                    href="mailto:info@tax1a.com"
                    className="flex items-center gap-2.5 text-sm text-white/70 hover:text-[#00D4B4]"
                  >
                    <Mail size={16} color="#00D4B4" aria-hidden="true" />
                    info@tax1a.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/50">
              © {year} Taxonomy. All rights reserved.
            </p>
            <p className="text-xs text-white/40">
              Enrolled Agent — U.S. Department of the Treasury.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
