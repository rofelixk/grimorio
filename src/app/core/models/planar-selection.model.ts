/**
 * Which catalog cards are out of the planar deck (FR-017–FR-021). `null` (no record) means the
 * selection was never changed, so every card is enabled (FR-018).
 */
export interface PlanarSelection {
  /** Card ids; ids missing from the current catalog are tolerated and kept (R11). */
  disabledIds: string[];
  /** ISO timestamp, stamped by `PlanarSelectionService.save()`; the sync LWW key. */
  updatedAt: string;
}
