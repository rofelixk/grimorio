# Handoff: Grimorio auth & profile modal (new design system, v1)

## Overview
This is a from-scratch redesign of how people enter Grimorio, implementing **spec `002-profiles-accounts`**:
- **Local profiles:** username + password, stored on the device, work offline, and are required for core features.
- **Cloud accounts:** optional, e-mail + password, used only for sync.

One themed modal covers the whole flow: pick / unlock / switch / sign out of a profile, create a profile (with the color-identity picker), local password reset, and every cloud-account flow (sign in, create, forgot password by code, new-device setup, expired session, recover a linked profile, unlink).

This modal is also the **first piece of a new app-wide design system**. `DESIGN.md` in this folder replaces the repo's current `DESIGN.md` and **all existing styling conventions**. Nothing older than it carries forward.

## About the design files
The files in `prototype/` are **design references built in HTML**: working prototypes showing the intended look and behavior. They are **not production code to copy**.
- They're written in a React-based prototyping format (`.dc.html` + `support.js` + a design-system bundle in `prototype/_ds/`).
- **Rebuild them in the Grimorio Angular app** (Angular + Capacitor, no UI framework), using native `<dialog>`, Angular signals/services for state, and plain CSS/SCSS driven by `tokens.css`.
- Don't port the React code. Don't depend on `prototype/_ds/`: its tokens and components are already folded into `tokens.css` and this README.

To view the prototypes, serve the `prototype/` folder over HTTP and open `Auth Modal v2.dc.html`. It's a canvas with every flow on desktop and mobile, each working independently.
- The panel's `identity` tweak changes the sample profile's colors, and its `offline` tweak makes every cloud action fail.

**Test data in the prototype:**
- Local password for every profile: `grimorio123`.
- Cloud accounts:
  - `rafa@exemplo.com` / `grimorio123` — saved colors Esper
  - `bia@exemplo.com` — already linked to the profile "bia"
  - `erro@exemplo.com` — triggers the unrecognized-error message
- Reset code: `123456`.

## Fidelity
**High fidelity.** The final colors, typography, spacing, motion and copy are all given here. Recreate them exactly. Where this README and `DESIGN.md` disagree, **`DESIGN.md` wins**.

## Source-of-truth order
1. `DESIGN.md` — rules, tokens, components, content.
2. `tokens.css` — the same tokens as CSS custom properties; import it once at the app root.
3. `STATES.md` — every screen and state: triggers, copy, fields, transitions, errors, spec mapping.
4. This README — layout measurements and behavior.
5. `prototype/` — the running reference for anything still unclear.

**Undecided — don't invent these:**
- success and warning colors
- the delete-profile flow
- the active-profile / sync-status indicator in the app shell

Add them to `DESIGN.md` first when they're designed.

## Screens / views

### Modal shell (every mode)
- **Dialog:** a native `<dialog>` with a transparent background; backdrop `var(--overlay-backdrop)` (`rgba(0,0,0,.75)`).
- **Ring:** a wrapper with `padding: 2px`, `border-radius: 10px`, `background: var(--ring-gradient)` and `animation: spin-angle 28s linear infinite`. `position: relative` so the halo and sparks can be placed inside it.
- **Halo:** inside the ring, `position:absolute; inset:-32px; border-radius:70px; filter:blur(26px); background:var(--halo-gradient)`.
  - Animation: `spin-angle 28s linear infinite, flicker 6s ease-in-out infinite`.
  - `pointer-events:none`.
- **Sparks:** see Interactions.
- **Face:** `position:relative; z-index:1; background:var(--color-bg); border-radius:8px; box-shadow:var(--shadow-rest); overflow:hidden`.
- **Themed root:** set `--theme-primary/-accent/-tertiary(+-hover)` from the identity in view, and add `data-theme-scope` (see `tokens.css`) so the `--role-*` chain resolves locally.
- **Close:** a ✕ text button, 44×44, transparent. It closes the modal and resets everything.

### Desktop (≥ 640px)
- **Face:** `width: 880px`, CSS grid `grid-template-columns: 400px minmax(0,1fr)`. Height is animated to fit the content (see Interactions), with a minimum of 460px.
- **Identity pane (left, 400px):**
  - `display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1.5rem; padding:2rem`.
  - `border-right:1px solid var(--color-border)`; `background:var(--wash-header)`.
  - It holds the **identity wheel** (300×300) and a caption under it: 0.875rem muted, centered, `max-width:300px`, `min-height: 2 lines` (so the wheel never shifts).
- **Form pane (right):**
  - Padding: `0.75rem 0.75rem 1.5rem 2rem`, flex column.
  - A close row, 44px high and right-aligned.
  - Content: a column with `gap:1rem` and `padding-right:1.5rem`, containing:
    - the title block: title in Grenze 600, 2rem, `text-shadow:var(--glow-title)`; the subtitle 0.875rem muted, `gap:.5rem` below it
    - the fields, `gap:1rem`
    - any form error
    - the primary button, full width
    - any secondary items
  - **Bottom prompt:** `margin-top:auto; padding-top:1rem; border-top:1px solid var(--color-border)`, centered, 0.875rem muted: "Question? **Link**".

### Mobile (< 640px)
- The modal is full-bleed. The ring's 2px gap runs around the screen edge.
- **Header:**
  - `padding:40px 0.75rem 0.75rem 1.5rem` (40px top is the safe area in the mock — use `env(safe-area-inset-top)`). `border-bottom` hairline; `background:var(--wash-header)`.
  - Left: the "Grimorio" wordmark, Grenze 700, 1.25rem, `color:var(--role-primary)`, glow.
  - Right: the **identity chip** + ✕.
- **Body:** `flex:1; overflow-y:auto; padding:1.5rem; gap:1rem`. Title 1.5rem. The prompt is pinned last with `margin-top:auto; min-height:44px`.
- Text links get `min-height:44px`.
- Multi-button rows stack vertically, each full width.
- The identity wheel appears **only in Criar perfil**, below the password field, at 240px, with the eyebrow "SUA IDENTIDADE" above it and the helper "Escolha até 3 cores. A primeira tinge o app inteiro — dá para mudar depois." below it.

### Identity wheel (signature component)
- **Container:** square (300px desktop / 240px mobile), `position:relative`.
- **Inner glow:** `inset:13%`, 50% radius, `radial-gradient(circle, rgb(from var(--role-primary) r g b / 18%), transparent 70%)`.
- **Rotating ring:**
  - Same box. `background: conic-gradient(from var(--spin-angle), var(--role-primary), var(--role-accent), var(--role-tertiary), var(--role-primary))`.
  - Masked to 2px: `mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))`.
  - `opacity:.7`; `spin-angle 28s linear infinite`.
- **Swatches:** 19% × 19%, 50% radius, `1px solid var(--color-border)`, filled with the identity base color.
  - Placed **clockwise from the top: W → U → B → R → G**, at `left/top`: W 40.5%/3.5% · U 75.7%/29.1% · B 62.3%/70.4% · R 18.7%/70.4% · G 5.3%/29.1%.
  - Transition: `transform, opacity, box-shadow 0.5s var(--ease-standard)`.
- **Swatch states:**
  - **None lit** (no identity shown): all opacity .85, scale 1, no ring.
  - **Display mode:** lit opacity 1, `scale(1.06)`, ring `0 0 0 3px var(--color-bg), 0 0 0 4px <hex>, 0 0 20px rgb(<hex> / 50%)`; unlit opacity .35, `scale(.88)`.
  - **Picker mode** (Criar perfil only): unlit .55, locked .3 + `cursor:not-allowed`.
    - Up to 3 picks, and at least 1 always stays picked.
    - Pick order sets the roles.
    - Each swatch is a `<button aria-pressed aria-label="Branco|Azul|Preto|Vermelho|Verde">`.
- **Center** (absolute, flex-centered, `pointer-events:none`):
  - With colors: the **tribe name** (Grenze 600, 2rem, glow, max-width 54%, wraps) + a muted 0.75rem subline (the profile name, or the color names joined with " · ").
  - With no colors: the "Grimorio" wordmark (Grenze 700, 2rem, role-primary).
- **Tribe names:** see `DESIGN.md` → Identity wheel. W U B R G order is the lookup key, e.g. `UR` → Izzet, `WUB` → Esper, `R` → Mono-vermelho.

### Profile list rows
- **List:** a column with `gap:.5rem`, `role="list"`.
- **Row:** a `<button>`, full width, `min-height:56px`, `padding:.5rem .75rem`, `gap:.75rem`.
  - Background `linear-gradient(var(--color-surface-raised), var(--color-surface))`, `1px solid var(--color-border)`, radius 8px.
  - Hover: border → `var(--role-primary)`, `box-shadow: var(--glow-plate-hover)`, 0.18s.
- **Row contents:**
  - A **mini wheel**: 36px, with five 22% dots at W 39%/2% · U 74.2%/27.6% · B 60.8%/68.9% · R 17.2%/68.9% · G 3.8%/27.6%. Lit dots opacity 1 + `0 0 6px <hex>`; unlit .18.
  - The name, Karla 700, 1rem.
  - Meta, 0.75rem muted: "{Tribe} · Vinculado à nuvem" or "{Tribe} · Só neste aparelho".
- **Active profile** (switch mode):
  - Listed first, with a border in its primary color, `aria-current="true"`. It can't be picked.
  - "Em uso" badge, `margin-left:auto`: 0.75rem, 700, uppercase, 0.05em tracking, `padding:2px .5rem`, radius 4px, border and `0 0 12px -2px` glow in its own color.
- **Create row:** transparent, `1px dashed var(--color-border)`, muted text, "+" in a 36px slot + "Criar novo perfil". Hover: text → text color, border → `var(--role-accent)`.
- **Sign out** (active profile only): a secondary full-width button under the list, "Sair de {P}".

### Other parts
- **Inputs:**
  - Label 0.875rem above the field.
  - Field: `background:var(--color-surface)`, hairline, radius 4px, `min-height:44px`, `padding:.5rem .75rem`, `font:inherit`.
  - Helper 0.75rem muted below, hidden while an error shows. Error 0.875rem `var(--color-danger)` below.
- **Buttons:** radius 4px, hairline, `padding:.5rem .75rem`, `min-height:44px`, Karla.
  - **Primary:** `background:var(--color-surface-raised); color:var(--role-primary); border-color:var(--role-primary); font-weight:700; text-shadow:var(--glow-button-text); box-shadow:var(--glow-button)`. Never filled.
  - **Secondary:** raised face, text color.
  - **Ghost:** transparent, no border.
  - **Danger:** `background:var(--color-danger-bg); color/border: var(--color-danger)`.
  - **All:** disabled `opacity:.5; cursor:not-allowed`; no press shrink.
- **Divider "OU":** a flex row, hairline · 0.75rem uppercase muted, 0.05em tracking · hairline.
- **Info plate** (the "Conta na nuvem" e-mail chip, the sign-out notice): surface background, hairline, radius 4px, `padding:.5rem .75rem`. The chip has an eyebrow (0.75rem, uppercase, 0.05em tracking, muted) above the e-mail.
- **Identity chip** (mobile header): 8px dots with `0 0 6px` glows + "{P} · {Tribe}" in 0.75rem. Surface background, hairline, radius 4px, `min-height:28px`, `gap:6px`.
- **Sync line:** `role="status"`, 0.875rem.
  - While syncing: a 1em spinner (2px `currentColor` ring with a transparent top, `spin .6s linear infinite`, color `var(--role-accent)`).
  - When done: an 8px `var(--role-accent)` dot with an `0 0 8px` glow.

## Interactions & behavior
- **Themed colors:** the modal root is always themed. The colors come from the profile in view, the live wheel picks, the cloud account's colors, or the **default Vermelho → Azul → Verde** when no profile is active (FR-012). See STATES.md → Colors.
- **Hover preview:** in the list, `mouseenter`/`focus` on a row retints the whole modal to that profile. Clear it on the list container's `mouseleave`, **not** the row's, so the gaps between rows don't flicker. The create row clears the preview on enter/focus. With an active profile and nothing hovered, the preview shows the active profile.
- **Fluid height (desktop):** the face has an explicit height, transitioned with `height 0.24s var(--ease-standard)`.
  - Target: `max(460, 12 + 44 + formContentHeight + (prompt ? 16 + promptHeight : 0) + 24)`.
  - Measure the form content and the prompt with a ResizeObserver. Re-measure after fonts load and after each render.
  - In Angular, drive the height from a signal set by the observer.
- **Sparks:**
  - Desktop: 20 absolutely placed dots, 2–4.5px, `border-radius:50%`, background and `0 0 6px 1px` glow in a random role color. They start on a random point of the ring's perimeter and fly outward 28–84px, ±60% sideways. Animation `spark` over 1.6–3.2s with a 0–3.2s start delay; when one finishes, reroll it with a 0–0.9s delay.
  - Mobile: 12 sparks drifting 14–36px **inward** from the screen edges.
  - `pointer-events:none; z-index:2`.
- **Wheel pick/retint:** each newly lit color plays a 0.7s `ripple` ring (19% box, `2px solid <hex>`, `0 0 16px <hex>`) plus 8 burst sparks (3px, 26–46px radial, 0.6–0.9s). This also plays when linking retints to the cloud account's colors.
- **Tribe name:** re-mount it (e.g. `@for … track name`) so `name-in 0.5s` replays every time the name changes.
- **Forms:**
  - Validate on submit, before any request.
  - A field error clears when that field changes.
  - While a request runs the button is disabled and its label rewritten ("Entrando…"), so double-submit is impossible.
  - Switching forms clears all errors and the password/code fields; the e-mail stays.
  - Closing the modal resets everything.
- **Timing in the prototype:** local actions ~700 ms and cloud actions ~1.1 s (simulated), with ~2.2 s of syncing after link/create/unlock of a linked profile/setup. Replace these with real async calls.
- **Reset code:** digits only, max 6. After sending there's a 30 s cooldown with the label "Reenviar em {n}s"; after that it reads "Enviar novo código". The same confirmation appears whether or not the account exists.
- **Forgot password from unlock:** a linked profile goes to `recover-form` (cloud sign-in → new local password); an unlinked one goes to `localreset-warn`.
- **Sign out:** "Saindo…" for 700 ms. Then no profile is active, the modal returns to default colors, and the signed-out list shows the notice.
- **Reduced motion:** stop every ring, halo, spark, ripple and name animation (`animation:none`). Keep everything static and legible.
- **Accessibility:**
  - Native dialog focus trap.
  - `role="alert"` on form errors, `role="status"` on the sync line and notices.
  - `aria-pressed` on picker swatches, `aria-current` on the active row, `aria-label="Fechar"` on ✕.
  - `autocomplete`: `username`, `email`, `current-password`, `new-password`, `one-time-code` (the code field also gets `inputmode="numeric"`).

## State management
**Modal inputs:**
- `context` (`gate` | `device` | `link`)
- the initial `mode`
- `activeProfile?` (switch mode)
- the profile list (name, identity, linked e-mail?)
- the linked e-mail (cloud flows)
- online status

**Internal state:**
- `mode` + `step` → the phase (see STATES.md)
- `selectedProfile`, `hoveredProfile`, `backTarget` (where reset returns to)
- fields: `email`, `password`, `code`, `username`, `picks[]`
- `fieldErrors{}`, `formError`, `emailInUse`
- `loading`, `done`, `doneKind`, `syncing`
- `cooldown`, `cloudColors[]`, `notice`
- `measuredHeight` (desktop)

**Services (from spec 002):**
- local profile store: create / verify password / reset / list / active profile / sign out
- cloud auth: sign in / sign up / request code / verify code + set password / session state
- link / unlink
- sync trigger + status
- backend error → PT-BR message mapper (generic fallback)

## Design tokens
All tokens live in `tokens.css`, mirrored in `DESIGN.md`'s front matter.

| Group | Values |
|---|---|
| Surfaces | page `#14110f` · surface `#1e1a17` · raised `#292320` · border `#3a332e` · text `#f2ede8` · muted `#a89e96` · backdrop `rgba(0,0,0,.75)` |
| Danger | `oklch(0.72 0.16 28)` · danger background `oklch(0.27 0.06 28)` |
| Identity (base / hover) | W `#d8cdb0` / `#e6dcc2` · U `#3d6b85` / `#4c7f9c` · B `#7c5aa6` / `#8f6bb8` · R `#a8402c` / `#bf4f39` · G `#4c7a43` / `#5c8f52` |
| Default identity | R → U → G |
| Type | Grenze 600/700; Karla 400–700 · sizes 12 / 14 / 16 / 20 / 24 / 32px · line-height 1.2 / 1.5 · tracking .05em / .14em |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32px |
| Radii | 4 · 8 · 10 (ring) · 50% |
| Shadow | `0 1px 3px rgba(0,0,0,.4)` (rest only) |
| Glows | see `tokens.css` recipes |
| Motion | `cubic-bezier(.4,0,.2,1)` · .18s / .24s / .5s · ring 28s · flicker 6s |

## Assets
- **None.** No icons, no images, no Magic symbols.
- The only text glyphs are **✕** and **+**.
- The "Grimorio" wordmark is set in type (Grenze 700), not an image.
- Fonts: Grenze + Karla from Google Fonts (loaded by `tokens.css`).

## Files
- `DESIGN.md` — the new design system. **Replace the repo's `DESIGN.md` with it.**
- `tokens.css` — CSS custom properties, keyframes and the reduced-motion rule.
- `STATES.md` — the state matrix (copy, fields, transitions, errors, spec requirements).
- `prototype/Auth Modal v2.dc.html` — the review board with every flow on desktop and mobile.
- `prototype/GrimorioAuthModal.dc.html` — the modal. Its logic class holds the exact state machine, validation and copy.
- `prototype/support.js`, `prototype/_ds/` — runtime needed only to open the prototypes locally.
