/**
 * Which catalog cards are out of the planar deck (FR-017–FR-021). `null` (no record) means the
 * selection was never saved: the default-off list applies (spec 007 FR-017).
 */
export interface PlanarSelection {
  /** Card ids; ids missing from the current catalog are tolerated and kept (R11). */
  disabledIds: string[];
  /** ISO timestamp, stamped by `PlanarSelectionService.save()`; the sync LWW key. */
  updatedAt: string;
}
