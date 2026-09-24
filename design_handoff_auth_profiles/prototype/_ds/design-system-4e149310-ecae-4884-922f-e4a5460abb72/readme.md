# Arcano — the Grimorio design system

**Arcano** is the design language of **Grimorio** (`grimório` = grimoire, in Portuguese): a free, PT-BR-first Magic: The Gathering collection and deck manager that tracks not just *what* you own but *where each physical card lives* (box → binder → divider). Angular 22 + Capacitor, no UI framework — every component and style is written from scratch.

Arcano's one idea: **a dark tome, retinted by the player.** The surface is a constant warm near-black (`#14110f`); the rings, glows, accents and CTAs take their color from the up-to-three Magic colors the player picks as their identity. Two people using the same app see two different-colored apps.

## Sources

- GitHub: **https://github.com/rofelixk/grimorio** (branch `main`) — the ground truth. Especially worth exploring further: [`DESIGN.md`](https://github.com/rofelixk/grimorio/blob/main/DESIGN.md), [`PRODUCT.md`](https://github.com/rofelixk/grimorio/blob/main/PRODUCT.md), `src/styles/` (`_tokens.scss`, `_modal.scss`, `_motion.scss`) and `src/app/shared/` (20 component families). Reading those files directly will always beat this summary for pixel decisions.
- `design_handoff_card_detail_step/` in that repo holds a standalone HTML handoff of the card-detail step.
- Uploaded assets: the 85-symbol Scryfall mana set (`uploads/*.svg` + `manifest.json`), copied into `assets/mana/`.
- No Figma file and no slide template were provided, so this system contains no slide kit.

**Note on `DESIGN.md`:** it still describes the pre-identity era (ember orange primary, spectral teal accent, no display font). The *code* has moved on — Grenze/Karla are loaded, and `theme.service.ts` drives colors from the player's picks. Arcano documents the code. Ember orange and teal survive only as the untinted fallback.

## Content fundamentals

- **Language: Portuguese (pt-BR), always.** Not a localization layer — the product is built for Brazilian players. UI strings: "Adicionar carta", "Coleção", "Buscar carta", "Nenhuma carta aqui ainda.", "Escolha até 3 cores para personalizar a tela de login."
- **Voice: second person, imperative, no fluff.** Instructions address the user directly ("Digite pelo menos 3 letras para buscar.", "Escolha um abaixo"). Never "we", never a mascot voice.
- **Sentence case everywhere** in running copy and buttons. UPPERCASE with `0.05em`–`0.14em` tracking is reserved for micro labels: drawer group headings ("ACERVO", "CONTA"), stat labels ("CARTAS", "ÚNICAS"), eyebrows ("LOCAL DE ARMAZENAMENTO").
- **Empty states name the next action**, in two lines max: "Nenhuma carta aqui ainda." / "Adicione a primeira carta deste local — ou crie um sublocal para organizar por divisória." Em dashes are used freely; exclamation marks are not.
- **Buttons are verbs**: "Adicionar carta", "Salvar tema", "Criar local", "Adicionar e buscar outra", "Remover". Progress states rewrite the label ("Buscando…", "Salvando…", "Excluindo…") rather than only spinning.
- **Errors are plain and specific**, in `--color-danger` directly under the control: "Essa carta não atende aos critérios atuais (identidade de cor, legalidade ou já está no deck)."
- **Destructive copy states the consequence**: "Excluir sua conta remove permanentemente seus decks, sua coleção e todos os dados associados."
- **Magic vocabulary stays in Magic's terms** — set codes, collector numbers, finish (nonfoil/foil/etched), condition (NM/SP/MP/HP), color identity, comandante, legalidade, singleton. Placeholder examples are real Magic data ("Sol Ring", "ex.: MH3", "ex.: 161", "ex.: Atraxa Superfriends").
- **No emoji.** The only glyphs used as text are ✕ (close), ☰ (menu), + / − (stepper), ✓ (checkbox), / (breadcrumb separator).
- **Vibe:** precise and a little arcane. Card names are set in a blackletter-adjacent serif; everything functional is quiet and sans. The app never jokes.

## Visual foundations

**Color.** A near-black *warm* page (`#14110f`) and three surface steps (`#1e1a17` → `#292320`, hairline `#3a332e`), parchment text (`#f2ede8`) and faded ink (`#a89e96`). On top of that, the player's identity: Branco `#d8cdb0`, Azul `#3d6b85`, Roxo `#7c5aa6`, Vermelho `#a8402c`, Verde `#4c7a43` — desaturated *on purpose*, because they tint UI rather than represent cards. Pick order is role order: 1st = primary, 2nd = accent, 3rd = tertiary, and unset roles fall back down the chain (tertiary → accent → primary → ember orange). Card glows and identity pips use Magic's **print** colors instead (`#f8f6d8 #0e68ab #8b5cc4 #d3202a #00733e`, silver for 4-color, gold `#d4af37` for 5) so players recognize them; black is brightened to violet so it can glow at all. Never blue-tinted grays. Never a second warm accent competing with the primary role.

**Type.** Two faces only. **Grenze** (600) for card names, view titles, stat values, plate names, modal headings. **Karla** (400–700) for literally everything else. Scale: 12 / 14 / 16 / 20 / 24 / 32 px, line-height 1.2 tight and 1.5 normal. Titles carry a glow text-shadow (`0 0 24px` of the primary role at 35%), not a hard color change.

**Spacing & layout.** 0.25rem base, six steps, nothing above 2rem. `--space-2` between related inline things, `--space-5` for modal and panel padding, `--space-6` between sections. The shell is `100dvh` and **the page never scrolls at html/body level** — the `<main>` is the default scroll region, and a view that needs another shape (Collection Detail, a modal body) opts out and owns its own scroller. Two breakpoints: 640px (stack, 44px touch targets, full-bleed modals) and 960px (drawer pins open as a 16rem sidebar via CSS Grid).

**Backgrounds.** No photography, no illustration, no repeating texture. Depth comes from three things: a **radial ember wash** from the top-left of a view header (16–18% of the primary role, fading to transparent by 58%), **conic-gradient rings** behind modals, and **blurred conic halos** breathing behind them. Plates use a single subtle vertical gradient (`surface-raised → surface`).

**Animation.** `cubic-bezier(0.4, 0, 0.2, 1)` throughout. 0.18s for hover/focus, 0.24s for collapses, 0.5s for dialogs (fade + `scale(0.92)` + `blur(6px)` via `@starting-style`), 28s for a full ring rotation, 4s for a card's multicolor ring. Expanding content animates with the **grid-template-rows 0fr → 1fr** trick — never JS height measurement — paired with `inert` while collapsed. Sparks fly off modal rings on seeded, staggered, rerolled paths (the planeswalker spark). Everything respects `prefers-reduced-motion`: rings freeze, the spinner slows rather than stops.

**Hover / press / focus.** Hover is *light*, not a darker shade: a border shifting to the role color plus an accent-tinted glow (`0 0 16px` at 40%, or `0 0 18px -4px` at 55% on plates). Scattered cards un-rotate, lift 6px and scale 1.04 on hover. Focus is a glow ring (`--ring-accent`, or a 2px role-colored outline with `outline-offset: -2px` inside clipped bars) — never the browser default. Disabled is `opacity: 0.5` + `not-allowed`. There is no shrink-on-press.

**Borders, shadows, radii.** Every border is exactly `1px solid var(--color-border)`; heavier weights don't exist. Radii: 4px controls, 8px containers, 14px card art (a purpose-tuned third value — Scryfall scans bake in their own corner radius), 50% for pips and identity swatches. One neutral shadow (`0 1px 3px rgba(0,0,0,.4)`) for resting modals; everything interactive glows in the accent instead (**the Candlelight Rule**).

**Cards & containers.** Panels: `--color-surface`, hairline border, 8px radius. Modals: transparent dialog + opaque `--color-bg` face inside a 2px ring gap, no border, full-bleed under 640px. Toolbars are **fused**: one outer border with 1px seams showing between opaque segments, never separately-boxed controls. Card grids never use chrome — the art *is* the card, laid out in a seeded rotated scatter.

**Transparency & blur.** Used sparingly and only for atmosphere: the halo (`blur(26px)`), the dialog backdrop (`rgba(0,0,0,.75)`), the dialog entrance blur, and 85%-opaque badges over art. No frosted-glass panels.

**Browser surfaces carry the design too**: scrollbars are themed (10px, `--color-surface-raised` thumb on `--color-bg` track).

## Iconography

- **The only icon set is Magic's own symbols** — 85 Scryfall SVGs in `assets/mana/` (mana colors, generic 0–20/100/1000000/∞, hybrid, phyrexian, half, snow, energy, tap/untap, planeswalker, acorn, ticket…). `assets/mana/manifest.json` maps each `{SYMBOL}` to its file, English reading, colors, and hybrid/phyrexian flags. They carry their own full print colors; an unselected symbol dims via `opacity: .55` rather than being desaturated. Use `<ManaSymbol code="2G" />`.
- **There is no general UI icon library** in the product — no Lucide, no icon font, no sprite. Interface affordances are text (`Remover`, `Voltar`, `Grade`/`Lista`) or single Unicode glyphs (✕ ☰ + − ✓). Do not add an icon set; if a screen seems to need one, use a word.
- **No logo exists.** The repo's PWA icons are the stock Angular mark, so they were deliberately not imported. Wherever a logo would go, set the word **Grimorio** in Grenze 700 in the primary role color.
- **No emoji, ever.**

## Index

- `styles.css` — the single entry point consumers link (imports only).
- `tokens/` — `fonts.css` (Grenze + Karla via Google Fonts), `colors.css`, `identity.css` (identity/print/role tokens), `typography.css`, `spacing.css`, `shape.css`, `motion.css`, `base.css`.
- `assets/mana/` — 85 mana/ability symbol SVGs + `manifest.json`.
- `guidelines/` — 17 specimen cards feeding the Design System tab (Colors, Type, Spacing, Brand).
- `ui_kits/grimorio-app/` — the interactive app recreation (`index.html`, `App.jsx`, `Screens.jsx`, `data.js`, `README.md`).
- `thumbnail.html`, `SKILL.md`, `github.md`.

### Components

`components/core/` — **Button**, **Input**, **Select**, **Checkbox**, **Spinner**, **SegmentedToggle**, **FusedBar**
`components/mtg/` — **ManaSymbol**, **ColorIdentity**, **ColorThemePicker**, **CardArt**
`components/collection/` — **CardScatterGrid**, **CardRowList**, **LocationStrip**, **SearchToolbar**, **DashboardPanel**, **EntityList**, **StatusBadge**, **EmptyState**
`components/chrome/` — **NavBar** (+ **NavDrawer**), **AuthControl**, **ViewHeader**, **ThemedModal**, **ThemeScope** (+ `themeVars`)

Mapping to the source's 20 `src/app/shared/` families: add-card-modal + auth-modal + location-modal → `ThemedModal`; card-search-panel → `SearchToolbar` + `CardScatterGrid`; collection-card-grid → `CardScatterGrid` + `CardRowList`; card-list / deck-card-list → `CardRowList` + `StatusBadge`; card-add-detail-panel is composed in the UI kit from `CardArt`/`Select`/`Checkbox`/`Input`; collection-children / deck-list → `EntityList`; card-scan-capture and spark-reroll are behavior-only and have no visual counterpart here.

**Intentional additions** (no 1:1 source component): `ManaSymbol` — an Icon wrapper for the symbol set the app loads by URL; `CardArt` — one place for the 488/680 ratio, the 14px art radius and the no-scan placeholder; `ThemeScope`/`themeVars` — the `--theme-*` binding Angular does with host bindings; `FusedBar` — the hairline-seam toolbar idiom repeated in three components; `EmptyState` — the dashed plate repeated across grids; `ViewHeader` — the ember header from Collection Detail.

## Do / don't

**Do** keep the identity roles doing the tinting (`--role-primary/-accent/-tertiary`), glow instead of drop-shadow, use native `<dialog>` for every modal, animate collapses with grid-rows, keep 44px touch targets, keep pips in Magic's print colors, and write in Portuguese.

**Don't** introduce a second warm accent, a third typeface, an icon library, a neutral gray hover shadow, a modal library, page-level scrolling, or a filled primary button (a filled Branco `#d8cdb0` CTA can't stay readable — primaries are glow buttons: dark surface, colored border and text).
