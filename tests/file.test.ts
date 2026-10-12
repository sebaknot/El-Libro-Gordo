import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readWorkbook, sniffFileKind, MAX_ROWS } from "../src/lib/import/file";

// A tiny fake workbook — fabricated people only.
function fakeXlsxBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Nombre", "Apellido", "Teléfono"],
      ["Prueba", "Uno", "3055550101"],
      ["Prueba", "Dos", "3055550102"],
    ]),
    "Hoja1"
  );
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("sniffFileKind", () => {
  it("accepts a real .xlsx by ZIP signature", () => {
    expect(sniffFileKind(fakeXlsxBuffer(), "book.xlsx")).toBe("xlsx");
  });
  it("rejects macro/legacy extensions outright", () => {
    const buf = fakeXlsxBuffer();
    expect(sniffFileKind(buf, "book.xlsm")).toBeNull();
    expect(sniffFileKind(buf, "book.xls")).toBeNull();
  });
  it("rejects a renamed legacy .xls by its OLE2 signature", () => {
    const ole = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), Buffer.alloc(64)]);
    expect(sniffFileKind(ole, "book.xlsx")).toBeNull();
    expect(sniffFileKind(ole, "book.csv")).toBeNull();
  });
  it("accepts plain-text CSV and rejects binary posing as CSV", () => {
    expect(sniffFileKind(Buffer.from("Nombre,Apellido\nPrueba,Uno\n"), "book.csv")).toBe("csv");
    expect(sniffFileKind(Buffer.from([0x00, 0x01, 0x02]), "book.csv")).toBeNull();
  });
  it("rejects a ZIP that claims to be CSV", () => {
    expect(sniffFileKind(fakeXlsxBuffer(), "book.csv")).toBeNull();
  });
});

describe("readWorkbook", () => {
  it("round-trips sheets, headers and rows", () => {
    const wb = readWorkbook(fakeXlsxBuffer(), "xlsx");
    expect(wb.sheetNames).toEqual(["Hoja1"]);
    const { headers, rows } = wb.rowsFor("Hoja1");
    expect(headers).toEqual(["Nombre", "Apellido", "Teléfono"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]["Nombre"]).toBe("Prueba");
  });
  it("reads CSV text", () => {
    const wb = readWorkbook(Buffer.from("Nombre,Apellido\nPrueba,Uno\n"), "csv");
    const { headers, rows } = wb.rowsFor(wb.sheetNames[0]);
    expect(headers).toEqual(["Nombre", "Apellido"]);
    expect(rows).toHaveLength(1);
  });
  it("exposes the row limit used by the wizard", () => {
    expect(MAX_ROWS).toBe(5000);
  });
});
