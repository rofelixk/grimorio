# Data Model: Shared Planechase

**Feature**: `006-shared-planechase` | **Date**: 2026-09-27

## 1. Shipped card data (project files, read-only at runtime)

### `src/app/core/data/planechase/cards.json` (written by `npm run sync:planechase`)

```ts
interface PlanarCardData {
  cards: PlanarCardRecord[];          // sorted: set releasedAt desc, set code, name
}

interface PlanarCardRecord {
  id: string;                         // oracle_id — stable across reprints (R1)
  name: string;                       // English, never translated (FR-005)
  kind: 'plane' | 'phenomenon';
  typeLine: string;                   // English, e.g. "Plane — Zendikar" / "Phenomenon"
  text: string;                       // English static/triggered text; '' for phenomena
  ability: string | null;             // chaos (plane) or encounter (phenomenon); null = plane with no chaos (R2)
  set: { code: string; name: string; releasedAt: string };  // newest non-gold printing's set; official English name
  images: { small: string; large: string };                 // that printing's Scryfall image addresses
  hash: string;                       // 16 hex of sha256(JSON.stringify([typeLine, text, ability])) (R3)
}
```

Validation (enforced by the script, not the app):
- `id`s are unique, and so are `name`s.
- Every field is non-empty, except `text`, which is `''` for phenomena, and `ability`, which is
  `null` only for planes.

### `src/app/core/data/planechase/cards.pt-br.json` (written by `/planechase-translate`)

```ts
type PlanarTranslations = Record<string, PlanarTranslation>;   // key = card id; keys sorted

interface PlanarTranslation {
  sourceHash: string;                 // the card's `hash` when translated
  typeLine: string;                   // e.g. "Plano — Zendikar" / "Fenômeno"
  text: string;
  ability: string | null;             // mirrors the card's null-ness
}
```

### Runtime view: `PlanarCard` (built by `PlanechaseCatalogService`)

```ts
interface PlanarCard {
  id: string;
  name: string;
  kind: 'plane' | 'phenomenon';
  set: { code: string; name: string };
  images: { small: string; large: string };
  typeLine: string;                   // PT-BR if translated & fresh, else English (FR-004a)
  text: string;
  ability: string | null;
  translated: boolean;                // true iff translation exists && sourceHash === hash
}
```

The service also exposes:
- `cards`: every `PlanarCard`, in file order
- `byId`: a `Map<string, PlanarCard>`
- `sets`: `{ code, name, cards: PlanarCard[] }[]`, in file order

## 2. Planar deck selection (persisted, synced)

```ts
interface PlanarSelection {
  disabledIds: string[];              // card ids; unknown ids tolerated and kept (R11)
  updatedAt: string;                  // ISO, stamped by PlanarSelectionService.save()
}
```

- **Where it's stored**:
  - With a profile active: the profile DB's `meta` store, key `planarSelection`.
  - With no profile active: the device DB's `meta` store, same key (R5).
- **Absent (`null`)**: never changed, so every card is enabled (FR-018).
- **Enabled list** (derived, never stored): `catalog.cards.filter(c => !disabled.has(c.id))`.

### Validation: `validateSelection(enabled: PlanarCard[])` (`planar-selection.util.ts`)

| Condition | Result | Blocks save/start? |
|---|---|---|
| `enabled.length < 10` | error `tooFew(n)` | Yes (FR-007, FR-019) |
| no `kind === 'plane'` in enabled | error `noPlane` | Yes |
| `enabled.length < 40` or phenomena `> 2` | notice `sizeRule` | No |
| otherwise | ok | — |

`tooFew` wins over `noPlane` when both apply. That's the handoff's first message.

### Cloud row: `public.planechase_selections`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK → `auth.users(id)` on delete cascade | one row per account |
| `disabled_ids` | `text[] not null default '{}'` | |
| `updated_at` | `timestamptz not null default now()` | LWW key |

For sync the local copy and the remote copy are both mapped to the `SyncEntity`
`{ id: 'planar-selection', disabledIds, updatedAt }` and reconciled with `reconcileEntities` (R7).

## 3. Planechase game (persisted on the device, never synced)

```ts
type PlanarResult =
  | { kind: 'start'; name: string }            // "Plano inicial"
  | { kind: 'blank' }                          // "Nada acontece"
  | { kind: 'chaos' }                          // "Caos"
  | { kind: 'planeswalk'; from: string }       // die planeswalk; from = previous card name
  | { kind: 'manual'; from: string }           // "Planeswalk" action
  | { kind: 'cost' }                           // "Custo zerado"
  | { kind: 'phenomenon' }                     // "Fenômeno encontrado" (pending)
  | { kind: 'resolved' }                       // "Encontro resolvido"
  | { kind: 'reset' }                          // "Planos reiniciados" (anytime reset)
  | { kind: 'allUsed' };                       // "Todos os planos foram usados" (pending reset)

interface PlanechaseGameState {
  list: string[];          // card ids fixed at start (FR-007, FR-022)
  current: string;         // face-up card id
  used: string[];          // visit order; never shown (FR-012)
  drawOrder: string[];     // face-down order, index 0 = top (FR-008a)
  cost: number;            // next roll cost, ≥ 0 (FR-009)
  pending: 'phenomenon' | 'reset' | null;
  result: PlanarResult;
}

interface PlanechaseGame extends PlanechaseGameState {
  undo: PlanechaseGameState | null;   // single step (FR-015a)
}
```

- **Where it's stored**: the device DB's `meta` store, key `planechaseGame`. `null` or absent means
  no game.
- **Invariants**:
  - `current`, every `used` id and every `drawOrder` id are pairwise distinct, and together they
    equal `list`.
  - `pending === 'phenomenon'` ⇒ `current` is a phenomenon.
  - `pending === 'reset'` ⇒ `drawOrder` is empty.
  - The chaos/encounter plate is lit when `result.kind === 'chaos'` or
    `pending === 'phenomenon'` (FR-011).

### Transitions (`planechase-game.util.ts`, `rnd: RandomInt`)

"Draw" means: move `current` to the end of `used`. Then:
- if `drawOrder` is non-empty, pop its top into `current`, and set `pending = 'phenomenon'` when
  that card is a phenomenon;
- if `drawOrder` is empty, put `current` back and set `pending = 'reset'` (the planeswalk is still
  owed).

| Action | Allowed when | Effect | Undo slot |
|---|---|---|---|
| `startGame(enabledIds)` | valid selection | `drawOrder = shuffle(enabled)`. Phenomena ahead of the first plane move, in order, to the bottom (901.5). That plane becomes `current`. `used = []`, `cost = 0`, `pending = null`, `result = start` | cleared |
| `roll()` | `pending === null` | `cost += 1`. Die 1 → draw, `result = planeswalk`. Die 6 → `result = chaos`. Die 2–5 → `result = blank` | set |
| `planeswalk()` (manual) | `pending === null` | draw, `result = manual`, cost unchanged | set |
| `confirmPhenomenon()` | `pending === 'phenomenon'` | `pending = null`, then draw, `result = resolved` (or `phenomenon` / `allUsed` from the draw) | set |
| `resetCost()` | `pending === null` | `cost = 0`, `result = cost` | set |
| `reshuffle()` | `pending !== 'phenomenon'` | `drawOrder = shuffle(list − current)`, `used = []`. If `pending === 'reset'`: `pending = null` and draw, `result` from the draw. Otherwise `result = reset` | cleared |
| `undo()` | `undo !== null` | restore `undo` exactly, `undo = null` | cleared |
| `end()` | a game exists | the game becomes `null` | — |

- **Result naming**: a draw that lands on a phenomenon sets `result = phenomenon`, and one that
  finds nothing sets `result = allUsed`. Both override the action's own result.
- **Action availability** (FR-010, FR-013):

  | State | Enabled |
  |---|---|
  | `pending === 'phenomenon'` | confirm, Desfazer, Como jogar, Baralho, Encerrar partida |
  | `pending === 'reset'` | Reiniciar planos, Desfazer, Como jogar, Baralho, Encerrar partida |
  | otherwise | roll, Planeswalk, Zerar custo, Reiniciar planos (with confirm), Encerrar partida (with confirm), Desfazer if the undo slot is set |

### Hydration repair (R11)

On load:
- Drop ids that aren't in the catalog from `list`, `used`, `drawOrder` and the undo snapshot. A
  snapshot whose `current` is gone is discarded.
- If `current` is gone, draw with no undo slot.
- If `list` ends up empty, the game becomes `null`.

## 4. Relationships

```text
PlanarCardRecord ──(id)── PlanarTranslation            (0..1, fresh iff sourceHash = hash)
PlanarSelection.disabledIds ──→ PlanarCardRecord.id    (loose; unknown ids ignored)
PlanechaseGame.{list,current,used,drawOrder} ──→ id    (repaired on hydration)
LocalProfile 1 ── 0..1 PlanarSelection ── 0..1 planechase_selections row (via linked account)
Device 1 ── 0..1 PlanarSelection (no-profile) ; Device 1 ── 0..1 PlanechaseGame
```
