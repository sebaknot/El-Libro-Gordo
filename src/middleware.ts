import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = ["/login", "/auth", "/v"];

/** Returns a description of the config problem, or null if config is usable. */
function configProblem(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is not set";
  if (!key) return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set";
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return "NEXT_PUBLIC_SUPABASE_URL must start with https://";
  } catch {
    return `NEXT_PUBLIC_SUPABASE_URL is not a valid URL (starts with: "${url.slice(0, 12)}…")`;
  }
  if (/["'\s]/.test(key.trim())) return "NEXT_PUBLIC_SUPABASE_ANON_KEY contains quotes or whitespace — re-paste it";
  return null;
}

export async function middleware(request: NextRequest) {
  const problem = configProblem();
  if (problem) {
    return new NextResponse(
      `Configuration error: ${problem}.\nFix it in Vercel → Settings → Environment Variables, then redeploy.`,
      { status: 500, headers: { "content-type": "text/plain" } }
    );
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    // Never leak stack traces; name the failing layer so it's diagnosable.
    const message = err instanceof Error ? err.message : "unknown error";
    return new NextResponse(`Auth middleware error: ${message}`, {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
