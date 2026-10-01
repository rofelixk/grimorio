# Data Model: Modals, Focus & Auth Stores

Nothing persisted changes: no IndexedDB store, Supabase table or `localStorage` key is added or altered. This file models the runtime state of the three shared units and who owns each instance.

## 1. Modal face (`FluidHeight`)

One instance per open modal, created in the modal component's constructor and dropped with it.

| State | Kind | Meaning |
|---|---|---|
| `armed` | `is-sized` class on the face | Set at the first `pointerdown`/`keydown` inside the `<dialog>`; never cleared while open. The CSS transition on `height` exists only while it is set. |
| `resizing` | `is-resizing` class on the scroller | Set when an armed, non-reduced-motion height change is written. Cleared on the face's own `height` `transitionend`, or by the 300 ms fallback timer. |
| `capped` | `capped` class on the scroller | Only with a cap configured (themed modals): the needed height exceeds `innerHeight − 64`. Always cleared on phone. |
| height | `face.style.height` | `max(min, ceil(measure()))` px on desktop, `''` on phone. Written only when it changes. |

**Transitions**

```text
mount ──observe──▶ [unarmed]
   unarmed: each measure writes the height instantly (no is-resizing)        FR-009
   first pointerdown/keydown ─▶ [armed]
   armed: a measure whose height differs ─▶ add is-resizing, write height     FR-002/003
          transitionend(height) | 300 ms ─▶ remove is-resizing
   reduced motion: never add is-resizing; CSS transition is none             FR-008
   phone (≤ 640px): height '' · no capped · no is-resizing                   FR-004
   window resize | phone↔desktop switch ─▶ measure                          FR-006
destroy ─▶ disconnect observer, remove listeners, clear timer
```

**Configuration per modal kind**

| | `CompactModal` | Entry / profile modal (`FluidFace`) |
|---|---|---|
| Face | its `.face` | `ThemedModal.face` |
| Scroller (`is-resizing`, `capped`) | the face | the `.form-pane` |
| Observed | `.content` | `#content`, `#prompt` (when shown) |
| `measure()` | `content.offsetHeight` | `80 + content + (prompt ? 16 + prompt : 0)` |
| Minimum | none | 460px (FR-005) |
| Cap / `capped` | none: CSS `max-height: calc(100vh − 4rem)`, the face scrolls (FR-010) | viewport margin 64px |

## 2. Focus stop and opener (`focus.ts`)

| Concept | Where it comes from | Used by |
|---|---|---|
| Marked stop | `[data-autofocus]` inside the content | `CompactModal`, after `showModal()` (FR-014) |
| Priority stop | first match of `FIRST_STOP_ORDER`: `input:not([readonly])` → `app-action-row button:not([disabled])` → `[role="listitem"] button:not([disabled])` → `button:not([disabled])` | `FluidFace`, on each new `screenKey` (FR-015) |
| Screen key | `` `${phase}|${done}|${request.id}` `` per auth modal, `''` while closed | `focusOnChange`: focuses only when the key changes to a new non-empty value |
| Opener | `document.activeElement` captured just before `showModal()` | `ThemedModal`, `CompactModal`: restored on destroy if still connected (FR-016) |
| Known target | the Menu toggle (`[aria-controls="grm-drawer"]`), the drawer's ✕ or the dialog itself | `NavDrawer`, via `focusElement` |

With no stop found, nothing moves: focus stays on the dialog. A removed opener is skipped, and the browser default applies.

## 3. Radio group (`RovingRadios`)

| Field | Meaning |
|---|---|
| `selected` (input) | index of the checked radio among the host's `[role="radio"]` descendants; −1 = none |
| `radioMove` (output) | the index to select; the owner updates its own selection |

Rule: from = `selected`. With −1, an arrow key targets the focused radio itself; otherwise it applies `rovingIndex(key, from, count)`: next/previous wrapping, Home → 0, End → count − 1. The target is focused after the emit.

| Group | Owner's selection | Index source |
|---|---|---|
| Delete dialog's choice | `choice: 'move' \| 'delete' \| null` | `['move','delete'].indexOf(choice)` |
| Color picker | `value: CollectionColorHex` | `COLLECTION_COLORS` order |
| Format picker | `value: DeckFormatId` | `DECK_FORMATS` order |
| Interplanar Tunnel | `selected: string \| null` | `planes()` order |

## 4. Auth form core (`FlowForm<F>`)

One per flow store instance, so one per modal mount (FR-023). `F` is `EntryFields` (`name, email, pw, code`) or `ProfileFields` (adds `pwNew, pwConfirm`); both extend `CloudFormFields`.

| State | Type | Reset by |
|---|---|---|
| `fields` | `Signal<F>` | `reset()` → blank; `clearForPhase(keys)` blanks the listed keys (password and code; `pwNew`/`pwConfirm` too in the profile modal) |
| `fieldErrors` | `Signal<FieldErrors>` | `reset()`, `clearForPhase`, a successful validation |
| `formError` | `Signal<string>` | same |
| `emailInUse` | `Signal<boolean>` | same, and editing the e-mail |
| `loading` | `Signal<boolean>` | `reset()`, a stale-free settle, the host's `go()` |
| token | `number` | `bump()` on reset and on every `go()`; a result whose token is stale writes nothing |

`edit(key, value)`: a code keeps digits only, max 6; clears that field's error (via the host's `FieldKey` map); editing the e-mail clears `emailInUse`.

## 5. Cloud steps (`CloudSteps<F, P>`)

One per flow store instance, over that store's `FlowForm`.

| State | Type | Notes |
|---|---|---|
| `backTarget` | `Signal<P \| null>` | the phase a reset returns to ("Voltar") and continues from |
| `emailLocked` | `Signal<boolean>` | reset for the linked account: the e-mail is fixed |
| `cooldown` | `Signal<number>` | 30 → 0 s after each code sent; the interval is cleared on 0, on reset and on destroy |
| `resending` | `Signal<boolean>` | a resend in flight |
| `isCloudBusy`, `resendLabel`, `shown`, `pwLabel`, `pwAutocomplete`, `pwHelper` | computed | from the host's `phase` and `entry-flow.util`, through `isCloudPhase` (the profile modal: `isSharedCloudPhase`; the entry modal: every phase) |

**Host inputs**: `phase`, `isCloudPhase`, `plateEmail`, `lockedEmail` (computed per host: entry `recover-form` → subject's cloud e-mail; profile `reauth` → linked e-mail; else `null`), `go(phase)` (bumps and navigates) and `toPhase(phase)` (navigates without bumping, after a request lands).

| Action | Behavior (unchanged from both stores) |
|---|---|
| `forgot()` | `backTarget = phase`; if `lockedEmail()` is set, write it to the e-mail and lock; `go('reset-email')` |
| `recoverAccess()` | `backTarget = phase`; `go('reset-email')` |
| `otherEmail()` | `go('reset-email')` |
| `back()` | `go(backTarget ?? 'in')`, clearing `backTarget` and the lock |
| `requestCode()` | `cloudAuth.requestResetCode(email)`; if fresh, `toPhase('reset-code')` and start the cooldown |
| `resend()` | blocked by cooldown/resending/loading; clears `formError`; on success clears code and field errors and restarts the cooldown; failures go through `form.fail` |
| `reset()` | stop the cooldown, clear `backTarget`, `emailLocked` and `resending`; `cloudAuth.discardPending()` |
