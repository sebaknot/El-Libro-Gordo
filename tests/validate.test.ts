import { describe, expect, it } from "vitest";
import { applyMapping, groupHouseholds } from "../src/lib/import/grouping";
import { validateRows } from "../src/lib/import/validate";
import type { ExistingClient } from "../src/lib/import/types";

// All data below is fabricated — fake names, fake SSNs (900-xx range), fake phones.
const EXISTING: ExistingClient[] = [
  {
    id: "c-1",
    household_id: "h-1",
    first_name: "Ana",
    last_name: "Prueba",
    dob: "1980-05-01",
    ssn_last4: "6789",
    phone: "+13055550100",
    email: "ana@example.com",
  },
];
const EXISTING_POLICIES = new Map<string, string>([["fb-0001", "c-1"]]);

function rows(fields: Record<string, string>[]) {
  const mapping = {
    Nombre: "first_name",
    Apellido: "last_name",
    "Fecha de nacimiento": "dob",
    Teléfono: "phone",
    SSN: "ssn",
    Familia: "household",
    Póliza: "policy_number",
  };
  return applyMapping(fields, mapping);
}

describe("duplicate detection", () => {
  it("matches an existing client by SSN last-4 + DOB", () => {
    const [r] = validateRows(
      rows([{ Nombre: "Ana", Apellido: "Distinta", "Fecha de nacimiento": "5/1/1980", SSN: "900-12-6789", Teléfono: "3055550199" }]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(r.status).toBe("duplicate");
    expect(r.duplicate).toMatchObject({ kind: "db", reason: "ssn_dob", clientId: "c-1" });
  });

  it("matches by name + DOB", () => {
    const [r] = validateRows(
      rows([{ Nombre: "ANA", Apellido: "prueba", "Fecha de nacimiento": "1980-05-01", Teléfono: "3055550199" }]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(r.duplicate).toMatchObject({ kind: "db", reason: "name_dob" });
  });

  it("matches by phone", () => {
    const [r] = validateRows(
      rows([{ Nombre: "Otra", Apellido: "Persona", "Fecha de nacimiento": "1/1/1990", Teléfono: "(305) 555-0100" }]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(r.duplicate).toMatchObject({ kind: "db", reason: "phone" });
  });

  it("matches by policy number", () => {
    const [r] = validateRows(
      rows([{ Nombre: "Otra", Apellido: "Persona", "Fecha de nacimiento": "1/1/1990", Teléfono: "3055550177", Póliza: "FB-0001" }]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(r.duplicate).toMatchObject({ kind: "db", reason: "policy_number" });
  });

  it("finds duplicates within the file itself", () => {
    const result = validateRows(
      rows([
        { Nombre: "Luis", Apellido: "Nuevo", "Fecha de nacimiento": "2/2/1992", Teléfono: "3055550111" },
        { Nombre: "Luis", Apellido: "Nuevo", "Fecha de nacimiento": "2/2/1992", Teléfono: "3055550112" },
      ]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(result[0].status).toBe("new");
    expect(result[1].status).toBe("duplicate");
    expect(result[1].duplicate).toMatchObject({ kind: "file", reason: "name_dob", row: 2 });
  });

  it("does NOT flag family members sharing a phone within the file", () => {
    const result = validateRows(
      rows([
        { Nombre: "Pedro", Apellido: "Casa", "Fecha de nacimiento": "3/3/1980", Teléfono: "3055550122", Familia: "Casa" },
        { Nombre: "Sofia", Apellido: "Casa", "Fecha de nacimiento": "4/4/1982", Teléfono: "3055550122", Familia: "Casa" },
      ]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(result[1].status).toBe("new");
  });
});

describe("row statuses", () => {
  it("missing name is an error; missing DOB/phone are warnings", () => {
    const result = validateRows(
      rows([
        { Nombre: "", Apellido: "SinNombre" },
        { Nombre: "Clara", Apellido: "SinDatos" },
      ]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(result[0].status).toBe("error");
    expect(result[0].issues).toContain("missing_name");
    expect(result[1].status).toBe("warning");
    expect(result[1].issues).toEqual(expect.arrayContaining(["missing_dob", "missing_phone"]));
  });

  it("bad SSN is a warning and never leaks digits into the row", () => {
    const [r] = validateRows(
      rows([{ Nombre: "Eva", Apellido: "Test", "Fecha de nacimiento": "6/6/1996", Teléfono: "3055550133", SSN: "12345" }]),
      EXISTING,
      EXISTING_POLICIES
    );
    expect(r.issues).toContain("bad_ssn");
    expect(r.clean.ssn).toBeNull();
    expect(r.clean.ssn_last4).toBeNull();
  });
});

describe("household grouping", () => {
  it("groups by household value, falls back to 'Last, First', skips errors", () => {
    const validated = validateRows(
      rows([
        { Nombre: "Pedro", Apellido: "Casa", "Fecha de nacimiento": "3/3/1980", Teléfono: "3055550122", Familia: "Casa Familia" },
        { Nombre: "Sofia", Apellido: "Casa", "Fecha de nacimiento": "4/4/1982", Teléfono: "3055550122", Familia: "Casa Familia" },
        { Nombre: "Solo", Apellido: "Aparte", "Fecha de nacimiento": "5/5/1985", Teléfono: "3055550155" },
        { Nombre: "", Apellido: "Roto" },
      ]),
      [],
      new Map()
    );
    const groups = groupHouseholds(validated);
    expect(groups.size).toBe(2);
    expect(groups.get("Casa Familia")).toHaveLength(2);
    expect(groups.get("Aparte, Solo")).toHaveLength(1);
  });
});
