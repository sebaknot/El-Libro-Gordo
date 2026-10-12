import type { IssueCode } from "./types";

/**
 * Friendly, bilingual descriptions for row issues. Deliberately value-free
 * for DOB and SSN — the message names the field, never the data.
 */
export const ISSUE_TEXT: Record<IssueCode, { en: string; es: string }> = {
  missing_name: {
    en: "First and last name are required",
    es: "Se requiere nombre y apellido",
  },
  missing_dob: {
    en: "No date of birth — we'll import it and flag it for cleanup",
    es: "Sin fecha de nacimiento — se importará y quedará marcado para completar",
  },
  bad_dob: {
    en: "The date of birth couldn't be read — check the format",
    es: "No se pudo leer la fecha de nacimiento — revise el formato",
  },
  missing_phone: {
    en: "No phone number — we'll import it and flag it for cleanup",
    es: "Sin teléfono — se importará y quedará marcado para completar",
  },
  bad_phone: {
    en: "The phone number looks too short or invalid",
    es: "El teléfono parece demasiado corto o inválido",
  },
  bad_email: {
    en: "The email address doesn't look valid",
    es: "El correo electrónico no parece válido",
  },
  bad_ssn: {
    en: "The SSN should have 9 digits",
    es: "El seguro social debe tener 9 dígitos",
  },
  bad_income: {
    en: "The income isn't a number we can read",
    es: "El ingreso no es un número que podamos leer",
  },
  bad_year: {
    en: "The plan year doesn't look like a year",
    es: "El año del plan no parece un año",
  },
  formula_neutralized: {
    en: "A cell started with a formula character (=, +, @) — we removed it for safety",
    es: "Una celda empezaba con un carácter de fórmula (=, +, @) — lo quitamos por seguridad",
  },
  new_carrier: {
    en: "New carrier — it will be created",
    es: "Aseguradora nueva — se creará",
  },
};

export const DUPLICATE_REASON_TEXT: Record<string, { en: string; es: string }> = {
  ssn_dob: { en: "same SSN + date of birth", es: "mismo seguro social + fecha de nacimiento" },
  name_dob: { en: "same name + date of birth", es: "mismo nombre + fecha de nacimiento" },
  phone: { en: "same phone number", es: "mismo teléfono" },
  policy_number: { en: "same policy number", es: "mismo número de póliza" },
};

export function issueText(code: IssueCode, locale: "en" | "es"): string {
  return ISSUE_TEXT[code]?.[locale] ?? code;
}
