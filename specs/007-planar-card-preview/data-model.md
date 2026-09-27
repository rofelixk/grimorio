# Data Model: Planar Card Preview in Deck Settings

Nothing new is persisted or synced. The only new data is a constant that ships with the app. The
rest is view state that lives while the deck settings are open.

## Default-off list (new, shipped constant; FR-016)

`src/app/core/data/planechase/default-off.ts`:

```ts
export const DEFAULT_OFF_IDS: readonly string[]
```

| Card | Kind | Set | Oracle id |
|---|---|---|---|
| Otaria | plane | opca | `29e3371d-aa41-46a9-921a-96565be47eff` |
| Temple of Atropos | plane | who | `9c925057-ac3d-461e-b505-f80e2fd38c8c` |
| Sanctum of Serra | plane | opca | `f0c8ce35-b627-485c-bd64-d7eae47b8efa` |
| Norn's Dominion | plane | opca | `9d58f647-3f83-4f65-a944-c6236db7c422` |
| Planewide Disaster | phenomenon | moc | `a34b272b-084b-4ff1-8b02-d95116ccfeab` |
| Morphic Tide | phenomenon | opca | `302e4ac2-522b-4a0a-850a-d856639ea2a4` |
| Lethe Lake | plane | opca | `85592710-8637-4726-8b92-552b9be677c0` |
| Unleash the Flux | phenomenon | who | `14066888-66f6-4903-8de2-cc961aa45d8d` |

- The ids are `PlanarCard.id` (oracle id), which stays the same across reprints and card-data
  syncs.
- An id missing from the catalog is ignored (006 R11), the same as an unknown id in a saved
  selection.
- Validity: 151 − 8 = 143 enabled cards, 5 of the 8 are planes, so the default passes
  `validateSelection` (≥ 10 cards, ≥ 1 plane). A unit test asserts this against the real
  `cards.json`, so a future list or catalog change can't make the default invalid unnoticed.

## Planar deck selection (existing, 006; meaning of `null` changed)

`PlanarSelection { disabledIds: string[]; updatedAt: string }`, stored per profile or device.

| State | Meaning before (006) | Meaning now (007) |
|---|---|---|
| `null` (no record) | every card enabled | every card enabled except `DEFAULT_OFF_IDS` (FR-017) |
| saved record | its `disabledIds` are off | unchanged: its `disabledIds` alone decide (FR-018) |

- `enabledCards(cards, null)` applies the default. Its callers (the game view's start and
  validation, the deck view's restart check) need no change.
- The deck view's draft seeds from `selection?.disabledIds ?? DEFAULT_OFF_IDS`.
- `null` still means "never saved": `PlanarSelectionService` doesn't write it, sync doesn't upload
  it (`SyncService.syncPlanarSelection` only upserts a non-null local selection), and a remote
  selection still replaces a local `null`.
- The `PlanarSelection` model comment and 006 FR-018's "every card enabled" wording in code
  comments are updated to point at the default.

## Preview state (new, view-scoped; not persisted)

Owned by `PlanarPreviewController` (provided by `PlanechaseDeck`, destroyed with it).

| Field | Type | Notes |
|---|---|---|
| `preview` | `{ id: string; mode: 'popover' \| 'dialog' } \| null` | At most one preview (FR-012) |
| `variant` | `'narrow' \| 'wide'` | Set when the dialog opens, from `(max-width: 640px)`; never updated while open (spec edge case) |
| `anchor` | `HTMLElement \| null` | The popover's tile element, for placement |
| `historyPushed` | `boolean` | Whether the dialog's history entry is current (R6) |
| open / close timers | timeout handles | 300 ms open, 150 ms close (FR-005, FR-006) |

Derived:

- `visibleOrder = sets.filter(s => !collapsed.has(s.code)).flatMap(s => s.cards)`: the dialog's
  navigation order (FR-009a).
- `current`: the `PlanarCard` for `preview.id`.
- `position`: `{ index, total }` of `current` in `visibleOrder`, for "{set} · {i} de {n}".
- `hasPrevious` / `hasNext`: from `position`.
- `on`: `!draft.has(preview.id)` (FR-003).

### State transitions

```text
            pointer rests 300ms on tile                   pointer leaves tile+popover 150ms / Esc
   null ─────────────────────────────▶ popover(id) ───────────────────────────────▶ null
    │                                    │  ▲   pointer enters another tile
    │                                    │  └── (immediate) popover(otherId)
    │  long-press / right-click /        │
    │  Menu / Shift+F10                  │ right-click / Menu / Shift+F10
    ▼                                    ▼
  dialog(id) ◀───────────────────────────┘
    │  Anterior / Próxima → dialog(adjacent id in visibleOrder)
    │  ✕ / Esc / backdrop / system back / route leave → null (focus → tile of current id)
    │
  any state ── confirming() turns true, or current card's set collapses ──▶ null   (FR-013)
  null ── while confirming() ── any trigger ──▶ null (ignored)                        (FR-013)
```

The long-press hold is per-tile gesture state (tile-local: start point, timer, `holdFired`,
`is-holding`), not part of `preview`.
