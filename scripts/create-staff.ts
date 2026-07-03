/**
 * Bootstrap a staff account (auth user + users row).
 *
 * Usage:
 *   npm run staff:create -- --email mom@example.com --name "Maria Gordo" --role owner --password "temp-password"
 *
 * The user signs in with the temp password and is forced through TOTP
 * enrollment before reaching any page.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const name = arg("name");
  const role = arg("role") ?? "assistant";
  const password = arg("password");

  if (!email || !name || !password) {
    console.error('Usage: npm run staff:create -- --email X --name "Full Name" --role owner|agent|assistant --password X');
    process.exit(1);
  }
  if (!["owner", "agent", "assistant"].includes(role)) {
    console.error("role must be owner | agent | assistant");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !authUser.user) {
    console.error("auth user creation failed:", authErr?.message);
    process.exit(1);
  }

  const { error: rowErr } = await admin.from("users").insert({
    id: authUser.user.id,
    email,
    full_name: name,
    role,
    active: true,
  });
  if (rowErr) {
    console.error("users row insert failed:", rowErr.message);
    process.exit(1);
  }

  console.log(`✔ Staff account created: ${email} (${role})`);
  console.log("  They must enroll TOTP 2FA on first sign-in.");
}

main();
