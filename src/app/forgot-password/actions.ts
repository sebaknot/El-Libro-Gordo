"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Always lands on the same generic confirmation, whether or not the email
 * exists — never reveal which addresses are registered. The redirect URL is
 * deliberately hardcoded to the production domain (this app has had
 * domain-mismatch trouble before; a reset link must never point at a preview
 * deployment).
 */
export async function sendPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (email) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://oneinsurancefl.com/reset-password",
    });
    // Log real failures (rate limits, config) server-side; the user always
    // sees the same generic message.
    if (error) console.error("resetPasswordForEmail failed:", error.code, error.message);
  }

  redirect("/forgot-password?sent=1");
}
