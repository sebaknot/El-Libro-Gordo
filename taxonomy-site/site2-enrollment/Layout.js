/**
 * Taxonomy — Site 2 (enrollment site) layout.
 * Base44 path: Layout.js  (root of the tax1a-enrollment-plan app)
 *
 * SCOPE — visual only. This file deliberately touches nothing but chrome:
 * header, footer, brand tokens, and a colour-override layer.
 *
 * DO NOT change, from this file or anywhere else in the enrollment app:
 *   - the enrollment flow logic
 *   - Stripe payment links
 *   - agreement / legal text
 *   - the FAQ content that already works
 *
 * The two sites stay separate properties. This just makes them look like the
 * same company designed both.
 *
 * The <style> block below is a safety net that recolours legacy navy/orange
 * utility classes still sitting in your existing components. It is a stopgap —
 * work through BRAND_MIGRATION.md to replace those classes properly, then you
 * can delete the "LEGACY COLOUR OVERRIDES" section.
 */

import React from "react";

const LOGO_URL_HEADER = ""; // ~36px tall — paste the Base44 asset URL
const LOGO_URL_FOOTER = ""; // ~64px tall

const PHONE = "561-530-3366";
const PHONE_HREF = "tel:+15615303366";
const MAIN_SITE_URL = "https://tax1a.com";

function LogoSlot({ height, url, label }) {
  if (url) {
    return <img src={url} alt="Taxonomy" style={{ height }} className="w-auto" />;
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

export default function Layout({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#0E1116] antialiased">
      <style>{`
        :root {
          --tx-ink:         #0E1116;
          --tx-signal:      #00D4B4;
          --tx-signal-dark: #00A88C;
          --tx-paper:       #F5F5F0;
          --tx-slate:       #6B7280;
          --tx-white:       #FFFFFF;
          --tx-font-head: "Space Grotesk", "Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          --tx-font-body: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        html, body { font-family: var(--tx-font-body); background: var(--tx-paper); }
        h1, h2, h3, h4 { font-family: var(--tx-font-head); letter-spacing: -0.02em; }
        ::selection { background: var(--tx-signal); color: var(--tx-ink); }

        /* ================= LEGACY COLOUR OVERRIDES (temporary) =============
           Retargets the old orange accent and navy surfaces onto the new
           palette without editing flow components. Flat fills only — the
           gradient rules below intentionally flatten any leftover gradients. */

        [class*="bg-orange-"], [class*="bg-amber-"] { background-color: var(--tx-signal) !important; color: var(--tx-ink) !important; }
        [class*="text-orange-"], [class*="text-amber-"] { color: var(--tx-signal-dark) !important; }
        [class*="border-orange-"], [class*="border-amber-"] { border-color: var(--tx-signal-dark) !important; }
        [class*="ring-orange-"], [class*="ring-amber-"] { --tw-ring-color: var(--tx-signal-dark) !important; }
        [class*="fill-orange-"], [class*="fill-amber-"] { fill: var(--tx-signal-dark) !important; }

        .bg-navy, .bg-slate-900, .bg-slate-950, .bg-blue-900, .bg-blue-950,
        .bg-gray-900, .bg-gray-950, .bg-zinc-900, .bg-zinc-950 { background-color: var(--tx-ink) !important; }
        .text-navy, .text-blue-900, .text-blue-950 { color: var(--tx-ink) !important; }

        /* Kill leftover gradients — flat fills only. */
        [class*="bg-gradient-"] { background-image: none !important; }

        /* Never put a shadow on the logo. */
        header img, footer img { box-shadow: none !important; filter: none !important; }
        /* ================= END LEGACY COLOUR OVERRIDES ==================== */
      `}</style>

      <header className="border-b border-white/10 bg-[#0E1116]">
        <div className="mx-auto flex h-[68px] w-full max-w-5xl items-center justify-between gap-4 px-5 sm:px-6">
          <a href={MAIN_SITE_URL} className="flex shrink-0 items-center">
            <LogoSlot height={36} url={LOGO_URL_HEADER} label="Logo 36px" />
          </a>
          <div className="flex items-center gap-5">
            <span className="hidden text-xs font-bold uppercase tracking-[0.16em] text-[#00D4B4] sm:inline">
              IRS Protection Plan
            </span>
            <a
              href={PHONE_HREF}
              className="text-sm font-medium text-white/80 transition-colors hover:text-[#00D4B4]"
            >
              {PHONE}
            </a>
          </div>
        </div>
      </header>

      {/* Enrollment flow renders untouched. */}
      <main>{children}</main>

      <footer className="bg-[#0E1116] px-5 pb-10 pt-14 text-white sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <LogoSlot height={64} url={LOGO_URL_FOOTER} label="Logo 64px" />
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65">
                Licensed by the U.S. Department of the Treasury — admitted to
                practice before the Internal Revenue Service.
              </p>
            </div>
            <div className="space-y-2.5">
              <a
                href={MAIN_SITE_URL}
                className="block text-sm text-white/70 hover:text-[#00D4B4]"
              >
                tax1a.com
              </a>
              <a href={PHONE_HREF} className="block text-sm text-white/70 hover:text-[#00D4B4]">
                {PHONE}
              </a>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-xs text-white/50">
              © {year} Taxonomy. All rights reserved.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/40">
              Plans start at $19.99/month. Tier assignment is made by Taxonomy
              based on review of your most recent tax return.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
