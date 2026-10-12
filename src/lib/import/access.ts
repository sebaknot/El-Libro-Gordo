/**
 * Access + undo-safety rules for the import feature, kept pure so they're
 * unit-testable. The database re-enforces both independently (RLS on
 * import_batches; owner check inside admin_undo_import()).
 */

export const IMPORT_ROLES = ["owner", "agent"] as const;
export const UNDO_ROLES = ["owner"] as const;

export function canAccessImport(role: string): boolean {
  return (IMPORT_ROLES as readonly string[]).includes(role);
}

export function canUndoImport(role: string): boolean {
  return (UNDO_ROLES as readonly string[]).includes(role);
}

/**
 * Mirror of admin_undo_import()'s per-record rule: a record is deletable by
 * undo only when the batch created it, nothing touched it after the import
 * finished, and nothing else depends on it.
 */
export function isUndoDeletable(record: {
  importBatchId: string | null;
  batchId: string;
  updatedAt: Date;
  importFinishedAt: Date;
  hasDependents: boolean;
}): boolean {
  if (record.importBatchId !== record.batchId) return false;
  if (record.hasDependents) return false;
  // 2-second grace: the import's own writes (SSN encryption, primary-client
  // linking) bump updated_at right around finished_at.
  return record.updatedAt.getTime() <= record.importFinishedAt.getTime() + 2000;
}
