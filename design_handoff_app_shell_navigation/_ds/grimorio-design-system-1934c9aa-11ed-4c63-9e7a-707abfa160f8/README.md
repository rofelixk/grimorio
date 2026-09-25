# Grimorio Design System

**Grimorio** (Portuguese for "grimoire") is a free, PT-BR-only Magic: The Gathering collection and deck manager that tracks where each physical card is stored. It is **local-first**: profiles live on the device and a cloud account is optional. It runs as a responsive web app / PWA — on phones for quick use while sorting cards, on desktop for larger-scale management.

**North star: "A dark tome, retinted by the player."** A constant warm near-black surface; every ring, glow, title shadow, primary button and spark takes its color from the active profile's color identity (up to three of W U B R G).

## Sources
- GitHub: **https://github.com/rofelixk/grimorio** (branch `main`) — source of truth is `design_brief/` (README.md, DESIGN.md, tokens.css, controls.css, components/*.css, SPECS.md, STATES.md, entry-copy.ts). The app is Angular (`src/styles/`, `src/app/shared/ds/`). Explore the repo further for details this system abbreviates.
- Order of authority when files disagree: DESIGN.md → tokens.css → controls.css → components/*.css → SPECS.md → STATES.md → entry-copy.ts.

## Scope — what exists and what doesn't
Decided and built here: foundations, class primitives, the entry (profile/account) modal and its parts, the app top bar.
**Undecided — do not invent:** success/warning colors, delete-profile flow, the active-profile/sync indicator in the shell (the top-bar profile button is a placeholder), navigation, Home, any collection/card/deck/location/scan UI, any Magic symbols or card imagery.
**Retired (from the old "Arcano" project) — never recreate:** the ember-orange/teal palette and `--color-primary/-accent`, teal focus ring, pastel status colors, MTG print colors, mana symbols, glyphs ☰ − ✓ and "/", "Roxo" for B (it's **Preto**), Grenze 400/italic, layout/semantic alias tokens, and all legacy components (NavBar, CardScatterGrid, Select, Checkbox, EmptyState, SegmentedToggle…). The repo's PWA icons (orange/teal "G" disc) belong to that retired palette and were intentionally not imported.

---

## CONTENT FUNDAMENTALS
- **PT-BR only.** Second person ("você", implied), imperative. **No "we", no exclamation marks, no emoji.** Em dashes are welcome.
- **Sentence case everywhere.** Uppercase only via CSS on micro labels and eyebrows ("OU", "EM USO", "SUA IDENTIDADE").
- **Buttons are verbs:** Entrar, Criar perfil, Desbloquear, Enviar código, Salvar e entrar, Desvincular, Sair de {perfil}, Concluir. While a request runs the label is rewritten and the button locked: "Entrando…", "Criando perfil…", "Enviando…", "Saindo…".
- **Errors are plain and specific**, never raw backend text: "Senha incorreta." · "Use pelo menos 8 caracteres." · "E-mail ou senha incorretos." (never reveals whether an account exists) · "Sem conexão. A conta na nuvem precisa de internet — o resto do app continua funcionando." · fallback "Algo deu errado. Tente de novo em instantes."
- **State the consequence** of destructive/permissive actions: "Desvincular não apaga nada — nem aqui, nem na nuvem."
- **Bottom prompts = question + link:** "Ainda não tem conta na nuvem? **Criar conta**", "Não é você? **Trocar de perfil**".
- **Identity is always named twice:** tribe name for flavor + color names for clarity ("Izzet · Azul · Vermelho"). Never rely on color alone.
- Vibe: precise, a little arcane, calm; never playful. Reassuring about local-first ("funciona sem internet — sem e-mail").
- All approved strings live in the repo's `design_brief/entry-copy.ts`; reuse them verbatim.

## VISUAL FOUNDATIONS
- **Color.** Neutral scale is constant, warm, never blue-tinted: page #14110f, surface #1e1a17, raised #292320, border #3a332e, text #f2ede8 (parchment, not white), muted #a89e96. Only three **roles** carry color (`--role-primary/-accent/-tertiary`), resolved from the profile's ordered picks; fallback tertiary → accent → primary → default identity (**Vermelho → Azul → Verde**). Identity colors are desaturated on purpose; Preto shows as violet so it can glow. Danger is the only status color (oklch 0.72 0.16 28 text on a dark red-tinted 0.27 face — never pastel). Never hard-code an identity hex into chrome; swatches/pips are the only exception.
- **Theming mechanics.** A themed subtree sets `--theme-*` and carries `[data-theme-scope]` so the role chain and light recipes re-resolve there (`Identity.themeVars(picks)` builds the style object).
- **Type.** Grenze 600 (titles, tribe names) / 700 (wordmark) + Karla 400–700 for everything functional. Sizes 0.75/0.875/1/1.25/1.5/2rem; line-heights 1.2/1.5; tracking 0.05em (micro) / 0.14em (eyebrow). Titles glow (`--glow-title`), never change color. `text-wrap: pretty` on copy.
- **Spacing.** 0.25rem base, six steps, **nothing above 2rem**. space-2 between inline items and list rows, space-4 between fields, space-5/6 for pane padding. 44px touch targets on everything, including text links.
- **Backgrounds.** Flat page color. No images, textures, patterns or illustrations. The only gradients are role-tinted light: the radial **wash** (top-left, 18% → transparent 58%) on the identity pane / mobile header, the conic **ring** and **halo**, and the list row's subtle vertical raised→surface gradient.
- **Elevation = light (Candlelight Rule).** One neutral shadow (`0 1px 3px rgba(0,0,0,.4)`, modal face at rest). Everything else is a role glow: button glow 20px/35% + text 8px/60%, row hover 0 0 18px -4px/55%, selected swatch ring `0 0 0 3px bg, 0 0 0 4px hex, 0 0 20px hex/50%`.
- **Borders.** Every border exactly 1px solid; the "create" row is dashed. No heavier weights.
- **Corner radii.** 4px controls (buttons, inputs, chips, badges, plates) · 8px containers (modal face, list rows) · 10px ring (8 + 2px gap) · 50% swatches, pips, wheel.
- **Cards.** There are no generic cards. Containers are the modal face (page color, 8px, rest shadow inside a 2px conic ring) and list rows (gradient, hairline, 8px). Plates: surface + hairline + 4px.
- **Hover.** Border → role-primary (buttons, inputs, rows) + glow on rows; primary button text/border → primary-hover; links → accent-hover + underline; ghost gains a hairline; dashed row text → text color, border → role-accent. 0.18s.
- **Press.** No shrink, no color flash. Disabled = opacity .5 + not-allowed.
- **Focus.** `outline: 2px solid var(--role-accent); outline-offset: 2px`.
- **Motion.** One easing, `cubic-bezier(0.4, 0, 0.2, 1)`. 0.18s hover, 0.24s modal height (the desktop modal animates to its content, min 460px — never jumps), 0.5s swatch state + name entrance (fade + blur 6px + scale .92). Ring/halo rotate over 28s; halo flickers .3↔.7 over 6s. Sparks (20 desktop outward, 12 mobile inward) and a ripple + 8-spark burst on each newly lit color. **`prefers-reduced-motion`: all of it stops.**
- **Transparency & blur.** Only for atmosphere: the halo (blur 26px), the backdrop (black 75%), the name blur-in. No frosted glass.
- **Imagery.** None. No card art, no Magic symbols (WotC fan-content policy).
- **Layout.** Desktop modal 880px, grid 400px identity pane | form pane (44px close row, content, prompt pinned bottom with hairline). Below 640px: full-bleed, header (wordmark + identity chip + ✕), scrolling body, stacked buttons. App top bar: 44px, page bg, hairline below, wordmark 1.25rem left. Text that swaps under the wheel reserves two lines.

## ICONOGRAPHY
- **No icon library, no icon font, no SVG icons, no emoji, no Magic symbols.** Identity is shown with plain color swatches + written names.
- The **only** glyphs used as text are **✕** (close, 44×44 transparent button, `aria-label="Fechar"`) and **+** (create row, in a 36px slot).
- **No logo.** The word **Grimorio** in Grenze 700, in `--role-primary` with the title glow, is the mark (class `.grm-wordmark`). Nothing in `assets/` — intentionally.
- Tribe/guild names are Wizards of the Coast terms — confirm fan-content policy compliance before release.

---

## Index
- `styles.css` — entry point (imports only). `tokens/` fonts, colors (+ role chain), light recipes, typography, spacing/sizes/shape, motion (+ keyframes, reduced motion), base. `css/controls.css` class primitives (`.btn*`, `.link-btn`, `.field*`, `.plate`, `.eyebrow`, `.micro-label`, `.divider`). `css/components.css` component styles (`.grm-*`).
- `guidelines/` — foundation specimen cards (Colors, Elevation, Type, Spacing, Motion, Brand).
- `components/` — React primitives (below), each with `.d.ts` + `.prompt.md` and one card per directory.
- `ui_kits/app/` — top bar + themed entry modal click-through (desktop + mobile).
- `SKILL.md`, `github.md`, `thumbnail.html`.

## Components
- **controls/** — `Button` (primary glow · secondary · ghost · danger · block), `LinkButton`, `Divider`, `Eyebrow`, `MicroLabel`
- **fields/** — `TextField` (label, helper, error, readonly), `Plate` (info plate / "Conta na nuvem" chip / notice)
- **identity/** — `IdentityWheel` (picker · display · neutral), `MiniWheel`, `IdentityChip`, `Identity` (data + helpers: ORDER, COLORS, TRIBES, tribeName, colorNames, themeVars)
- **profile/** — `ProfileRow` (normal · active "Em uso" · dashed create)
- **modal/** — `ThemedModal` (ring + halo + face, desktop/mobile, fluid height), `SparkField`
- **status/** — `SyncLine` (pending · done · failed)
- **shell/** — `TopBar`

### Intentional additions
- `Identity` — a data/helper export (tribe lookup, role style object) so every consumer resolves names and roles the same way.
- `Divider`, `Eyebrow`, `MicroLabel`, `LinkButton`, `Plate` wrap the brief's class primitives of the same names.
- `.grm-stack`, `.grm-form-error`, `.grm-btn-row` helper classes for modal body layout (from SPECS.md spacing rules).

## Fonts
Grenze (600, 700) and Karla (400–700) load from Google Fonts via `tokens/fonts.css`, exactly as the app does. No local binaries.
