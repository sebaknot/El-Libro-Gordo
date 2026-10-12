import { describe, expect, it } from "vitest";
import { canAccessImport, canUndoImport, isUndoDeletable } from "../src/lib/import/access";

describe("role enforcement rules", () => {
  it("owner and agent can import; assistant cannot", () => {
    expect(canAccessImport("owner")).toBe(true);
    expect(canAccessImport("agent")).toBe(true);
    expect(canAccessImport("assistant")).toBe(false);
    expect(canAccessImport("")).toBe(false);
  });
  it("only the owner can undo", () => {
    expect(canUndoImport("owner")).toBe(true);
    expect(canUndoImport("agent")).toBe(false);
    expect(canUndoImport("assistant")).toBe(false);
  });
});

describe("undo safety", () => {
  const finished = new Date("2026-10-01T12:00:00Z");
  const base = {
    importBatchId: "b-1",
    batchId: "b-1",
    updatedAt: new Date("2026-10-01T11:59:58Z"),
    importFinishedAt: finished,
    hasDependents: false,
  };

  it("deletes a record created by the batch and untouched since", () => {
    expect(isUndoDeletable(base)).toBe(true);
  });
  it("keeps records from a different batch or no batch", () => {
    expect(isUndoDeletable({ ...base, importBatchId: "b-2" })).toBe(false);
    expect(isUndoDeletable({ ...base, importBatchId: null })).toBe(false);
  });
  it("keeps records edited by a human after the import finished", () => {
    expect(
      isUndoDeletable({ ...base, updatedAt: new Date("2026-10-02T09:00:00Z") })
    ).toBe(false);
  });
  it("tolerates the import's own writes right around finish time", () => {
    expect(
      isUndoDeletable({ ...base, updatedAt: new Date("2026-10-01T12:00:01Z") })
    ).toBe(true);
  });
  it("keeps records that other data now depends on", () => {
    expect(isUndoDeletable({ ...base, hasDependents: true })).toBe(false);
  });
});
