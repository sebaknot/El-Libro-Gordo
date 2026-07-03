import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Marks totp_enabled after a successful enrollment (called from the enroll page). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return NextResponse.json({ ok: false }, { status: 403 });

  await supabase.from("users").update({ totp_enabled: true }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
