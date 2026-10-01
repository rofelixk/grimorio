# UI Design: Storage & Sync Foundation

This feature has little UI: one new locked dialog and two new toasts, and it changes no existing screen.

## 1. Surfaces

| Surface | New / modified | Component |
|---|---|---|
| Reload prompt | New | `ReloadPrompt` (`shared/layout/reload-prompt/`), inside `CompactModal` |
| Save-failure toast | New message, existing surface | `ToastService` + `ToastOutlet` |
| "Deleted in another window" toast | New message, existing surface | `ToastService` + `ToastOutlet` |
| App shell | Modified (one `@if`) | `app.html` mounts `<app-reload-prompt />` |

## 2. Layout

**Reload prompt**: the delete dialogs' recipe (`deck-delete-dialog`), with one action:

```text
┌ compact modal ring (480px) ───────────────┐
│                                     [✕]   │  ✕ shown, aria-disabled (locked)
│  O Grimorio foi atualizado          (h2)  │
│  Uma versão mais nova foi aberta em       │
│  outra janela. Recarregue esta para       │  subtitle
│  continuar.                               │
│                          [ Recarregar ]   │  .btn--primary, data-autofocus
└───────────────────────────────────────────┘
```

- **Wide (≥ 960px) and tablet**: a centered ring, the same as the collection and deck dialogs.
- **Phone (< 640px)**: `CompactModal`'s full-bleed face with the wordmark header and ✕. The button is full width, as `CompactModal` stacks actions on phone.

**Toasts**: unchanged layout: the label over the text, with ✕.

## 3. States

| State | What shows | Requirement |
|---|---|---|
| A save fails | The toast "Dados — Não foi possível salvar a alteração neste aparelho." The screen keeps the change. | FR-002, US1-1/2 |
| Several saves fail | One toast, each failure replacing the last | US1-4 |
| A save succeeds | Nothing | US1-5 |
| A save fails because another copy took over | No save toast (the takeover's own message shows) | research R2 |
| Another copy opened a newer version | The reload prompt is mounted and stays until the page reloads. Esc, the backdrop and ✕ do nothing. | FR-009, US2-5 |
| Another copy deleted the open profile | The toast "Perfil — Este perfil foi excluído em outra janela.", then the no-profile state. On a gated route the entry modal opens, and the toast shows inside it (the top-host rule). | FR-010 |
| Another copy saved data | The affected lists or pages update in place, with no indicator | FR-011–FR-014 |
| Another copy is syncing | The sync area shows the existing "syncing" state until this copy's turn ends | FR-014a |

## 4. Interaction flow

- **The reload prompt has no entry point**: it appears on the takeover event. "Recarregar" → `location.reload()`. There is no dismiss path, by design: the copy must not keep using a database whose schema it doesn't know.
- **If a modal is already open** when the prompt mounts (entry, profile, a collection dialog), the prompt's `showModal()` stacks it on top, so it is the only interactive surface. Nothing closes the modal beneath, and the reload discards it.
- **The deleted-profile toast** is shown before `signOut()`. It is then re-hosted by the entry modal's outlet when that modal opens, per the existing one-toast, top-host rule.

## 5. Design-system reuse

- **`CompactModal`** with `locked` held true; its focus of `[data-autofocus]` on open.
- **The heading/subtitle/actions classes** follow `deck-delete-dialog.scss`'s recipe (title, subtitle, `.actions`), with `.btn .btn--primary` from `_controls`.
- **Toasts**: `ToastService` and `ToastOutlet` unchanged.

**New**: only the component and its small stylesheet. It uses no new token, pattern or DESIGN.md entry, because DESIGN.md "Compact modal" already covers the ring, the phone face and the stacked actions (spec assumption, "The reload prompt").

## 6. Accessibility

- **Dialog**: a native modal `<dialog>`, `aria-labelledby` the `h2`. Focus moves to "Recarregar" on open (`data-autofocus`), and the page beneath is inert.
- **Keyboard**: Tab cycles between ✕ (`aria-disabled`, inert) and "Recarregar". Enter or Space reloads, and Esc is swallowed (`locked`).
- **Toasts**: existing behavior (the outlet's live region and ✕ "Fechar aviso").
- **Motion**: no new motion. `CompactModal`'s height transition already honors reduced motion.

## 7. Copy (PT-BR)

| Key | Text |
|---|---|
| `DATA.saveFailed.label` | Dados |
| `DATA.saveFailed.text` | Não foi possível salvar a alteração neste aparelho. |
| `DATA.deletedElsewhere.label` | Perfil |
| `DATA.deletedElsewhere.text` | Este perfil foi excluído em outra janela. |
| `DATA.reload.title` | O Grimorio foi atualizado |
| `DATA.reload.body` | Uma versão mais nova foi aberta em outra janela. Recarregue esta para continuar. |
| `DATA.reload.action` | Recarregar |
