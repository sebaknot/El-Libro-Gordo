import { PLATFORM_FIELDS, type ColumnMapping, type PlatformField } from "./types";

export { PLATFORM_FIELDS };

/** Lowercase, strip spaces/underscores/dashes/accents — "Fecha de Nacimiento" → "fechadenacimiento". */
export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_\-.#°ºª]+/g, "");
}

/** English + Spanish aliases per platform field (normalized form). */
export const COLUMN_ALIASES: Record<PlatformField, string[]> = {
  first_name: ["firstname", "first", "nombre", "nombres", "primernombre", "name"],
  last_name: ["lastname", "last", "apellido", "apellidos", "surname"],
  dob: ["dob", "dateofbirth", "birthdate", "birthday", "fechadenacimiento", "nacimiento", "fechanacimiento"],
  phone: ["phone", "phonenumber", "cell", "cellphone", "mobile", "telefono", "tel", "celular", "numerodetelefono"],
  whatsapp_phone: ["whatsapp", "whatsappphone", "whatsappnumber", "numerodewhatsapp"],
  email: ["email", "correo", "emailaddress", "correoelectronico", "mail"],
  ssn: ["ssn", "socialsecurity", "social", "socialsecuritynumber", "segurosocial", "numerodesegurosocial", "ssnitin", "itin"],
  household: ["household", "householdname", "family", "familia", "hogar", "grupofamiliar", "casa"],
  address: ["address", "street", "direccion", "addressstreet", "domicilio", "streetaddress"],
  city: ["city", "ciudad"],
  state: ["state", "estado", "st"],
  zip: ["zip", "zipcode", "postal", "codigopostal", "postalcode"],
  annual_income: ["annualincome", "income", "ingreso", "ingresos", "ingresoanual", "ingresosanuales", "yearlyincome"],
  household_size: ["householdsize", "familysize", "size", "miembros", "personasenelhogar", "tamanodelhogar", "tamanodefamilia"],
  language: ["language", "lang", "idioma", "preferredlanguage", "idiomapreferido"],
  carrier: ["carrier", "company", "aseguradora", "insurer", "insurancecompany", "compania", "companiadeseguros"],
  plan_name: ["planname", "plan", "nombredelplan"],
  plan_year: ["planyear", "year", "ano", "anodelplan", "anoplan"],
  policy_number: ["policynumber", "policy", "memberid", "poliza", "policyno", "numerodepoliza", "polizanumero", "iddemiembro"],
  monthly_premium: ["monthlypremium", "premium", "prima", "primamensual", "costomensual"],
  subsidy: ["subsidy", "subsidyamount", "aptc", "subsidio", "creditofiscal", "taxcredit"],
};

/**
 * Guess a mapping from spreadsheet headers (English or Spanish). Headers that
 * match nothing come back as "ignore" so the user sees every column in the
 * mapping step. First match wins; a field is never assigned twice.
 */
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const taken = new Set<PlatformField>();

  for (const header of headers) {
    const n = normalizeHeader(header);
    let match: PlatformField | undefined;
    for (const field of PLATFORM_FIELDS) {
      if (taken.has(field)) continue;
      if (n === normalizeHeader(field) || COLUMN_ALIASES[field].includes(n)) {
        match = field;
        break;
      }
    }
    if (match) {
      mapping[header] = match;
      taken.add(match);
    } else {
      mapping[header] = "ignore";
    }
  }
  return mapping;
}

/** A mapping is usable once first and last name are both mapped. */
export function mappingIsComplete(mapping: ColumnMapping): boolean {
  const mapped = new Set(Object.values(mapping));
  return mapped.has("first_name") && mapped.has("last_name");
}
