"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Users always get a generic message, but the server log distinguishes a
    // wrong password from an infrastructure problem (network, bad keys, rate
    // limit) so outages don't masquerade as typos. No staff session exists
    // yet, so the failure can't go through the audit RPC — this log line is
    // the record.
    const credentialsProblem = error.code === "invalid_credentials" || error.status === 400;
    console.warn(`login failed (${credentialsProblem ? "bad credentials" : "auth service error"})`, {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    redirect(credentialsProblem ? "/login?error=invalid" : "/login?error=service");
  }

  await logAudit("login", "session", null, { email });

  // Mandatory 2FA: route by assurance level.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    if (aal?.nextLevel === "aal2") redirect("/mfa/verify");
    redirect("/mfa/enroll");
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
