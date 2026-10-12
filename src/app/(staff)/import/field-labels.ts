import type { PlatformField } from "@/lib/import/types";

/** Bilingual labels for the mapping dropdowns and preview columns. */
export const FIELD_LABELS: Record<PlatformField, { en: string; es: string }> = {
  first_name: { en: "First name", es: "Nombre" },
  last_name: { en: "Last name", es: "Apellido" },
  dob: { en: "Date of birth", es: "Fecha de nacimiento" },
  phone: { en: "Phone", es: "Teléfono" },
  whatsapp_phone: { en: "WhatsApp", es: "WhatsApp" },
  email: { en: "Email", es: "Correo electrónico" },
  ssn: { en: "SSN", es: "Seguro social" },
  household: { en: "Household / family", es: "Hogar / familia" },
  address: { en: "Street address", es: "Dirección" },
  city: { en: "City", es: "Ciudad" },
  state: { en: "State", es: "Estado" },
  zip: { en: "ZIP code", es: "Código postal" },
  annual_income: { en: "Annual income", es: "Ingreso anual" },
  household_size: { en: "Household size", es: "Personas en el hogar" },
  language: { en: "Language", es: "Idioma" },
  carrier: { en: "Carrier", es: "Aseguradora" },
  plan_name: { en: "Plan name", es: "Nombre del plan" },
  plan_year: { en: "Plan year", es: "Año del plan" },
  policy_number: { en: "Policy #", es: "Número de póliza" },
  monthly_premium: { en: "Monthly premium", es: "Prima mensual" },
  subsidy: { en: "Subsidy", es: "Subsidio" },
};
