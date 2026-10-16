/**
 * Mints the auth cookies a signed-in 2FA'd owner would have, by letting
 * @supabase/ssr itself serialize a session into a cookie jar. Prints JSON
 * [{name, value}] for the Playwright run. Fake user, fake JWT (signature is
 * never verified client-side).
 */
import "./fetch-shim.mjs";
import { createServerClient } from "@supabase/ssr";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

const nowSec = Math.floor(Date.now() / 1000);
const accessToken = [
  b64url({ alg: "HS256", typ: "JWT" }),
  b64url({
    sub: OWNER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "owner@example.com",
    aal: "aal2",
    amr: [{ method: "totp", timestamp: nowSec }],
    session_id: "22222222-2222-4222-8222-222222222222",
    iat: nowSec,
    exp: nowSec + 60 * 60 * 24 * 30,
  }),
  "e2efakesig", // length % 4 must not be 1 to pass auth-js's base64url check
].join(".");

const jar = new Map();
const client = createServerClient(
  "https://placeholder-e2e.supabase.co",
  "placeholder-anon-key",
  {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  }
);

const { error } = await client.auth.setSession({
  access_token: accessToken,
  refresh_token: "fake-refresh-token",
});
if (error) {
  console.error("setSession failed:", error.message);
  process.exit(1);
}
console.log(JSON.stringify([...jar.entries()].map(([name, value]) => ({ name, value }))));
