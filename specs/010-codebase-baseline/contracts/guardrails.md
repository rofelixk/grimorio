# Contract: Guardrails (lint and build)

The maintainer-facing interface this spec adds is what `npm run lint` and `npm run build` accept and reject. Each row is one checkable promise (SC-002, SC-003).

## `npm run lint` (ESLint CLI over `src/`)

| Change | Result | Message points to |
|--------|--------|-------------------|
| Static import of `…/planechase/cards.json` or `…/planechase/cards.pt-br.json` | **error** | `PlanechaseCatalogService`'s lazy `import()` |
| `await import('…/planechase/cards.json')` | passes | — |
| From outside `src/app/core/`: `import … from '../…/core/…'` (value or type) | **error** | The `@models`/`@services`/`@utils`/`@testing`/`@data`/`@db` aliases |
| From outside `src/app/shared/`: `import … from '../…/shared/…'` | **error** | `@shared/…` |
| Relative `../` import within `core/` or within `shared/` | passes | — |
| A promise-returning call as a bare statement (not awaited, returned, `.catch`/`.then(…, onRejected)`-handled, or prefixed with `void`) | **error** | `void` marks a deliberate fire-and-forget |
| A promise-returning function passed where a void callback or a condition is expected (e.g. `addEventListener('x', async () => …)`, `if (promise)`) | **error** | — |
| New `@Input()`/`@Output()`/`@ViewChild()`-style member | **warning** (exit code 0) | `input()`/`output()`/`viewChild()` |
| The unchanged tree, with its recorded exceptions (`eslint-suppressions.json`) | passes, 0 warnings | — |
| A recorded exception fixed without pruning the record | **error** ("suppressions left that do not occur anymore") | `npx eslint src --prune-suppressions` |
| One extra unhandled promise in a file that already has a recorded one | **error** | — |

## `npm run build` (production configuration)

| Change | Result |
|--------|--------|
| Initial bundle > 1.25 MB | warning |
| Initial bundle > 1.5 MB | **build fails** |
| Any component stylesheet > ≈2× / ≈4× today's largest | warning / **build fails** |
| `cards-json` or `cards-pt-br-json` chunk > ≈210 kB / ≈420 kB | warning / **build fails** |
| Unchanged tree | builds with no budget warning |

## `IdentityService` (internal API change)

| Member | Before | After |
|--------|--------|-------|
| `activeColors` | `Signal<Color[] \| null>` | removed |
| `colors` | — | `Signal<readonly Color[]>`: the profile's colors, or `DEFAULT_IDENTITY` |
| `roles` | `rolesFor(activeColors() ?? DEFAULT_IDENTITY)` | `rolesFor(colors())`, same values |
