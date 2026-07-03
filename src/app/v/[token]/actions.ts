"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLinkByToken, auditClientLink } from "@/lib/links";
import {
  createLinkSession,
  verifyLinkSession,
  LINK_SESSION_COOKIE,
  CONSENT_TEXT,
} from "@/lib/verification";
import type { VLang } from "@/lib/vdict";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

async function userAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

/** Step 2 of the blueprint: the DOB gate. 5 failures lock the link. */
export async function verifyDob(token: string, lang: VLang, formData: FormData) {
  const result = await getLinkByToken(token);
  if (!result.ok) redirect(`/v/${token}?lang=${lang}`);
  const link = result.link;

  const submitted = String(formData.get("dob") ?? "").trim();
  const admin = createAdminClient();

  const { data: household } = await admin
    .from("households")
    .select("id, primary_client_id")
    .eq("id", link.household_id)
    .single();

  let primaryDob: string | null = null;
  if (household?.primary_client_id) {
    const { data: primary } = await admin
      .from("clients")
      .select("dob")
      .eq("id", household.primary_client_id)
      .single();
    primaryDob = primary?.dob ?? null;
  }
  if (!primaryDob) {
    // No primary DOB on file: accept any member's DOB in the household.
    const { data: members } = await admin
      .from("clients")
      .select("dob")
      .eq("household_id", link.household_id)
      .not("dob", "is", null);
    const match = (members ?? []).some((m) => m.dob === submitted);
    if (!match) {
      await failDob(link.id, link.dob_attempts, link.household_id, lang, token);
    }
  } else if (primaryDob !== submitted) {
    await failDob(link.id, link.dob_attempts, link.household_id, lang, token);
  }

  await auditClientLink("link_opened", link.id, { dob_verified: true }, await clientIp());

  const session = createLinkSession(token);
  const cookieStore = await cookies();
  cookieStore.set(LINK_SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/v",
    maxAge: session.maxAge,
  });
  redirect(`/v/${token}/confirm?lang=${lang}`);
}

async function failDob(
  linkId: string,
  attempts: number,
  householdId: string,
  lang: VLang,
  token: string
): Promise<never> {
  const admin = createAdminClient();
  const newAttempts = attempts + 1;
  const lock = newAttempts >= 5;
  await admin
    .from("verification_links")
    .update({ dob_attempts: newAttempts, ...(lock ? { status: "locked" } : {}) })
    .eq("id", linkId);
  await auditClientLink(
    "login_failed",
    linkId,
    { dob_attempts: newAttempts, locked: lock },
    await clientIp()
  );
  if (lock) {
    const { data: h } = await admin
      .from("households")
      .select("household_name")
      .eq("id", householdId)
      .single();
    await admin.from("tasks").insert({
      household_id: householdId,
      title: `Verification link locked: ${h?.household_name ?? "household"}`,
      detail: "5 failed DOB attempts on a verification link. Call the client to verify manually.",
      type: "verification_review",
      status: "open",
      auto_generated: true,
    });
  }
  redirect(`/v/${token}?lang=${lang}&error=wrong`);
}

/** Requires a valid DOB session; used by both confirm-page actions. */
async function requireLinkSession(token: string) {
  const result = await getLinkByToken(token);
  if (!result.ok) redirect(`/v/${token}`);
  const cookieStore = await cookies();
  const cookie = cookieStore.get(LINK_SESSION_COOKIE)?.value;
  if (!verifyLinkSession(cookie, token)) redirect(`/v/${token}`);
  return result.link;
}

async function finalizeSubmission(
  link: { id: string; household_id: string; use_count: number; campaign_id: string | null },
  confirmedNoChanges: boolean,
  changes: Record<string, unknown> | null,
  consentText: string
) {
  const admin = createAdminClient();

  await admin.from("verification_responses").insert({
    verification_link_id: link.id,
    household_id: link.household_id,
    confirmed_no_changes: confirmedNoChanges,
    changes,
    client_ip: await clientIp(),
    user_agent: await userAgent(),
    consent_text_shown: consentText,
    consent_checked: true,
  });

  await admin
    .from("verification_links")
    .update({ use_count: link.use_count + 1, status: "used" })
    .eq("id", link.id);

  // Advance the renewal pipeline if this link belongs to a campaign.
  if (link.campaign_id) {
    await admin
      .from("renewal_pipeline")
      .update({ stage: confirmedNoChanges ? "responded" : "needs_changes" })
      .eq("campaign_id", link.campaign_id)
      .eq("household_id", link.household_id);
  }

  const { data: h } = await admin
    .from("households")
    .select("household_name")
    .eq("id", link.household_id)
    .single();

  if (!confirmedNoChanges) {
    await admin.from("tasks").insert({
      household_id: link.household_id,
      title: `Review changes: ${h?.household_name ?? "household"}`,
      detail: "Client reported changes via verification link. Review and approve in the Reviews queue.",
      type: "verification_review",
      status: "open",
      auto_generated: true,
    });
  }

  await auditClientLink(
    "link_submitted",
    link.id,
    { confirmed_no_changes: confirmedNoChanges },
    await clientIp()
  );
}

/** Path A: "Todo sigue igual" — one tap. */
export async function submitNoChanges(token: string, lang: VLang, formData: FormData) {
  const link = await requireLinkSession(token);
  if (formData.get("consent") !== "on") {
    redirect(`/v/${token}/confirm?lang=${lang}&error=consent`);
  }
  await finalizeSubmission(link, true, null, CONSENT_TEXT[lang]);
  redirect(`/v/${token}/done?lang=${lang}`);
}

/** Path B: "Algo cambió" — structured diff + optional income-proof upload. */
export async function submitChanges(token: string, lang: VLang, formData: FormData) {
  const link = await requireLinkSession(token);
  if (formData.get("consent") !== "on") {
    redirect(`/v/${token}/changes?lang=${lang}&error=consent`);
  }

  const str = (name: string) => String(formData.get(name) ?? "").trim() || null;

  const changes: Record<string, unknown> = {};

  const income = str("new_income")?.replace(/[$,]/g, "");
  if (income && Number.isFinite(Number(income))) changes.income = { annual_income: Number(income) };

  const employment = str("employment");
  if (employment) changes.employment = employment.slice(0, 1000);

  const address = {
    street: str("street"),
    city: str("city"),
    state: str("state")?.slice(0, 2).toUpperCase() ?? null,
    zip: str("zip")?.slice(0, 10) ?? null,
  };
  if (address.street || address.city || address.zip) changes.address = address;

  const contact = { phone: str("phone"), email: str("email") };
  if (contact.phone || contact.email) changes.contact = contact;

  const removed = formData.getAll("remove_member").map(String).filter(Boolean);
  if (removed.length > 0) changes.members_removed = removed.slice(0, 12);

  const added: { first_name: string; last_name: string; dob: string | null }[] = [];
  for (let i = 1; i <= 3; i++) {
    const first = str(`add_first_${i}`);
    const last = str(`add_last_${i}`);
    if (first && last) added.push({ first_name: first, last_name: last, dob: str(`add_dob_${i}`) });
  }
  if (added.length > 0) changes.members_added = added;

  // Optional income-proof photo → private documents bucket.
  const file = formData.get("income_proof") as File | null;
  if (file && file.size > 0 && file.size <= 15 * 1024 * 1024) {
    const admin = createAdminClient();
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${link.household_id}/uploads/${Date.now()}_${safeName}`;
    const { error: upErr } = await admin.storage
      .from("documents")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (!upErr) {
      await admin.from("documents").insert({
        household_id: link.household_id,
        storage_path: path,
        doc_type: "income_proof",
        uploaded_by: null,
        file_name: file.name,
        size_bytes: file.size,
      });
      changes.income_proof_uploaded = true;
    }
  }

  if (Object.keys(changes).length === 0) {
    // Nothing actually filled in — treat as confirmation.
    await finalizeSubmission(link, true, null, CONSENT_TEXT[lang]);
  } else {
    await finalizeSubmission(link, false, changes, CONSENT_TEXT[lang]);
  }
  redirect(`/v/${token}/done?lang=${lang}`);
}
