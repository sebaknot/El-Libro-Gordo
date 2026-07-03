import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { CLIENT_COLUMNS } from "@/lib/clients";

export const dynamic = "force-dynamic";

/** Full Book export — one row per client, server-generated .xlsx, audit-logged. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: staff } = await supabase
    .from("users")
    .select("id, active")
    .eq("id", user.id)
    .single();
  if (!staff?.active) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      `${CLIENT_COLUMNS},
       households(household_name, address_street, address_city, address_state, address_zip,
                  annual_income, household_size, preferred_language, preferred_channel),
       policies(plan_name, plan_type, plan_year, monthly_premium, subsidy_amount, net_premium,
                policy_number, status, carriers(name))`
    )
    .order("last_name");
  if (error) return NextResponse.json({ error: "query failed" }, { status: 500 });

  type Row = Record<string, string | number | null>;
  const rows: Row[] = (clients ?? []).map((c) => {
    const h = c.households as unknown as Record<string, unknown> | null;
    const policies = (c.policies as unknown as Record<string, unknown>[]) ?? [];
    const current =
      policies
        .filter((p) => p.status === "active")
        .sort((a, b) => Number(b.plan_year) - Number(a.plan_year))[0] ?? policies[0];

    return {
      "Last Name": c.last_name,
      "First Name": c.first_name,
      DOB: c.dob,
      "SSN Last 4": c.ssn_last4,
      Phone: c.phone,
      WhatsApp: c.whatsapp_phone,
      Email: c.email,
      Status: c.status,
      Household: (h?.household_name as string) ?? null,
      Address: [h?.address_street, h?.address_city, h?.address_state, h?.address_zip]
        .filter(Boolean)
        .join(", "),
      "Annual Income": (h?.annual_income as number) ?? null,
      "Household Size": (h?.household_size as number) ?? null,
      Language: (h?.preferred_language as string) ?? null,
      Channel: (h?.preferred_channel as string) ?? null,
      Carrier: ((current?.carriers as Record<string, unknown>)?.name as string) ?? null,
      Plan: (current?.plan_name as string) ?? null,
      "Plan Year": (current?.plan_year as number) ?? null,
      "Policy #": (current?.policy_number as string) ?? null,
      "Monthly Premium": (current?.monthly_premium as number) ?? null,
      Subsidy: (current?.subsidy_amount as number) ?? null,
      "Net Premium": (current?.net_premium as number) ?? null,
      "Policy Status": (current?.status as string) ?? null,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Full Book");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  await logAudit("export", "full_book", null, { rows: rows.length });

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="full-book-${stamp}.xlsx"`,
    },
  });
}
