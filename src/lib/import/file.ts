/**
 * Spreadsheet file handling: signature sniffing (never trust the extension),
 * macro rejection, sheet listing, and row extraction. The buffer lives in
 * memory only — nothing here writes the uploaded file anywhere.
 */
import * as XLSX from "xlsx";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ROWS = 5000;

export type FileKind = "xlsx" | "csv";

/**
 * Identify the file by its bytes. Accepts .xlsx (ZIP signature) and plain-
 * text CSV; rejects legacy .xls (OLE2 signature), macro workbooks, and
 * anything binary that isn't a ZIP.
 */
export function sniffFileKind(buffer: Buffer, filename: string): FileKind | null {
  const lower = filename.toLowerCase();
  // Reject macro-enabled & legacy formats by name outright.
  if (/\.(xlsm|xltm|xlsb|xls)$/.test(lower)) return null;

  if (buffer.length >= 4) {
    // OLE2 (legacy .xls) — reject even if renamed.
    if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
      return null;
    }
    // ZIP: xlsx family.
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
      return lower.endsWith(".xlsx") ? "xlsx" : null;
    }
  }
  // CSV must be plain text: no NUL bytes in the first 8 KB.
  if (lower.endsWith(".csv")) {
    const head = buffer.subarray(0, 8192);
    for (const byte of head) if (byte === 0) return null;
    return "csv";
  }
  return null;
}

export type ParsedWorkbook = {
  sheetNames: string[];
  /** header-keyed rows for one sheet */
  rowsFor: (sheetName: string) => { headers: string[]; rows: Record<string, unknown>[] };
};

/** Parse the buffer. Throws "macros" if the workbook contains VBA. */
export function readWorkbook(buffer: Buffer, kind: FileKind): ParsedWorkbook {
  const wb =
    kind === "csv"
      ? XLSX.read(buffer.toString("utf8"), { type: "string", cellDates: false })
      : XLSX.read(buffer, { type: "buffer", cellDates: false, bookVBA: true });

  if ((wb as { vbaraw?: unknown }).vbaraw) {
    throw new Error("macros");
  }

  return {
    sheetNames: wb.SheetNames,
    rowsFor(sheetName: string) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return { headers: [], rows: [] };
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: false,
        defval: "",
      });
      const headers: string[] = [];
      const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
      if (range) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
          if (cell?.v != null && String(cell.v).trim() !== "") headers.push(String(cell.v));
        }
      }
      return { headers, rows };
    },
  };
}
