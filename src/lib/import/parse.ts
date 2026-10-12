/**
 * Field parsing & sanitization. Everything here is pure so it can run in the
 * CLI, in server actions, and in tests. Nothing in this module logs.
 */

const MAX_CELL_LENGTH = 200;

/**
 * Sanitize one free-text cell: trim, strip control characters, cap length,
 * and neutralize spreadsheet formula injection (leading =, +, -, @, tab, CR
 * — anything Excel might execute on re-export). Returns the cleaned value
 * and whether a formula prefix was removed.
 */
export function sanitizeCell(value: unknown): { value: string; neutralized: boolean } {
  let s = String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (s.length > MAX_CELL_LENGTH) s = s.slice(0, MAX_CELL_LENGTH);
  // A leading apostrophe is Excel's own "treat as text" escape — drop it.
  s = s.replace(/^'+/, "");
  const neutralized = /^[=+@\t\r]|^-[^\d.]/.test(s);
  if (neutralized) {
    s = s.replace(/^[=+@\t\r-]+/, "").trim();
  }
  return { value: s, neutralized };
}

/**
 * Parse a date out of a spreadsheet cell: Excel serial numbers, ISO
 * (YYYY-MM-DD), and US formats (M/D/YYYY, M-D-YY…). DD/MM is assumed when the
 * first number can't be a month. Returns YYYY-MM-DD or null.
 */
export function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  // Excel serial date (days since 1900). Plausible DOB range ≈ 1900–2100.
  if (/^\d{1,6}(\.\d+)?$/.test(v)) {
    const serial = Number(v);
    if (serial >= 367 && serial <= 73415) {
      // Excel's 1900 leap-year bug: serials > 59 are off by one.
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + Math.round(serial) * 86400000);
      return d.toISOString().slice(0, 10);
    }
    return null;
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (iso) return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const parts = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(v);
  if (parts) {
    let [, a, b, y] = parts;
    let year = Number(y);
    if (year < 100) {
      const currentTwoDigit = new Date().getFullYear() % 100;
      year += year > currentTwoDigit ? 1900 : 2000;
    }
    let month = Number(a);
    let day = Number(b);
    // US order by default; flip when the first number can't be a month.
    if (month > 12 && day <= 12) [month, day] = [day, month];
    return buildDate(year, month, day);
  }

  // "January 5, 1980" and similar — let the engine try, carefully.
  const t = Date.parse(v);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const year = d.getFullYear();
    if (year >= 1900 && year <= 2100) {
      return `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  return null;
}

function buildDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Reject rollovers like Feb 30.
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** Normalize a phone number to E.164, US default. Returns null when hopeless. */
export function parsePhone(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function parseEmail(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null;
}

/** SSN: exactly 9 digits once separators are stripped. Returns digits or null. */
export function parseSsn(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 ? digits : null;
}

/** "***-**-1234" — the only way an SSN ever leaves the server. */
export function maskSsn(last4: string | null | undefined): string {
  return last4 ? `***-**-${last4}` : "—";
}

/** "$45,000.50" → 45000.5. Returns null for blanks or non-numbers. */
export function parseMoney(value: string): number | null {
  const v = value.replace(/[$,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseIntSafe(value: string): number | null {
  const n = Number(value.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseLanguage(value: string | undefined): "en" | "es" {
  return value?.trim().toLowerCase().startsWith("en") ? "en" : "es";
}
