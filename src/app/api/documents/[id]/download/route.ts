import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/** Redirects to a short-lived (60s) signed URL for a private document. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: doc } = await supabase
    .from("documents")
    .select("id, storage_path, file_name")
    .eq("id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });
  if (error || !signed) return NextResponse.json({ error: "sign failed" }, { status: 500 });

  await logAudit("view", "document", doc.id, { file_name: doc.file_name });
  return NextResponse.redirect(signed.signedUrl);
}
