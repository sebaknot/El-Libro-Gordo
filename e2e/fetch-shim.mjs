/**
 * Rewrites every fetch to the placeholder Supabase host onto the local mock,
 * so the real Next.js server (which requires an https Supabase URL) talks to
 * e2e/mock-supabase.mjs. Loaded via NODE_OPTIONS="--import <abs path>".
 */
const TARGET_HOST = "placeholder-e2e.supabase.co";
const MOCK = process.env.E2E_MOCK_ORIGIN || "http://127.0.0.1:4545";

const original = globalThis.fetch;
globalThis.fetch = function patchedFetch(input, init) {
  try {
    const urlString =
      typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    if (urlString && urlString.includes(TARGET_HOST)) {
      const u = new URL(urlString);
      const rewritten = MOCK + u.pathname + u.search;
      if (typeof input === "string" || input instanceof URL) {
        return original(rewritten, init);
      }
      return original(new Request(rewritten, input), init);
    }
  } catch {
    // fall through to the original fetch
  }
  return original(input, init);
};
