---
target: the home page
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:D:\\Usuario\\Projetos\\Dev\\Apps\\grimorio\\src\\app\\views\\home\\home.html"
target_fingerprint: "sha256:74453fafa8e78daf0246cbc4d8aa8de95e6cded258702a861b81b3c1784c7ff4"
target_path: "D:\\Usuario\\Projetos\\Dev\\Apps\\grimorio\\src\\app\\views\\home\\home.html"
timestamp: 2026-09-15T22-22-22Z
slug: src-app-views-home-home-html
---
# Home Page Design Critique

**Method: dual-agent** (A: independent design-review sub-agent, with live Playwright screenshots at 1280px/393px · B: independent detector + browser-evidence sub-agent, deterministic scan only — no browser tool available in its session)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Add/remove give no confirmation, toast, or undo — list just silently updates |
| 2 | Match System / Real World | 3 | PT-BR labels are natural and domain-appropriate |
| 3 | User Control and Freedom | 1 | Delete fires on a single click, no undo, no confirm |
| 4 | Consistency and Standards | 2 | Panel chrome hardcodes colors instead of design tokens (see below) |
| 5 | Error Prevention | 1 | No duplicate/empty-name guard messaging, no destructive-action confirmation |
| 6 | Recognition Rather Than Recall | 2 | List rows show name only — no metadata to tell items apart once populated |
| 7 | Flexibility and Efficiency | 1 | No search, sort, bulk actions, or shortcuts on a list explicitly built to scroll |
| 8 | Aesthetic and Minimalist Design | 1 | Mismatched panel chrome, unstyled white inputs, hardcoded gray text — clash, don't cohere |
| 9 | Error Recovery | 0 | The one validation path (blank name) fails silently with no message |
| 10 | Help and Documentation | 1 | No onboarding copy explaining what a "location" is or why it matters |
| **Total** | | **15/40** | **Poor** |

## Design Specificity Verdict

**LLM assessment**: Generic, unthemed CRUD scaffold, not authored for Grimorio specifically. Strip "Grimorio" and the PT-BR labels, and nothing identifies this as a Magic collection tool. Live screenshot shows two literal bright-white unstyled inputs on a near-black background — the loudest thing on the page is an accident, not a choice. Both panels are structurally identical with zero visual differentiation.

**Deterministic scan**: 5 findings, rule `design-system-color`, across 4 files:
- `dashboard-panel.scss:19` — hardcoded `#ddd` border (should be `var(--color-border)`)
- `entity-list.scss:14` — hardcoded `#666` empty-state text (should be `var(--color-text-muted)`)
- `home.html`, `dashboard-panel.html`, `entity-list.html` — computed `rgb(0,0,0)` text color on h1/h2/p.empty

The two hex findings are real, confirmed by the live screenshot. The three `rgb(0,0,0)` findings are likely false positives: `styles.scss` sets a global body text color and none of these elements override it (entity-list's p.empty is explicitly `#666` via its own rule, not black) — the detector appears to read computed color without resolving the actual cascade.

**Visual overlays**: No injection-based overlay ran (Assessment B had no browser tool). Assessment A captured direct Playwright screenshots at 1280px/393px as real rendered evidence, not a persistent overlay.

## Overall Impression

IA and plumbing are sound; visually and behaviorally this is pre-design, functional-only scaffolding. Biggest opportunity: this is the app's front door, and it currently undersells its own differentiator (precise physical card location) while carrying a real, unguarded data-loss risk (instant delete) on the first screen.

## What's Working

- Information architecture: two clearly-scoped panels, each with a "Ver tudo" escape hatch — no unnecessary nesting, good for a fast phone glance.
- Component reuse: EntityList/DashboardPanel shared between Locations and Decks — clean DRY pattern, easy to fix consistency app-wide once styled correctly.
- Nav bar: drawer/sidebar responsive pattern (verified live at both widths) actually feels designed — grouped sections, correct teal active-state.

## Priority Issues

**[P0] Unconfirmed, irreversible delete**
Why it matters: entity-list.html:9 fires remove.emit(item.id) from a single click — no dialog, no undo, no toast. A collector with nested storage locations or a built deck loses it permanently on one mis-tap; mobile (a primary usage scene) makes this worse (Remove sits in a tight flex row next to the item's own link). Screen-reader users have even less safety net: the button's only accessible name is "Remover" with no per-item aria-label.
Fix: reuse the existing dialog modal pattern (AuthModal/add-card-modal) for a confirm, or an undo-toast if a blocking dialog is too slow for rapid re-filing. Add a per-item aria-label regardless.
Suggested command: /impeccable harden

**[P1] Off-token panel chrome breaking the design system on screen one**
Why it matters: dashboard-panel.scss:19 hardcodes #ddd border, entity-list.scss:14 hardcodes #666 text — both confirmed live as visibly clashing light-gray elements against the near-black theme, on the app's very first screen. dashboard-panel.scss:2's margin-bottom: 2rem is the same pattern (matches var(--space-6) exactly).
Fix: swap all three to token equivalents — ~10-minute change, outsized visual impact.
Suggested command: /impeccable polish

**[P1] Unstyled native input elements**
Why it matters: no stylesheet styles input[type=text] for the dark theme — renders as the browser's stark white default, confirmed live at both widths. Loudest visual element on the page, and it's an accident.
Fix: add a token-driven input[type=text] rule following the same global-tag-selector convention _buttons.scss uses for button.
Suggested command: /impeccable polish

**[P2] Flat visual hierarchy and no chunking between list, status, and form**
Why it matters: h1/h2/form label are all similarly-weighted bold white text at close sizes; empty-state message and form label stack with no separation. Add-form is always fully expanded, taking roughly half of each panel's vertical space despite being a secondary action.
Fix: differentiate using the existing type scale (labels at smaller size + muted color); collapse add-form behind a "+ Adicionar" affordance.
Suggested command: /impeccable layout

**[P2] Generic CRUD feel undersells the product's own pitch**
Why it matters: nav already shows "Grimorio" as brand wordmark; page repeats it as h1 immediately below — redundant. First-timers get zero explanation of why location-tracking (the core differentiator) matters. Ember-orange accent (reserved for primary CTAs) appears nowhere in panel content.
Fix: replace redundant h1 with something orienting (state summary, or drop it); add first-run copy explaining the pitch; consider whether the most differentiated action deserves the one ember-orange CTA this page is missing.
Suggested command: /impeccable onboard

## Persona Red Flags

**Jordan (First-Timer)**: Sees "Grimorio" twice, two empty-state boxes, no onboarding copy explaining what a "local" is or why nesting it matters — the core value prop is invisible.

**Casey (Distracted Mobile User)**: At 393px, "Remover" sits in a tight flex row beside the item's own link — realistic mis-tap zone, worsened by zero delete confirmation.

**Sam (Accessibility/Screen Reader)**: Every delete button announces as unlabeled "Remover, button" with no per-item context — can't confirm which item is about to be deleted, and there's no confirmation step to catch a mistake after the fact.

## Minor Observations

- dashboard-panel.scss:2 margin-bottom should use the space-6 token.
- No text-overflow/max-width guard on list item names — long names have nothing preventing awkward wrap.
- scroll-area's max-height caps long lists correctly, but no scroll-affordance cue exists.
- "Ver tudo" link correctly renders teal per DESIGN.md's nav/links-only rule — the one place accent-teal shows up on this page.
