import { describe, expect, it } from "vitest";
import { detectMapping, mappingIsComplete, normalizeHeader } from "../src/lib/import/columns";

describe("normalizeHeader", () => {
  it("strips spaces, punctuation and accents", () => {
    expect(normalizeHeader("Fecha de Nacimiento")).toBe("fechadenacimiento");
    expect(normalizeHeader("Número de Póliza")).toBe("numerodepoliza");
    expect(normalizeHeader("First_Name")).toBe("firstname");
  });
});

describe("detectMapping — English headers", () => {
  it("detects standard English columns", () => {
    const m = detectMapping(["First Name", "Last Name", "DOB", "Phone", "Email", "SSN", "Carrier", "Policy #"]);
    expect(m["First Name"]).toBe("first_name");
    expect(m["Last Name"]).toBe("last_name");
    expect(m["DOB"]).toBe("dob");
    expect(m["Phone"]).toBe("phone");
    expect(m["Email"]).toBe("email");
    expect(m["SSN"]).toBe("ssn");
    expect(m["Carrier"]).toBe("carrier");
    expect(m["Policy #"]).toBe("policy_number");
  });
});

describe("detectMapping — Spanish headers", () => {
  it("detects standard Spanish columns, accents and all", () => {
    const m = detectMapping([
      "Nombre",
      "Apellido",
      "Fecha de nacimiento",
      "Teléfono",
      "Correo electrónico",
      "Seguro Social",
      "Ingresos",
      "Aseguradora",
      "Prima",
      "Subsidio",
      "Número de póliza",
      "Familia",
    ]);
    expect(m["Nombre"]).toBe("first_name");
    expect(m["Apellido"]).toBe("last_name");
    expect(m["Fecha de nacimiento"]).toBe("dob");
    expect(m["Teléfono"]).toBe("phone");
    expect(m["Correo electrónico"]).toBe("email");
    expect(m["Seguro Social"]).toBe("ssn");
    expect(m["Ingresos"]).toBe("annual_income");
    expect(m["Aseguradora"]).toBe("carrier");
    expect(m["Prima"]).toBe("monthly_premium");
    expect(m["Subsidio"]).toBe("subsidy");
    expect(m["Número de póliza"]).toBe("policy_number");
    expect(m["Familia"]).toBe("household");
  });

  it("marks unknown columns as ignore and never assigns a field twice", () => {
    const m = detectMapping(["Nombre", "Name", "Favorite Color"]);
    expect(m["Nombre"]).toBe("first_name");
    expect(m["Name"]).toBe("ignore"); // first_name already taken
    expect(m["Favorite Color"]).toBe("ignore");
  });
});

describe("mappingIsComplete", () => {
  it("requires first and last name", () => {
    expect(mappingIsComplete({ A: "first_name", B: "last_name" })).toBe(true);
    expect(mappingIsComplete({ A: "first_name", B: "phone" })).toBe(false);
    expect(mappingIsComplete({})).toBe(false);
  });
});
