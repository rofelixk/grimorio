---

description: "Task list for 006 Shared Planechase — First Gameplay Mode"
---

# Tasks: Shared Planechase — First Gameplay Mode

**Input**: Design documents from `specs/006-shared-planechase/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R18), data-model.md, contracts/ (services, supabase, card-data-tooling), ui.md, quickstart.md (V1–V26)

**Tests**: Included. plan.md requires a co-located `.spec.ts` for every new util, service and component (Vitest via `ng test`, `fake-indexeddb` via `src/test-setup.ts`), and SC-003/SC-004 are verified by unit tests. The card data script and the translation skill get **no** automated tests (spec Assumptions).

**Maintainer-only runs** (plan.md): implementation writes and edits `scripts/sync-scryfall.ts`, `scripts/sync-planechase.ts` and the `planechase-translate` skill, but **never runs** `npm run sync:scryfall`, `npm run sync:planechase` or `/planechase-translate`, not even to test them. All of that work is in Phase 1, which ends in the feature's **only stop** (T008): the maintainer runs the tools and commits the real `cards.json`/`cards.pt-br.json`, then Phases 2–9 run straight through against the real data. Specs use hand-written fixtures (T012), never the real files.

**Browser checks** use the `run` skill against the user's already-running dev server (never start or stop port 4200).

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US5)
- Paths are relative to the repository root. Aliases: `@models/*`, `@services/*`, `@testing/*`, `@utils/*` → `src/app/core/…`; `@shared/*` → `src/app/shared/…`

---

## Phase 1: Maintainer Tooling (scripts and skill) — do first

**Purpose**: Everything the maintainer has to run, so the one hand-off happens up front and the rest of the implementation (Phases 2–9) runs without stopping

- [X] T001 [P] Create `src/app/core/data/planechase/planar-card.model.ts` with the types from data-model.md §1 verbatim: `PlanarCardData { cards: PlanarCardRecord[] }`; `PlanarCardRecord { id; name; kind: 'plane' | 'phenomenon'; typeLine; text /* '' for phenomena */; ability: string | null /* null = plane with no chaos (R2) */; set: { code; name; releasedAt }; images: { small; large }; hash /* 16 hex of sha256(JSON.stringify([typeLine, text, ability])) */ }`; `PlanarTranslations = Record<string, PlanarTranslation>`; `PlanarTranslation { sourceHash; typeLine; text; ability: string | null }`; runtime `PlanarCard { id; name; kind; set: { code; name }; images; typeLine; text; ability; translated: boolean /* true iff translation exists && sourceHash === hash */ }`; `PlanarSet { code; name; cards: PlanarCard[] }`
- [X] T002 Apply migration `006_printings_border_release_images` with the Supabase MCP `apply_migration` exactly as contracts/supabase.md (`alter table public.printings add column border_color text, add column released_at date, add column image_small text, add column image_large text;` — nullable, no new grants), then run `get_advisors` (security) and report any finding
- [X] T003 [P] Extend `toPrintingRow` in `scripts/sync-scryfall.ts` to also write `border_color`, `released_at`, `image_small` and `image_large` (`image_uris.small/large`, falling back to `card_faces[0].image_uris`) from the same bulk-data download; leave the existing `image_url` (`normal`) mapping unchanged (FR-024b, R8). Do not run it — the maintainer reruns `npm run sync:scryfall`
- [X] T004 Create `scripts/sync-planechase.ts` per contracts/card-data-tooling.md and R1–R3: service-role client from `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`; read `cards` (`oracle_id, name, type_line, oracle_text`, `layout = 'planar'`), then `printings` (`oracle_id, set_code, set_name, collector_number, border_color, released_at, image_small, image_large`, `.in('oracle_id', ids).eq('lang','en').neq('border_color','gold')`); exit 1 with "Catalog is missing border/release/image columns — run `npm run sync:scryfall` first." and write nothing if any candidate has a null border/release/image; pick the newest printing per oracle (`released_at` desc, then `set_code`, then `collector_number`), drop cards with none; split ability (phenomenon: `text = ''`, `ability` = whole text; plane: last paragraph matching `/\bchaos ensue[sd]?\b|\bchaos ensures\b|^chaos:/i`, rest joined with `\n`, else `null`) with an `ABILITY_OVERRIDES: Record<oracleId, number | null>` map; `hash` = first 16 hex of `sha256(JSON.stringify([typeLine, text, ability]))` via `node:crypto`; import the file types from `../src/app/core/data/planechase/planar-card.model` (relative, no path aliases under tsx); read the previous `cards.json` and `cards.pt-br.json`; sort (set `releasedAt` desc, set code, name) and write `JSON.stringify(data, null, 2) + '\n'`; print the English report (Wrote N cards (P planes, F phenomena)…, New/Changed/Removed, Planes with no chaos ability…, Missing or outdated translations + "Run in Claude Code: /planechase-translate", or "Translations are up to date."); exit 0 on success. Do not run it
- [X] T005 [P] Add `"sync:planechase": "tsx --env-file=.env scripts/sync-planechase.ts"` to `package.json` scripts next to `sync:scryfall`
- [X] T006 [P] Create the skill `.claude/skills/planechase-translate/SKILL.md` (frontmatter `name: planechase-translate`, description, argument `[card names…]`) with the procedure from contracts/card-data-tooling.md: read `cards.json` + `cards.pt-br.json` (`{}` if missing); work list = no entry or `sourceHash !== hash`, plus named cards (case-insensitive exact match, unknown names reported); translate `typeLine`/`text`/`ability` following `glossary.md` and official PT printings, keep card names and `{…}` symbols, `{CHAOS}` → `{CAOS}`, normalize irregular chaos/encounter openings, `ability` stays `null` when the source is `null`; set `sourceHash = hash`; delete entries whose id isn't in `cards.json`; write keys sorted by id, 2-space JSON + trailing newline, never touching entries outside the work list; print translated names grouped new/updated/requested and list any `ability` not starting with the canonical opening. Do not run it
- [X] T007 [P] Create `.claude/skills/planechase-translate/glossary.md` (R18): core terms (Plane/Plano, Phenomenon/Fenômeno, planeswalk kept, chaos ensues → canonical PT-BR chaos trigger — flagged "confirm against official printings", encounter → canonical opening), the irregular-openings table (Whenever/When chaos ensues, chaos folded into other triggers on Shy Town/Sky Deck), ability-word/flavor prefix rules ("Praise Him —", "Red-Eye —", "Song of the Ood —" kept; "Will of the council —" → "Vontade do conselho"), and a seed table of keywords/creature types from official PT printings
- [X] T008 **STOP — hand off to the maintainer** (the only stop in this feature): rerun `npm run sync:scryfall` (fills the new `printings` columns), run `npm run sync:planechase` (writes `src/app/core/data/planechase/cards.json`), run `/planechase-translate` and review `src/app/core/data/planechase/cards.pt-br.json`, then the SC-009 checks V25/V26 from `specs/006-shared-planechase/quickstart.md`. Resume at Phase 2 once both files are committed; fix any script/skill issue the maintainer reports before resuming

**Checkpoint**: Real `cards.json` and `cards.pt-br.json` exist — no further maintainer runs are needed until Polish

---

## Phase 2: Setup (Shared Infrastructure)

**Purpose**: Design-system entries, remaining types, copy and test fixtures every story builds on

- [X] T009 Add the new Planechase design-system pieces to `DESIGN.md` before any UI is built (Constitution V), taking sizes, colors and motion from `design_handoff_shared_planechase/Planechase.dc.html` + README: the game console (result eyebrow/title/sub, action group, and its inline-confirm `alertdialog` variant with danger border), the phone dock (sticky bottom, R16), the lit ability plate (a lit state of `.plate`; instant under reduced motion), the card image frame (1.4:1) with its name placeholder and "Imagem indisponível sem conexão" state, the card tile (on/off bead, `aria-pressed`), the collapsible set group (disclosure header with count + enable/disable-all), and the two flairs (2a planeswalk light front, 2b chaos shockwave; role colors only; none under reduced motion). Record the spec overrides: no used/available counts anywhere (FR-012) and a right-aligned game footer
- [X] T010 [P] Check `tsconfig.json` for JSON-module support; add `"resolveJsonModule": true` under `compilerOptions` only if the current settings don't already allow `import('…/cards.json')` (R4)
- [X] T011 [P] Create `src/app/core/models/planar-selection.model.ts` (`PlanarSelection { disabledIds: string[]; updatedAt: string }` — unknown ids tolerated and kept, R11) and `src/app/core/models/planechase-game.model.ts` (`PlanarResult` union with kinds `start{name}`, `blank`, `chaos`, `planeswalk{from}`, `manual{from}`, `cost`, `phenomenon`, `resolved`, `reset`, `allUsed`; `PlanechaseGameState { list; current; used; drawOrder /* index 0 = top */; cost /* ≥ 0 */; pending: 'phenomenon' | 'reset' | null; result }`; `PlanechaseGame extends PlanechaseGameState { undo: PlanechaseGameState | null }`) exactly as data-model.md §2–3
- [X] T012 [P] Add `src/app/core/testing/planechase-fixtures.ts` exporting small `PlanarCard[]`/`PlanarCardData`/`PlanarTranslations` builders (at least 11 planes, 3 phenomena, one plane with `ability: null`, one untranslated card and one with a stale `sourceHash`, for FR-004a) and a scripted `RandomInt` factory (`scriptedRandom(values: number[])`). Specs use these, never the real `cards.json`
- [X] T013 [P] Create `src/app/core/utils/planechase-copy.ts` with every Planechase UI string, verbatim from the handoff plus ui.md §3/§7 (menu row, no-game intro, console/dock result titles and sub lines per state including "Este plano não tem habilidade de caos.", "Planos reiniciados" / "Os planos usados voltaram ao baralho.", action labels "Rolar dado planar", "Planeswalk", "Zerar custo", "Desfazer", "Concluir encontro", "Reiniciar planos", "Encerrar partida", "Próxima: {N}", eyebrow "Dado planar · próxima rolagem {N}", reset/end confirms without counts, refused-start messages + "Ajustar baralho", deck errors/notice/confirm, "Imagem indisponível sem conexão", tile types "plano"/"fenômeno"); leave a `RULES_SECTIONS` export stub for T034. Add `modes: 'Modos de jogo'` to `SHELL` in `src/app/core/utils/entry-copy.ts` next to `collection`

---

## Phase 3: Foundational (Blocking Prerequisites)

**Purpose**: Catalog data pipeline, randomness, game state machine, selection persistence, image cache — required by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete


### Pure core

- [X] T014 [P] Implement `src/app/core/utils/crypto-random.util.ts` per contracts/services.md: `RandomInt`, `randomInt(n, source = crypto.getRandomValues bound)` with rejection sampling over Uint32 (`limit = 2^32 − (2^32 % n)`), `shuffle(items, rnd)` Fisher–Yates on a copy, `DieFace`, `rollPlanarDie(rnd)` (`rnd(6) + 1`: 1 → `planeswalk`, 6 → `chaos`, else `blank`) (FR-008, FR-008a, R9)
- [X] T015 [P] Write `src/app/core/utils/crypto-random.util.spec.ts`: rejection path (a scripted source returning a value ≥ limit is redrawn), `randomInt` stays in `[0, n)`, `shuffle` returns a permutation and doesn't mutate its input, die mapping for 0/5/1–4, and SC-003: 6,000 `rollPlanarDie` calls with the real source, each result within ±2 percentage points of 16.7% / 16.7% / 66.7%
- [X] T016 Implement `src/app/core/utils/planechase-game.util.ts` per data-model.md §3 and contracts/services.md: `startGame` (shuffle, phenomena ahead of the first plane move in order to the bottom — 901.5; `used = []`, `cost = 0`, `pending = null`, `result = start`, `undo = null`), shared private `draw` (move `current` to end of `used`; pop top of `drawOrder` → `phenomenon` pending/result if a phenomenon; empty → put `current` back, `pending = 'reset'`, `result = allUsed`), `roll` (`pending === null`; `cost += 1`; 1 → draw + `planeswalk{from}`, 6 → `chaos`, else `blank`), `planeswalk` (manual, cost unchanged, `manual{from}`), `confirmPhenomenon` (`pending === 'phenomenon'` → draw, `resolved` unless the draw overrides), `resetCost` (`cost = 0`, `result = cost`), `reshuffle` (`pending !== 'phenomenon'`; `drawOrder = shuffle(list − current)`, `used = []`; if `pending === 'reset'` then clear pending and draw, else `result = reset`; `undo = null`), `undo` (restore snapshot exactly, `undo = null`), `repairGame` (R11: drop unknown ids from list/used/drawOrder/snapshot, discard a snapshot whose `current` is gone, draw with no undo if `current` is gone, `null` if `list` empties), `availableActions` (per the data-model availability table) and `abilityLit` (`result.kind === 'chaos' || pending === 'phenomenon'`). Undoable transitions set `undo` to the previous state without its own `undo`; every disallowed call throws
- [X] T017 Write `src/app/core/utils/planechase-game.util.spec.ts` with `scriptedRandom`: 901.5 start with leading phenomena, each die face, manual planeswalk leaves cost, phenomenon chain (back-to-back), confirm → allUsed, reshuffle during `pending === 'reset'` completes the planeswalk, anytime reshuffle, `resetCost`, undo restores every field incl. `drawOrder` and is unavailable after start/reshuffle/undo, disallowed transitions throw, invariants (current/used/drawOrder partition `list`), `availableActions` for the three states, `repairGame` cases, and SC-004 (N enabled cards → first N−1 planeswalks after start never repeat, and after a reset the next N−1 cover every non-current card exactly once)
- [X] T018 [P] Implement `src/app/core/utils/planar-selection.util.ts` + `planar-selection.util.spec.ts`: `enabledCards(cards, selection)` (null selection → all), `validateSelection(enabled)` → `{ ok: false, error: 'tooFew', count }` when `< 10` (wins over noPlane), `{ ok: false, error: 'noPlane' }` when no `kind === 'plane'`, else `{ ok: true, notice }` with `notice = enabled.length < 40 || phenomena > 2`; `sameEnabledSet(a, b)` order-insensitive

### Services

- [X] T019 Implement `PlanechaseCatalogService` and `planechaseCatalogResolver` (`ResolveFn<void>`) in `src/app/core/services/planechase-catalog.service.ts`: `load()` dynamic-`import()`s both JSON files once (never a static import, R4), builds `PlanarCard`s (PT-BR fields only when a translation exists and `sourceHash === hash`, else English with `translated: false`, FR-004/004a), exposes `cards`/`sets` signals in file order, `byId(id)` and `kindOf`; the resolver awaits `load()` then calls `PlanechaseGameService.repairIfNeeded()`. Spec `planechase-catalog.service.spec.ts` covers fresh, missing and stale translations and set grouping
- [X] T020 Implement `PlanechaseGameService` in `src/app/core/services/planechase-game.service.ts`: `game` signal hydrated from the device DB `meta` store key `planechaseGame` (extend `DeviceMetaRecord`/`device-db.ts` typing only if needed — no `DB_VERSION` bump, R5); `whenReady()`, serialized write queue + `flush()`; `inProgress`, `actions` (`availableActions` or null), `start(enabledIds)` (replaces any game, FR-022), `roll`, `planeswalk`, `confirmPhenomenon`, `resetCost`, `reshuffle`, `undo`, `end` (deletes the key) — each checks `actions()` then applies the util transition with `randomInt` and the catalog's `kindOf`, and persists the whole game including `undo` (FR-015); `repairIfNeeded()` runs `repairGame` once when the catalog is loaded. It never reads a profile. Spec `planechase-game.service.spec.ts`: persistence round-trip across a fresh `TestBed` (pending phenomenon + undo survive), end clears storage, repair drops unknown ids
- [X] T021 Await `PlanechaseGameService.whenReady()` in the `provideAppInitializer` of `src/app/app.config.ts` alongside `session.whenReady()`
- [X] T022 Implement `PlanarSelectionService` in `src/app/core/services/planar-selection.service.ts` mirroring `storage-location.service.ts` (R6): `load(profileId | null)` clears `selection` synchronously then reads `meta` key `planarSelection` from the profile DB (via `entity-store.ts` `getMeta`/`setMeta` with a captured handle) or, when `null`, from the device DB `meta` store; `whenReady()`, `flush()`, private `enqueueWrite` capturing the target when enqueued; `save(disabledIds)` stamps `updatedAt` (ISO); `applySyncResult(selection)` stores without restamping. Add it to `entityServices` in `src/app/core/services/profile-session.service.ts`. Spec `planar-selection.service.spec.ts`: null by default, device vs profile isolation, a write enqueued before a switch lands in the original target, `applySyncResult` keeps the given `updatedAt`
- [X] T023 [P] Implement `PlanarImageService` in `src/app/core/services/planar-image.service.ts` (R12): `url(address): Promise<string | null>` — look up Cache Storage `grm-planechase-images`, on miss `fetch(address, { mode: 'cors' })` and `cache.put` on `ok`, return a per-session memoized object URL for the blob, `null` on any failure. Spec `planar-image.service.spec.ts` with stubbed `caches`/`fetch`/`URL.createObjectURL`: hit, miss+put, failure → null, memoization

**Checkpoint**: Catalog, game engine, selection and image cache ready — user story work can begin

---

## Phase 4: User Story 1 - Play a shared Planechase game at the table (Priority: P1) 🎯 MVP

**Goal**: "Modos de jogo" → menu → Planechase → start, roll, planeswalk, phenomena, Zerar custo, Desfazer, on wide (console) and phone (dock), with flairs, no profile required

**Independent Test**: With no profile active, open Planechase, start a game, roll until all three results appear; each shows its outcome and planeswalking changes the plane (quickstart V1–V7, V21, V22)

### Shared gameplay components

- [X] T024 [P] [US1] Create `app-planar-image` in `src/app/shared/gameplay/planar-image/` (`.ts/.html/.scss/.spec.ts`, OnPush): inputs `address`, `name`, `lazy = false`; resolves through `PlanarImageService` (eagerly, or from an `IntersectionObserver` with `rootMargin: '200px'` when `lazy`, set up in an `effect`/`afterNextRender` and disconnected on destroy); renders `<img alt="{name}">` from the object URL, a name placeholder while loading, and "Imagem indisponível sem conexão" once the service returns `null` (FR-006). Spec covers loaded, failed and lazy-not-yet-visible states
- [X] T025 [P] [US1] Create `app-planar-card` in `src/app/shared/gameplay/planar-card/`: inputs `card: PlanarCard`, `lit: boolean`; renders `app-planar-image` (large) with its flair layer slot (`aria-hidden`), `h2` name with `lang="en"`, type line, static text (paragraphs from `\n`), and the ability plate labelled "Caos" (plane) or "Ao encontrar" (phenomenon), lit per `lit`; no plate when `ability === null` (R2). Spec covers plane, phenomenon, null ability and lit state
- [X] T026 [P] [US1] Create `app-planar-console` in `src/app/shared/gameplay/planar-console/`: inputs `game`, `actions`, `noChaos: boolean` (current plane has `ability === null`), `confirm: 'reset' | 'end' | null`; outputs `roll`, `planeswalk`, `resetCost`, `undo`, `confirmPhenomenon`, `reshuffle`, `confirmAccept`, `confirmCancel`; `role="status" aria-live="polite"` result region announcing "{result}. {detail}" from `planechase-copy.ts` per ui.md §3 (incl. phenomenon eyebrow "Fenômeno", all-used eyebrow "Planeswalk pendente" with only Desfazer + primary Reiniciar planos, "Concluir encontro" replacing the roll button while a phenomenon is pending); buttons disabled from `actions` (Desfazer only when the undo slot is set). Leave the confirm variant's markup for T039. Spec covers each result state's labels and disabled buttons
- [X] T027 [P] [US1] Create `app-planar-dock` in `src/app/shared/gameplay/planar-dock/` with the same inputs/outputs as the console: `position: sticky; bottom: 0` (R16), result + detail, "Próxima: {N}", row Desfazer/Planeswalk/Zerar custo, block primary "Rolar dado planar", "Concluir encontro" while a phenomenon is pending, or "Reiniciar planos" while `pending === 'reset'` (FR-013; Planeswalk and Zerar custo disabled in that row); same status region semantics (FR-012a). Spec mirrors the console's disabled-state checks and the all-used main button
- [X] T028 [P] [US1] Create `PlaneswalkFlair` and `ChaosFlair` in `src/app/shared/gameplay/flairs/` (`planeswalk-flair.ts`, `chaos-flair.ts` + specs), porting `runPw()`/`runChaos()` from `design_handoff_shared_planechase/Planechase.dc.html` as one `requestAnimationFrame` clock each (mask, glow, sparks), role colors only, `aria-hidden` layers removed on finish; `play(target: HTMLElement): Promise<void>` resolves immediately and draws nothing under reduced motion (`@shared/ds/media-query.ts`, FR-011a, R15). The planeswalk flair clones the outgoing card block before the state changes. Specs: reduced motion resolves at once and leaves no DOM

### Views, routes, nav

- [X] T029 [US1] Add routes to `src/app/app.routes.ts` with no guard (FR-002): `modes` → `GameModes`; `modes/planechase` → `Planechase` with `resolve: { catalog: planechaseCatalogResolver }`
- [X] T030 [P] [US1] Add `{ label: SHELL.modes, path: '/modes' }` after the collection entry in `NAV_DESTINATIONS` (`src/app/shared/layout/nav-links/nav-destinations.ts`), and update any nav spec that asserts the destination list
- [X] T031 [P] [US1] Create the `GameModes` view in `src/app/views/game-modes/` (`game-modes.ts/.html/.scss/.spec.ts`): `h1` "Modos de jogo" and one `app-action-row` (`@shared/ds/action-row`) → `/modes/planechase`, title "Planechase", description "Um baralho de planos compartilhado pela mesa.", verb "Continuar" when `PlanechaseGameService.inProgress()` else "Abrir" (FR-001); column max-width 720px. Spec covers both verbs
- [X] T032 [US1] Create the `Planechase` view in `src/app/views/planechase/` (`planechase.ts/.html/.scss/.spec.ts`): no-game state (eyebrow "Nenhuma partida", `h1`, intro copy, primary "Iniciar partida" → `game.start(enabledCards(catalog.cards(), selection.selection()).map(id))`, and a "Como jogar" button linking to `/modes/planechase/rules`) centered at max 480px; game state with `app-planar-console` above `app-planar-card` on wide (max 1120px, card grid `1fr 1fr`) and the card with `app-planar-dock` below on mobile (≤ `bp.mobile`, via `media-query.ts`), a hairline footer of right-aligned link-btns "Como jogar" and "Baralho" (placeholders wired in T035/T047), no used/available counts anywhere (FR-012); handlers call the flairs before/after the state change (planeswalk flair for die planeswalk, manual planeswalk, phenomenon confirmation and the all-used reshuffle that completes a planeswalk; chaos flair for a chaos result) — never from an `effect` (R15); focus the `h1` on arrival. Spec: start from no-game with a null selection, roll/planeswalk/undo wired to the service with a stubbed random, pending-phenomenon disables roll/Planeswalk/Zerar custo, no digits for used/available in the DOM
- [X] T033 [US1] Verify US1 in the browser with the `run` skill against the user's dev server: quickstart V1–V7, V21 (390×844 dock stays visible while scrolling the card text) and V22 (reduced motion: no flair); fix anything that fails (scenarios in `specs/006-shared-planechase/quickstart.md`)

**Checkpoint**: MVP — a full game can be played with the default (all-enabled) deck

---

## Phase 5: User Story 2 - Read the Planechase rules in Portuguese (Priority: P1)

**Goal**: "Como jogar" explains the shared-deck variant in PT-BR, reachable with or without a game, without touching it

**Independent Test**: Open "Como jogar" and check every point under spec "Rules research" is covered in PT-BR (quickstart V12)

- [X] T034 [US2] Fill `RULES_SECTIONS` in `src/app/core/utils/planechase-copy.ts` with the seven sections from the handoff's `rules` array — O que é · Baralho compartilhado · Início · Controlador planar · Dado planar · Planeswalk · Caos e fenômenos — each with an anchor id and PT-BR paragraphs; check them against every bullet of spec "Rules research" (shared-deck limits 901.15, 901.5 start, 901.6 controller, 901.9 cost {0}/{1}/…, die faces, 701.31b, 312.5/312.7) and append to Planeswalk the approved copy: "O botão Planeswalk troca de plano sem rolar o dado. Use quando uma carta mandar fazer planeswalk ou quando a mesa usar um dado físico. Se uma carta mudar o que o dado faz, vale o texto da carta."
- [X] T035 [US2] Create the `PlanechaseRules` view in `src/app/views/planechase-rules/` (`planechase-rules.ts/.html/.scss/.spec.ts`): ghost back button → `/modes/planechase` labelled "Voltar à partida" when `inProgress()` else "Voltar", `h1` "Como jogar" + intro, article max 62ch rendering `RULES_SECTIONS`, and on wide a sticky TOC ("Nesta página" + 7 anchors) hidden on mobile; add route `modes/planechase/rules` with the catalog resolver in `src/app/app.routes.ts`, and point the Planechase view's "Como jogar" links (no-game button and game footer) at it. Spec: 7 sections render, back label varies, the game signal is unchanged after visiting
- [X] T036 [US2] Verify V12 with the `run` skill (with and without a game in progress) (scenarios in `specs/006-shared-planechase/quickstart.md`)

**Checkpoint**: US1 + US2 work together; rules never alter the game

---

## Phase 6: User Story 3 - Read every card in Portuguese, the same way every time (Priority: P1)

**Goal**: Reviewed PT-BR text per card from a shipped file, English fallback when missing/stale, image cached for offline (the translation skill itself is built in Phase 1)

**Independent Test**: A translated card shows PT-BR text, an untranslated or stale one shows English with the plate still split; seen images render offline, unseen ones show the placeholder (quickstart V19, V23)

- [X] T037 [P] [US3] In `app-planar-card` (`src/app/shared/gameplay/planar-card/planar-card.html`) mark the type line, text and ability plate `lang="en"` when `!card.translated` (FR-004a, FR-023) and keep the plate highlight identical; extend `planar-card.spec.ts` with a fallback case using the stale-hash fixture
- [X] T038 [US3] Verify V19 (offline: text always renders, seen images from cache, others placeholder, roll < 1 s) and V23 (delete one entry from `cards.pt-br.json` locally → English with plate; revert) with the `run` skill (scenarios in `specs/006-shared-planechase/quickstart.md`)

**Checkpoint**: Card text is stable and offline-safe

---

## Phase 7: User Story 4 - Track used and available planes, and reset (Priority: P2)

**Goal**: Hidden tracking surfaces only as the all-used prompt; "Reiniciar planos" and "Encerrar partida" with inline confirms; the game survives reloads

**Independent Test**: Enable exactly 10 cards, planeswalk until the all-used prompt, reset, and confirm the next 9 planeswalks show every other card once (quickstart V8–V11)

- [X] T039 [US4] Add the inline-confirm variant to `app-planar-console` and `app-planar-dock` (`src/app/shared/gameplay/planar-console/`, `planar-dock/`): when `confirm` is `'reset'` or `'end'` the region becomes `role="alertdialog"` with `aria-labelledby`/`aria-describedby`, danger border, the copy "Reiniciar planos? · Os planos usados voltam ao baralho. O plano atual continua na mesa." or "Encerrar partida? · A partida some deste aparelho. Seu baralho continua salvo." (no counts, FR-013), Cancelar (focused on open) and the danger verb; Esc cancels. Extend both specs
- [X] T040 [US4] In the `Planechase` view (`src/app/views/planechase/`) add footer link-btns "Reiniciar planos" (disabled while a phenomenon is pending, FR-010) and "Encerrar partida" on wide, and the two mobile rows ([Como jogar][Baralho] / [Reiniciar planos][Encerrar partida]); own `confirm = signal<'reset' | 'end' | null>`; accept → `game.reshuffle()` / `game.end()`; cancel returns focus to the triggering link. In the all-used state (`pending === 'reset'`) the main "Reiniciar planos" button of the console and of the dock calls `reshuffle()` directly (the prompt is the confirmation), and the footer/mobile "Reiniciar planos" link does the same in that state instead of opening the inline confirm. Extend `planechase.spec.ts`: confirm/cancel for both, all-used → reshuffle completes the planeswalk, end returns to no-game
- [X] T041 [US4] Verify V8 (10-card deck, all-used, reset, 9 non-repeating draws — use a temporary 10-card selection saved from the service in the browser console or wait for US5), V9 (no counts, including the reset confirm), V10 (reload/close-reopen with a pending phenomenon and undo) and V11 (confirm/cancel; menu back to "Abrir") with the `run` skill (scenarios in `specs/006-shared-planechase/quickstart.md`)

**Checkpoint**: Full deck lifecycle works and persists on the device

---

## Phase 8: User Story 5 - Choose which cards are in the planar deck (Priority: P2)

**Goal**: Deck settings with image tiles grouped by set, a draft saved only through "Salvar", validation, restart confirm, per-profile/device storage and cloud sync

**Independent Test**: With a linked profile, disable a few cards, sync, open the same profile on another device, sync, and see the same cards disabled (quickstart V13–V18)

### Cloud

- [X] T042 [US5] Apply migration `006_planechase_selections` with `apply_migration` exactly as contracts/supabase.md: table `public.planechase_selections (user_id uuid primary key references auth.users (id) on delete cascade, disabled_ids text[] not null default '{}', updated_at timestamptz not null default now())`, RLS enabled, four owner-only policies using `(select auth.uid()) = user_id` named to match the existing `storage_locations`/`card_entries` policies (check with `list_tables`/SQL first), `grant select, insert, update, delete on public.planechase_selections to authenticated;` (no `anon`, no `service_role`); then run `get_advisors` (security) and report
- [X] T043 [P] [US5] Add `planarSelectionUpdatedAt: string | null` to `hasUnsyncedChanges`'s input in `src/app/core/utils/sync-status.util.ts` (unsynced when non-null and newer than `lastSyncedAt`, or non-null and nothing has synced yet), update its doc comment, and add cases to `sync-status.util.spec.ts`; pass `PlanarSelectionService.selection()?.updatedAt ?? null` from `src/app/shared/auth/profile-modal/profile-flow.store.ts`
- [X] T044 [US5] Add the private `syncPlanarSelection(client, run)` step to `src/app/core/services/sync.service.ts` after `syncCards`: flush `PlanarSelectionService`, `select('user_id, disabled_ids, updated_at').eq('user_id', userId)`, map local and remote to `{ id: 'planar-selection', disabledIds, updatedAt }`, `reconcileEntities(localOrEmpty, remoteOrEmpty, [])`; local win → `upsert({ user_id, disabled_ids, updated_at }, { onConflict: 'user_id' })`; remote win → `applySyncResult`; guarded by `ensureCurrent(run)` and the abort signal, errors through the existing classification. Extend `sync.service.spec.ts`: local newer upserts, remote newer applies, both absent is a no-op

### UI

- [X] T045 [P] [US5] Create `app-planar-tile` in `src/app/shared/gameplay/planar-tile/` (`.ts/.html/.scss/.spec.ts`): inputs `card`, `on`; output `toggle`; native `<button aria-pressed>` with `aria-label="{name}, plano|fenômeno"`, `app-planar-image` (small, `lazy`), on/off bead per DESIGN.md, visible name (`lang="en"`) when the image is unavailable (FR-017). Spec covers aria attributes and toggle emission
- [X] T046 [US5] Create the `PlanechaseDeck` view in `src/app/views/planechase-deck/` (`planechase-deck.ts/.html/.scss/.spec.ts`) per ui.md §2 and R14: draft `signal<ReadonlySet<string>>` of disabled ids from the saved selection; grid `minmax(0,1fr) auto` with scrolling body and pinned footer; header ghost back → `/modes/planechase`, `h1` "Baralho planar", `aria-live="polite"` counter "{n} de {total} cartas · {f} fenômenos" from the draft; hint; muted size notice when `validateSelection` gives `notice` (FR-019); per set a disclosure `<button aria-expanded aria-controls>` "{Set EN} · {on} de {total}" (`lang="en"` on the set name) with "Ativar todos"/"Desativar todos", tile grid (`auto-fill minmax(150px)`, 2 cols on mobile) rendered only when expanded (`@if`, so collapsed sets load no images); collapsed map is component state, sets start expanded; footer Cancelar (→ back, discard) / Salvar: invalid → `role="alert"` error ("Ative pelo menos 10 cartas para salvar — agora são {n}." / "Ative pelo menos um plano para salvar."), draft stays; game in progress and `!sameEnabledSet(draftEnabledIds, savedEnabledIds)` (draft vs the saved selection, not the game's list) → inline confirm "Salvar reinicia a partida em andamento. · Um novo plano inicial é sorteado com o baralho novo." [Manter partida] [Salvar e reiniciar] → `selection.save()` + `game.start(enabledIds)` + navigate; otherwise save and navigate. Leaving any other way silently discards the draft. Spec: invalid save blocked, notice shown at 10–39, confirm path restarts with cost 0 and no undo, Manter partida keeps both, after a profile switch saving an untouched draft doesn't prompt, collapsed set renders no tiles
- [X] T047 [US5] Add route `modes/planechase/deck` → `PlanechaseDeck` with the catalog resolver in `src/app/app.routes.ts`; in the `Planechase` view wire the game footer/mobile "Baralho" link, add the no-game link-btn "Baralho: {n} cartas ativas", and the refused start (FR-007): on "Iniciar partida", run `validateSelection(enabledCards(…))`; if not ok, show a `role="alert"` with "Seu baralho salvo tem {n} cartas ativas; são necessárias pelo menos 10." or "Seu baralho salvo não tem nenhum plano ativo." and a "Ajustar baralho" link-btn to the deck, without changing the selection. Extend `planechase.spec.ts` with both refusal messages
- [X] T048 [US5] Verify V13–V17 with the `run` skill (draft/collapse/no images for collapsed sets, discard on every way of leaving, save with a game, refused start via a local `cards.json` edit then revert, device vs profile selections with a game unaffected by switches); V18 (two-device sync) is checked by the maintainer (scenarios in `specs/006-shared-planechase/quickstart.md`)

**Checkpoint**: All five stories work independently and together

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T049 Run `npm test` and `npm run lint`; fix failures (includes V24's randomness specs) across `src/`
- [X] T050 Verify V20 with the `run` skill: a full game (start, rolls, planeswalks, reset, end) makes zero requests to `supabase.co`, only `cards.scryfall.io` images (SC-008) (scenarios in `specs/006-shared-planechase/quickstart.md`)
- [X] T051 Propose, for the user's review before editing, the fact-based updates to `.claude/docs/architecture.md` (the `shared/gameplay/` domain folder; `core/data/planechase/` shipped JSON loaded by dynamic `import()`; `PlanarSelectionService` as an entity service with `planechase_selections` sync as a single reconciled entity; the device-scoped `PlanechaseGameService` in device `meta`; `PlanarImageService` Cache Storage; the new `printings` columns) and `.claude/docs/commands.md` (`npm run sync:planechase` and the `/planechase-translate` skill, maintainer-run); apply them once approved

---

## Dependencies & Execution Order

### Phase Dependencies

- **Maintainer Tooling (Phase 1)**: no dependencies; do it first. T001 (types) before T004 (the script imports them). T002 (migration) must be applied before the maintainer's `sync:scryfall` run in T008. T003, T005, T006, T007 are independent. T008 is the stop: nothing after it starts until the maintainer has run the tools and committed both JSON files.
- **Setup (Phase 2)**: after T008. T009 (DESIGN.md) must land before any UI task (T024+).
- **Foundational (Phase 3)**: depends on Setup (types T001/T011, fixtures T012). BLOCKS every story.
  - T014 → T016 → T017; T018 independent; T019 → T020 → T021; T022 independent of T019/T020; T023 independent.
- **US1 (Phase 4)**: after Foundational. T024 → T025; T026/T027/T028 parallel; T029/T030/T031 parallel; T032 needs T025–T029; T033 last.
- **US2 (Phase 5)**: after Foundational; T035 touches `app.routes.ts` and the Planechase view, so run after T029/T032.
- **US3 (Phase 6)**: T037 after T025; T038 after US1. (The translation skill it relies on is already built in Phase 1.)
- **US4 (Phase 7)**: after US1 (extends console, dock and the Planechase view).
- **US5 (Phase 8)**: after Foundational; T046/T047 after US1's view (T032). T042 → T044; T043 independent.
- **Polish (Phase 9)**: after the desired stories.

### Parallel Opportunities

- Maintainer Tooling: T001, T002, T003, T005, T006, T007 in parallel; T004 after T001.
- Setup: T010–T013 all touch different files.
- Foundational: T014+T015, T018, T023 in parallel; T022 in parallel with T019/T020.
- US1: T024, T026, T027, T028, T030, T031 in parallel.
- US5: T043 and T045 in parallel with T042/T044.

---

## Parallel Example: User Story 1

```bash
Task: "Create app-planar-image in src/app/shared/gameplay/planar-image/"
Task: "Create app-planar-console in src/app/shared/gameplay/planar-console/"
Task: "Create app-planar-dock in src/app/shared/gameplay/planar-dock/"
Task: "Create PlaneswalkFlair and ChaosFlair in src/app/shared/gameplay/flairs/"
Task: "Add Modos de jogo to NAV_DESTINATIONS in src/app/shared/layout/nav-links/nav-destinations.ts"
Task: "Create the GameModes view in src/app/views/game-modes/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Maintainer Tooling → **stop at T008** for the maintainer's runs (the only interruption)
2. Phase 2 Setup → Phase 3 Foundational
3. Phase 4 US1 → validate V1–V7, V21, V22
4. The default all-enabled deck is fully playable

### Incremental Delivery

1. After the T008 hand-off, run uninterrupted: US1 (MVP) → US2 (rules) → US3 (fallback, offline) — the three P1 stories
2. US4 (reset/end confirms, persistence checks) → US5 (deck settings + sync)
3. Polish

---

## Notes

- Every component: standalone, `ChangeDetectionStrategy.OnPush`, class-based DS primitives only, no Magic symbols, `@use 'breakpoints' as bp;` for breakpoints
- Views don't set their own page max-width/centering beyond the column widths ui.md specifies inside the view
- Card names, set names and English fallback text carry `lang="en"`
- Never start/stop the dev server; never run the sync scripts or the translation skill
