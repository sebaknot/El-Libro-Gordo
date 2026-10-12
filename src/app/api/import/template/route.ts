import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Owner/agent-gated template download: expected columns + one example row. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: staff } = await supabase
    .from("users")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!staff?.active || !["owner", "agent"].includes(staff.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const headers = [
    "First Name",
    "Last Name",
    "DOB",
    "Phone",
    "Email",
    "SSN",
    "Household",
    "Address",
    "City",
    "State",
    "Zip",
    "Annual Income",
    "Household Size",
    "Language",
    "Carrier",
    "Plan Name",
    "Plan Year",
    "Policy Number",
    "Monthly Premium",
    "Subsidy",
  ];
  // Fake example person — never real data.
  const example = [
    "Maria",
    "Ejemplo",
    "01/15/1985",
    "(305) 555-0134",
    "maria@example.com",
    "123-45-6789",
    "Ejemplo Family",
    "123 Main St",
    "Miami",
    "FL",
    "33101",
    "45000",
    "3",
    "es",
    "Florida Blue",
    "Silver 2100",
    "2026",
    "FB123456",
    "350",
    "320",
  ];
  const readme = [
    ["El Libro Gordo — Import template / Plantilla de importación"],
    [""],
    ["EN: Headers can be in English or Spanish — we detect both (e.g. 'Nombre' = First Name,"],
    ["'Fecha de nacimiento' = DOB). Only First Name and Last Name are required; everything"],
    ["else is optional. Rows sharing the same Household value become one family."],
    [""],
    ["ES: Los encabezados pueden ir en inglés o español — detectamos ambos (p. ej. 'Nombre',"],
    ["'Fecha de nacimiento'). Solo Nombre y Apellido son obligatorios; todo lo demás es"],
    ["opcional. Las filas con el mismo valor de Hogar se agrupan como una familia."],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, example]), "Clients");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "Read me - Léame");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="el-libro-gordo-import-template.xlsx"',
    },
  });
}
