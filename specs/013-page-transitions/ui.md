# UI: Page Transitions

Nothing a person sees changes, except FR-009's settle on an interrupted change. DESIGN.md is not edited. This file records what changes in the DOM, so the design audit can check it against DESIGN.md Motion "Collections page change", "Decks page change" and "Page sweep".

## 1. Surfaces

| Surface | Status | Component |
|---|---|---|
| Collection area (list, collection page, holding box) | modified: markup moves into the shared sweep | `CollectionArea` (`views/collection-area/`) |
| Deck area (list, deck page) | modified: markup moves into the shared sweep, and its two place templates merge into one | `DeckArea` (`views/deck-area/`) |
| Page sweep | new shared component, no new visuals | `PageSweep` (`shared/effects/page-sweep/`) |

## 2. Layout

Same on every breakpoint. Only the nesting changes:

```text
app-collection-area / app-deck-area      :host flex column, flex 1 0 auto (unchanged)
├── app-page-sweep                       positioned flex column, flex 1 0 auto (was the area :host's role)
│   ├── <incoming page>                  .page / .column, as today
│   ├── div.sweep[.sweep--close]         only while a change runs; absolute, top = −captured scroll
│   │   └── <outgoing page>
│   └── canvas.dust                      absolute over the host; absent under reduced motion
├── <form dialog>                        mounted only while open, as today
└── <delete dialog>
```

- The incoming page stays the first child and is never re-created when a sweep starts (collections already work this way; decks used to switch branches).
- The `.sweep` layer and the canvas are positioned against `app-page-sweep`, which fills the same box the area host filled.

## 3. States

| State | What's in the DOM | Requirement |
|---|---|---|
| Settled | the incoming page and the canvas (when motion is allowed) | US1 |
| Sweeping | + `.sweep` with the outgoing page. The host is `inert` | FR-012, US1 scenario 7 |
| Interrupted by a sweep | the old `.sweep` content is replaced by the new outgoing page with `--front` reset, so it starts whole. The dust is cleared and restarted | FR-009 |
| Interrupted by an instant swap or the same place | `.sweep` is removed and `inert` cleared. The dust fades out, gone ≤ 1 s | FR-009, SC-004 |
| Reduced motion | no canvas, no `.sweep` ever | FR-007 |
| Outgoing record removed mid-sweep | the outgoing page keeps its last content until the sweep ends | edge case, FR-004 |

## 4. Interaction flow

Unchanged triggers (DESIGN.md Motion):

- **Collections**: every navigation sweeps (open going deeper or sideways, close going up), except the first place and the redirects. The missing place and the landing on the parent after a delete are now marked `info.sweep = false` instead of the `redirecting` flag.
- **Decks**: open only from the tile (`info.sweep = true`). Close for the back link, side-nav "Decks" and browser/Android back. Instant for a direct load, browser forward, a typed address, the delete landing and the missing-deck redirect (both `info.sweep = false`).

## 5. Design-system reuse

- The `.sweep`, `.sweep--close` and `.dust` rules and the `@property --front` move from `src/styles/_page-sweep.scss` into the component's stylesheet. The partial is deleted. Values are unchanged, except that `--band` is now bound from `FRONT_BAND`, not declared.
- The area stylesheets drop `@use 'page-sweep'` / `@include page-sweep.layers`, and their `:host` drops `position: relative`.
- The deck area's unused `is-turning` host class is removed.

## 6. Accessibility

- Input is blocked with `inert` on the sweep host while a change runs (DESIGN.md "Page sweep").
- After each change except the first place, focus moves to the incoming page's `h1` (`tabindex="-1"`), so the new page is announced. This is unchanged behavior, now done by the shared sweep.
- The dust canvas stays `aria-hidden` and `pointer-events: none`.
- Reduced motion: an instant swap, and no canvas in the DOM.

## 7. Copy

No user-visible text changes (FR-020).
