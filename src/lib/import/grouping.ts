import type { MappedRow, ValidatedRow } from "./types";

/**
 * Group validated rows into households: rows sharing a `household` value (or
 * falling back to "Last, First") become one household; the first row of each
 * group is the primary member. Error rows never join a group.
 */
export function groupHouseholds(rows: ValidatedRow[]): Map<string, ValidatedRow[]> {
  const groups = new Map<string, ValidatedRow[]>();
  for (const row of rows) {
    if (row.status === "error") continue;
    const key =
      row.clean.household?.trim() ||
      `${row.clean.last_name ?? ""}, ${row.clean.first_name ?? ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return groups;
}

/** Spreadsheet (header-keyed) rows → MappedRow[], applying a column mapping. */
export function applyMapping(
  rawRows: Record<string, unknown>[],
  mapping: Record<string, string>
): MappedRow[] {
  return rawRows.map((raw, idx) => {
    const fields: MappedRow["fields"] = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (field === "ignore") continue;
      const value = raw[header];
      if (value != null && String(value).trim() !== "") {
        fields[field as keyof MappedRow["fields"]] = String(value);
      }
    }
    return { row: idx + 2, fields }; // +2: 1-based, after the header row
  });
}
