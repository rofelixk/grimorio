# Feature roadmap

Planned specs, in build order: earlier specs lay groundwork the later ones rely on. Item numbers (`#N`) point to [pending-items.md](pending-items.md); each item's detail lives there, so an entry here only groups, orders and scopes them.

Each entry:

- **Status**: `planned` → `specifying` (spec folder exists, fill in **Spec**) → `in progress`.
- **Goal**: the outcome, one or two sentences; the seed for `/speckit-specify`.
- **Items**: backlog items it absorbs. Check each still applies before specifying.
- **Why here**: what it needs from earlier specs, or what later specs need from it.
- **Open decisions**: questions to settle during `/speckit-clarify`.

When a spec ships, delete its entry here and its items from pending-items.md; the spec folder is the record. Entry numbers are permanent (pending-items.md refers to them), so the rest keep theirs. Shipped so far: 1 (spec 010, codebase baseline), 2 (spec 011, storage & sync foundation), 3 (spec 012, modals, focus & auth stores), 4 (spec 013, page transitions) and 5 (spec 014, reactivity & timing audit).

---

## 6. Mobile landscape

- **Status**: planned
- **Spec**: —
- **Goal**: A layout for short, wide screens (a phone in landscape) across the app shell, top bar, modals and the Planechase phone dock.
- **Items**:
  - #15 Add proper mobile-landscape layout
- **Why here**: Checks the shell, modals and page layouts, which specs 3 and 4 settle.
- **Open decisions**: The height threshold; whether DESIGN.md gains a landscape breakpoint.

---

## Opportunities

Needs too big for one spec are shaped in [opportunities/](../opportunities/README.md), and their features become specs from there.

- [OPP-001 Selling from a large collection](../opportunities/001-selling-collection.md): draft, build order pending.

---

## Deferred: card features

Not scheduled yet. Spec 010 removed all card components, card reading (OCR), catalog lookup and CSV import, so the card features start fresh; [reference/card-features.md](reference/card-features.md) records their tuned configuration. Items waiting for them:

- ~~#13 Sync card artist data~~ — done in spec 015 (`printings.artist`, `CardEntry.artist`)
- #38 Card-reading guardrails (lint guard and bundle budget for `tesseract.js`)
