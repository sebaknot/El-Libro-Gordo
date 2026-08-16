import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPipelineAutomation } from "@/lib/pipeline/reminders";

export const dynamic = "force-dynamic";

/**
 * Daily pipeline automation (vercel.json cron, 9:00 UTC — staggered after
 * the 8:00 task sweep). Same CRON_SECRET Bearer protection as
 * /api/cron/generate-tasks.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (request.headers.get("host") ? `https://${request.headers.get("host")}` : null);

  try {
    const summary = await runPipelineAutomation(createAdminClient(), baseUrl);
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
