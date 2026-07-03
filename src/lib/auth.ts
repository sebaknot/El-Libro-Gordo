import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffUser = {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "agent" | "assistant";
  totp_enabled: boolean;
  active: boolean;
};

/**
 * Auth gate for every staff page:
 * 1. Must have a Supabase session.
 * 2. Must exist in `users` and be active.
 * 3. Must be at AAL2 (TOTP verified). No factor enrolled → forced to /mfa/enroll;
 *    factor enrolled but session at AAL1 → /mfa/verify. 2FA is mandatory.
 */
export async function requireStaff(): Promise<StaffUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel !== "aal2") {
    if (aal.nextLevel === "aal2") redirect("/mfa/verify");
    redirect("/mfa/enroll");
  }

  const { data: staff } = await supabase
    .from("users")
    .select("id, email, full_name, role, totp_enabled, active")
    .eq("id", user.id)
    .single();

  if (!staff || !staff.active) redirect("/login?error=not_staff");
  return staff as StaffUser;
}

/** Same gate, plus a role restriction. */
export async function requireRole(roles: StaffUser["role"][]): Promise<StaffUser> {
  const staff = await requireStaff();
  if (!roles.includes(staff.role)) redirect("/dashboard?error=forbidden");
  return staff;
}
