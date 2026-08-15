import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAutoTasks } from "@/lib/tasks/generate";

export const dynamic = "force-dynamic";

/**
 * Daily task sweep (vercel.json cron, 8:00 UTC). Protected by CRON_SECRET —
 * Vercel Cron sends it as a Bearer token automatically when the env var is
 * set on the project.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await generateAutoTasks(createAdminClient());
    return NextResponse.json({ ok: true, created: summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
