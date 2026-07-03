import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client-link session: after a correct DOB, we set a short-lived signed cookie
 * scoped to that token. HMAC key is derived from SSN_ENCRYPTION_KEY so no new
 * secret needs provisioning; the derivation string namespaces it.
 */
const SESSION_MINUTES = 30;

function hmacKey(): Buffer {
  const base = process.env.SSN_ENCRYPTION_KEY;
  if (!base) throw new Error("SSN_ENCRYPTION_KEY is not set");
  return createHmac("sha256", "el-libro-gordo/link-session/v1").update(base).digest();
}

export const LINK_SESSION_COOKIE = "vlink";

export function createLinkSession(token: string): { value: string; maxAge: number } {
  const exp = Date.now() + SESSION_MINUTES * 60 * 1000;
  const payload = `${token}.${exp}`;
  const sig = createHmac("sha256", hmacKey()).update(payload).digest("base64url");
  return { value: `${payload}.${sig}`, maxAge: SESSION_MINUTES * 60 };
}

export function verifyLinkSession(cookieValue: string | undefined, token: string): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;
  const [cookieToken, expStr, sig] = parts;
  if (cookieToken !== token) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac("sha256", hmacKey()).update(`${cookieToken}.${expStr}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * CMS-compliant consent language, versioned. The exact string shown is stored
 * verbatim in verification_responses.consent_text_shown — never edit a version
 * in place; add a new one.
 */
export const CONSENT_VERSION = "v1-2026";

export const CONSENT_TEXT: Record<"es" | "en", string> = {
  es: `[${CONSENT_VERSION}] Confirmo que la información proporcionada es verdadera y correcta a mi leal saber y entender. Autorizo a mi agente de seguros a utilizar esta información para buscar, actualizar o renovar mi cobertura de salud del Mercado de Seguros Médicos (Marketplace), y a comunicarse conmigo sobre mi solicitud. Entiendo que proporcionar información falsa puede afectar mi elegibilidad y subsidios.`,
  en: `[${CONSENT_VERSION}] I confirm that the information provided is true and correct to the best of my knowledge. I authorize my insurance agent to use this information to search for, update, or renew my Health Insurance Marketplace coverage, and to contact me about my application. I understand that providing false information may affect my eligibility and subsidies.`,
};

/** Mask helpers for the client-facing confirm page. */
export function maskMemberName(first: string, last: string): string {
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

export function formatIncome(income: number | null): string {
  if (income == null) return "—";
  return `$${Number(income).toLocaleString("en-US")}`;
}
