/**
 * Taxonomy IRS Protection Plan — Subscription Agreement.
 * Base44 path: components/agreement/agreementText.js
 *
 * WHY THIS FILE IS SHAPED LIKE THIS
 * The agreement is stored as structured sections rather than one blob so that
 * the version number can be attached to the record without ever rendering it to
 * the client, and so a new clause can be inserted at a numbered position without
 * renumbering by hand.
 *
 * ►► ACTION REQUIRED — the sections marked PASTE_EXISTING below are your current
 *    Version 3.2 text. I do not have it, so it is not reproduced here. Paste each
 *    one in, applying the TaxOne → Taxonomy rename as you go. Every section whose
 *    text was specified in the update brief (Section 2's bullets and the Important
 *    paragraph, and the whole of 4C) is written out in full and needs no edits.
 *
 * CLIENT-FACING RULE
 * The version number appears nowhere a client can see it — not in the review
 * step, not on the confirmation screen, not in the downloaded or emailed copy.
 * renderAgreementText() enforces that: only audience "firm" emits it.
 */

/* ---------------------------------------------------------------------------
 * VERSION — INTERNAL ONLY
 *
 * Bumped 3.2 → 3.3 because this revision adds clause 4C and materially changes
 * the Section 2 exclusions. Records signed before this deploy stay stamped 3.2;
 * records signed after are stamped 3.3, which is the point of tracking it.
 * Confirm the number matches your own records before publishing.
 * ------------------------------------------------------------------------ */
export const AGREEMENT_VERSION = "3.3";

/** What the client sees as the document title. No version, by design. */
export const AGREEMENT_TITLE = "Subscription Agreement";

/** Marker for text you still need to paste in. Grep for it before publishing. */
const PASTE_EXISTING = (what) =>
  `[PASTE EXISTING ${what} FROM VERSION 3.2 HERE — apply the TaxOne → Taxonomy rename]`;

/* ---------------------------------------------------------------------------
 * CLAUSES SPECIFIED IN THE UPDATE BRIEF — reproduced verbatim
 * ------------------------------------------------------------------------ */

export const HOUSEHOLD_COVERAGE_CLAUSE =
  "If the Client has selected the Household Coverage add-on at enrollment, coverage under this Agreement extends to one (1) additional household member who files a separate individual tax return under their own Social Security Number, provided that individual is claimed as a dependent on the subscribing Client's return or resides in the same household as the subscribing Client. The Household Coverage add-on adds $15.00 per month to the Client's base subscription fee and is subject to the same minimum commitment, waiting period, and pre-existing matter exclusions set forth elsewhere in this Agreement. Coverage under this add-on does not extend to any individual beyond the one additional filer specified, and does not cover a spouse filing a separate return unless that spouse is the specific individual designated under this add-on. Representation of the additional covered household member requires that individual's own separate Power of Attorney (IRS Form 2848) or Tax Information Authorization (IRS Form 8821), as the Firm may only represent individuals who have personally authorized such representation.";

export const FEDERAL_SCOPE_PARAGRAPH =
  "Important: This plan covers matters exclusively before the Internal Revenue Service, a federal agency. This plan does not cover any matter before any state taxing authority (including but not limited to the Florida Department of Revenue, the New York State Department of Taxation and Finance, the Massachusetts Department of Revenue, or any other state agency) or any county or local taxing authority (including but not limited to Palm Beach County or any other county or municipal tax office). State and local tax matters are entirely outside the scope of this Agreement under any circumstance and are not available as a separate engagement under this plan.";

/* ---------------------------------------------------------------------------
 * SECTIONS
 * `body` is an array of paragraphs. `bullets` renders as a list between the
 * body and any `trailing` paragraphs.
 * ------------------------------------------------------------------------ */

export const SECTIONS = [
  {
    id: "1",
    heading: "1. Services Provided",
    body: [
      // The rename applies here — "The TaxOne IRS Protection Plan provides..."
      // becomes "The Taxonomy IRS Protection Plan provides..."
      PASTE_EXISTING("SECTION 1 BODY TEXT"),
    ],
  },

  {
    id: "2",
    heading: "2. Services Not Covered — Escalating Matters",
    body: [PASTE_EXISTING("SECTION 2 INTRO PARAGRAPH")],
    bullets: [
      PASTE_EXISTING("the other Section 2 bullets, in their existing order"),

      // The single "State tax authority representation" bullet is replaced by
      // these two. Verbatim from the update brief.
      "State tax authority representation, including but not limited to state income tax, state sales tax, and any state Department of Revenue matters",
      "County, municipal, or other local tax authority matters, including but not limited to local property tax disputes, local business tax receipts, and county-level sales tax matters",
    ],
    // Sits after the bullet list, before the existing "Note:" paragraph.
    trailing: [
      FEDERAL_SCOPE_PARAGRAPH,
      PASTE_EXISTING('THE EXISTING "Note:" PARAGRAPH ABOUT CORRESPONDENCE AUDITS'),
    ],
  },

  {
    id: "3",
    heading: "3. Fees and Minimum Commitment",
    body: [PASTE_EXISTING("SECTION 3 BODY TEXT")],
  },

  {
    id: "4A",
    heading: "4A. Payment Authorization",
    body: [PASTE_EXISTING("SECTION 4A BODY TEXT")],
  },

  {
    id: "4B",
    heading: "4B. Recurring Billing Authorization",
    body: [PASTE_EXISTING("SECTION 4B BODY TEXT")],
  },

  // ---- NEW — inserted immediately after 4B, per the update brief ----------
  {
    id: "4C",
    heading: "4C. Household Coverage Add-On (If Selected)",
    body: [HOUSEHOLD_COVERAGE_CLAUSE],
  },

  {
    id: "5",
    heading: "5. Term and Cancellation",
    body: [PASTE_EXISTING("SECTION 5 BODY TEXT")],
  },

  {
    id: "6",
    heading: "6. Limitation of Liability",
    body: [PASTE_EXISTING("SECTION 6 BODY TEXT")],
  },

  {
    id: "7",
    heading: "7. Governing Law",
    body: [PASTE_EXISTING("SECTION 7 BODY TEXT")],
  },

  {
    id: "8",
    heading: "8. Entire Agreement",
    body: [PASTE_EXISTING("SECTION 8 BODY TEXT")],
  },

  // Add, remove or reorder to match your actual Version 3.2 structure. Only the
  // position of 4C (directly after 4B) and the Section 2 contents are fixed by
  // the update brief.
];

/* ---------------------------------------------------------------------------
 * RENDERING
 * ------------------------------------------------------------------------ */

/**
 * Flatten the agreement to plain text.
 * @param {"client"|"firm"} audience
 *   "client" — the review step, the signed PDF, the emailed copy. No version.
 *   "firm"   — the admin record only. Stamped with the internal version.
 */
export function renderAgreementText({ audience = "client", signedVersion } = {}) {
  const lines = [AGREEMENT_TITLE];

  if (audience === "firm") {
    lines.push(`Internal version: ${signedVersion || AGREEMENT_VERSION}`);
  }

  lines.push("");

  SECTIONS.forEach((s) => {
    lines.push(s.heading);
    (s.body || []).forEach((p) => lines.push("", p));
    if (s.bullets && s.bullets.length) {
      lines.push("");
      s.bullets.forEach((b) => lines.push(`• ${b}`));
    }
    (s.trailing || []).forEach((p) => lines.push("", p));
    lines.push("", "");
  });

  return lines.join("\n").trim();
}

/** Filename for the downloaded copy. No version — the client sees this. */
export function agreementFilename(clientName) {
  const safe = String(clientName || "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return `taxonomy-subscription-agreement-${safe}-${stamp}.txt`;
}

/** Every unfilled slot. Render this in admin, or check it in a test. */
export function findUnfilledSlots() {
  const hits = [];
  SECTIONS.forEach((s) => {
    [...(s.body || []), ...(s.bullets || []), ...(s.trailing || [])].forEach((t) => {
      if (typeof t === "string" && t.startsWith("[PASTE EXISTING")) {
        hits.push({ section: s.id, text: t });
      }
    });
  });
  return hits;
}
