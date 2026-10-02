# Contract: services, utils and components (spec 015)

Signatures are TypeScript-ish. Everything lives under `src/app/`, and every unit gets a colocated `.spec.ts`.

## Models

### `core/models/card.model.ts` (changed)

```ts
export type CardFinish = 'nonfoil' | 'foil' | 'etched';
export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export const CARD_FINISHES: readonly CardFinish[];
export const CARD_CONDITIONS: readonly CardCondition[];
export const CARD_LANGUAGES: readonly { code: string; name: string; label: string }[]; // research R19
export const MAX_QUANTITY = 9999;
interface CardEntry { /* … existing … */ artist?: string; addedAt: string; }
```

### `core/models/catalog.model.ts` (new)

`CatalogCard`, `CatalogPrinting`, `CatalogCardDetail`, `SearchPage` and `class CatalogError extends Error { kind: 'offline' | 'failed' }` (see data-model.md).

## Utils (pure, `core/utils/`)

### `card-search.util.ts` (new; no aliases, no Angular, since `sync-scryfall.ts` imports it)

```ts
export const MIN_SEARCH = 3;
export const PAGE_SIZE = 100;
export function searchKey(text: string): string;          // NFD, strip \p{M}, lowercase, collapse spaces, trim
export function escapeLike(key: string): string;          // escapes \ % _
export type SearchStatus = 'idle' | 'short' | 'loading' | 'ok' | 'empty' | 'offline' | 'failed';
export interface SearchState { … }                        // data-model.md
export const INITIAL_SEARCH: SearchState;
export function typed(state: SearchState, text: string): SearchState;            // idle/short/loading (+generation)
export function pageLoaded(state: SearchState, generation: number, page: SearchPage): SearchState; // ignores stale generations
export function pageFailed(state: SearchState, generation: number, kind: CatalogError['kind']): SearchState;
export function moreRequested(state: SearchState): SearchState;
export function canLoadMore(state: SearchState): boolean;
```

### `card-entry.util.ts` (new)

```ts
export function canBeCommander(typeLine: string, oracleText: string | null, faces: { oracleText: string }[] | null): boolean; // R11
export function initialPrinting(printings: CatalogPrinting[]): CatalogPrinting;   // first 'en', else first (R4)
export function sortPrintings(printings: CatalogPrinting[]): CatalogPrinting[];    // released_at desc, set, number (numeric)
export function filterPrintings(printings: CatalogPrinting[], text: string, keep: string): CatalogPrinting[]; // keep = selected scryfallId
export function printingIdentity(detail: CatalogCardDetail, printing: CatalogPrinting): PrintingFields;
//   name, scryfallId, oracleId, setCode, setName, collectorNumber, rarity, commanderLegality,
//   colorIdentity, typeLine, imageUrl, faces, artist (the fields replaced on a printing change)
export function entryFromPrinting(detail, printing, details: OwnershipFields, locationId): Omit<CardEntry, 'id' | 'updatedAt' | 'addedAt'>;
export function printingFromEntry(card: CardEntry): CatalogPrinting;              // offline edit (R13)
export function validateQuantity(text: string): { ok: true; value: number } | { ok: false };
export function matchKey(card: Pick<CardEntry, 'scryfallId' | 'finish' | 'language' | 'condition'>): string;
export interface CardMatch { card: CardEntry; collection: Collection }
export function findMatches(
  cards: readonly CardEntry[], key: string, collectionsById: ReadonlyMap<string, Collection>,
  destinationId: string, pathName: (id: string) => string, excludeId?: string,
): CardMatch[];                                                                     // R9 order
export function detailsLine(card: Pick<CardEntry, 'finish' | 'language' | 'condition'>): string; // "Foil · EN · NM"
```

### `card-colors.util.ts` (new)

```ts
export function cardPalette(colorIdentity: readonly Color[]): { stops: string[]; roles: Roles }; // R12
export function rolesFromHex(hex: string): Roles;                                    // moved notice (collection color)
```

### `collection-tree.util.ts` (changed)

```ts
export function firstLeaf(id: string, childrenOf: Map<string | null, Collection[]>): string; // R10
```

### `card-copy.ts` (new)

`CARD`: every PT-BR string in ui.md §7. Functions cover interpolated strings, for example `added(name, qty, collection)` and `places(n)`.

## Services (`core/services/`)

### `CardCatalogService` (new, root)

```ts
search(text: string, page: number): Promise<SearchPage>;      // throws CatalogError; key < 3 → never called
detail(oracleId: string): Promise<CatalogCardDetail>;          // throws CatalogError
```

- The anonymous client is created lazily on the first call (R1).
- Specs swap the service through a TestBed provider; it is never `vi.mock`ed.

### `CardService` (changed)

```ts
readonly byLocation: Signal<ReadonlyMap<string, readonly CardEntry[]>>;  // addedAt desc, id (R8)
add(card: Omit<CardEntry, 'id' | 'updatedAt' | 'addedAt'>): CardEntry;   // stamps id, updatedAt, addedAt; writeRows put
update(id: string, patch: Partial<Omit<CardEntry, 'id' | 'addedAt' | 'updatedAt' | 'locationId'>>): void; // writeRows put
mergeInto(targetId: string, addQuantity: number, removeId?: string): void;
//   one signal update + one writeRows: target quantity += addQuantity (new updatedAt);
//   removeId → delete + cards tombstone (FR-019). Never touches addedAt.
```

- Every mutation bumps `changeCount`, announces `cards` via `CrossTabService`, and never starts a sync (FR-023).
- `applySyncResult`, `applyMoved`, `applyRemoved`, `refresh`, `load` and tombstones are unchanged.

### `CardViewModeService` (new, root)

```ts
readonly mode: Signal<'images' | 'details'>;   // linkedSignal on the active profile id; default 'details'
set(mode: 'images' | 'details'): void;          // localStorage grm-card-view:{profileId}, try/catch
forget(profileId: string): void;                // called by ProfileLifecycleService on delete
```

### Other changed services

- **`ProfileLifecycleService`**: calls `CardViewModeService.forget(id)` when a profile is deleted.
- **`sync/sync-rows.ts`**: `CardEntryRow` gains `artist: string | null` and `added_at: string`; both mappers carry them (data-model.md).

## Components

### `shared/ds/compact-modal` (changed)

- New input `size = input<'compact' | 'wide' | 'split'>('compact')`, giving 480 / 720 / 880 px. `'wide'` uses a fixed 640px face (no fluid height).
- The template adds `<app-toast-outlet [active]="true" />` (R14).

### `shared/ds/select-list` (new): `SelectList<T>`

```ts
options = input.required<readonly T[]>();
selected = model.required<T>();
key = input.required<(item: T) => string>();
label = input.required<string>();          // accessible name of the trigger
// content: <ng-template appSelectTrigger let-item> and <ng-template appSelectOption let-item let-active="active">
```

- The trigger is a button with `aria-haspopup="listbox"` and `aria-expanded`; the popup is a `role="listbox"` using `aria-activedescendant`.
- Keys: arrows, Home, End, Enter and Space. Esc closes the list and stops propagation. A pointerdown outside the list closes it.
- Options may also be replaced by an error state: projected `[appSelectEmpty]` content.

### `shared/cards/` (new domain folder)

| Component | Inputs / outputs | Role |
|---|---|---|
| `card-tile` | `card: { name; typeLine?; imageUrl; colorIdentity }`, `details: TileDetails \| null`, `detailsMode: 'shown' \| 'hover'`, `interactive: boolean`; `(activate)` | Image or placeholder, details plate, hover border, halo, scale and one-time dust (FR-032). A `<button>` when interactive, a `<div>` otherwise. Accessible name = name (+ type line in search). |
| `card-grid` | `cards: readonly CardEntry[]`, `mode: 'images' \| 'details'`, `editable: boolean`; `(edit: CardEntry)` | 6 or 4 columns (3 or 2 on phone), `content-visibility` tiles (R16). |
| `card-view-toggle` | `mode` (model) | `role="radiogroup"` "Só imagens" / "Com detalhes" with `RovingRadios`. |
| `card-search-modal` | `roles: Roles`; `(pick: CatalogCard)`, `(closed)` | `CompactModal size="wide"`: field, debounce, reducer, result grid, sentinel, states (FR-005–FR-009). Keeps its state while the card modal is on top. |
| `card-modal` | `mode: 'add' \| 'edit'`, `oracleId` (add) or `card: CardEntry` (edit), `collectionName`; `(save: CardDraft, again: boolean)`, `(closed)` | `CompactModal size="split"`, colored by `cardPalette` (FR-010–FR-014, FR-018, FR-024, FR-027). Loads `detail()`; printing `SelectList` with set filter; finish, language and condition selects; quantity; notes; À venda check. |
| `duplicate-notice` | `mode: 'add' \| 'edit'`, `draft`, `matches: CardMatch[]`, `destination: Collection`; `(decide: { choice; match: CardMatch })`, `(closed)` | `CompactModal`: D1a (1 match) or D1b (2+, a `SelectList` "Onde ela está") (FR-015, FR-019). |
| `moved-notice` | `card: CardEntry`, `from: Collection`, `to: Collection`; `(closed)` | `CompactModal [locked]`, which ignores Esc, backdrop and ✕; "Ok" only (FR-017). |

### `views/collection-area/card-flow.ts` (new, view-scoped controller)

Provided by `CollectionArea` (`providers: [CardFlow]`):

```ts
readonly step: Signal<
  | { kind: 'idle' }
  | { kind: 'search'; collectionId: string }
  | { kind: 'add'; collectionId: string; card: CatalogCard }
  | { kind: 'edit'; collectionId: string; cardId: string }
  | { kind: 'duplicate'; …; draft: CardDraft; matches: CardMatch[]; again: boolean }
  | { kind: 'moved'; card: CardEntry; from: Collection; to: Collection; again: boolean }>;
openSearch(collectionId: string): void;
pick(card: CatalogCard): void;
openEdit(cardId: string): void;
save(draft: CardDraft, again: boolean): void;      // resolve destination (firstLeaf) → duplicates → write → toast/notice
decide(choice: 'merge' | 'separate' | 'keep', match: CardMatch): void;
cancel(): void;                                    // card modal → search (add) / idle (edit); notice → card modal
close(): void;                                     // search modal ✕ → idle
```

- `CardFlow` keeps the search modal mounted under the card modal and the notices.
- An `effect` closes everything and shows "Nada foi salvo" when the target collection, or the edited card, leaves the signals (R10).
- The toasts go through `ToastService.show(CARD.addedLabel, …)` and similar (FR-016).

### `views/collection-area` (changed)

- **Collection page, cards kind**:
  - a sticky header: path with Editar and Excluir, the title, then a list bar holding `card-view-toggle` and "Adicionar cartas";
  - `card-grid`;
  - the side column (summary, disabled search, "Filtros em breve.").
- **Collection page, empty kind**: the two choice plates, with "Adicionar cartas" enabled.
- **Collection page, subcollections kind**: the 008 stat plates are removed, and the side summary sums the subtree.
- **Holding page**: `card-grid` with `editable = false`, plus the read-only note.
- **Card modals**: mounted from `CardFlow.step()`.
