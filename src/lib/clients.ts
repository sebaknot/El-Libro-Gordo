import { z } from "zod";

/**
 * Explicit column list — clients.ssn_encrypted has no SELECT grant, so a
 * `select('*')` on clients would fail. Always select these columns.
 */
export const CLIENT_COLUMNS =
  "id, created_at, updated_at, household_id, first_name, last_name, dob, ssn_last4, phone, whatsapp_phone, email, status, is_primary, immigration_doc_type, notes_summary";

export const clientSchema = z.object({
  household_id: z.string().uuid(),
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().or(z.literal("").transform(() => null)),
  phone: z.string().trim().max(30).nullable().or(z.literal("").transform(() => null)),
  whatsapp_phone: z.string().trim().max(30).nullable().or(z.literal("").transform(() => null)),
  email: z.string().trim().email().nullable().or(z.literal("").transform(() => null)),
  status: z.enum(["active", "pending", "canceled", "medicare_transition", "deceased"]),
  is_primary: z.boolean(),
  immigration_doc_type: z.string().trim().nullable().or(z.literal("").transform(() => null)),
  notes_summary: z.string().trim().nullable().or(z.literal("").transform(() => null)),
});

export const householdSchema = z.object({
  household_name: z.string().trim().min(1, "Household name is required"),
  address_street: z.string().trim().nullable().or(z.literal("").transform(() => null)),
  address_city: z.string().trim().nullable().or(z.literal("").transform(() => null)),
  address_state: z.string().trim().max(2).nullable().or(z.literal("").transform(() => null)),
  address_zip: z.string().trim().max(10).nullable().or(z.literal("").transform(() => null)),
  annual_income: z.coerce.number().nonnegative().nullable().or(z.literal("").transform(() => null)),
  income_verified_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().or(z.literal("").transform(() => null)),
  household_size: z.coerce.number().int().positive().nullable().or(z.literal("").transform(() => null)),
  preferred_language: z.enum(["es", "en"]),
  preferred_channel: z.enum(["sms", "whatsapp", "email", "call"]).nullable().or(z.literal("").transform(() => null)),
});

export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}
