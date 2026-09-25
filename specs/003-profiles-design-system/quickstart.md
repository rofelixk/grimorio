# Quickstart: validating spec 003

This guide shows how to prove that the feature works end-to-end. Interfaces are in
[contracts/](contracts/), entities and rules in [data-model.md](data-model.md), and layout and states
in [ui.md](ui.md).

## Prerequisites

1. The migration in [contracts/supabase.md §1](contracts/supabase.md) is applied, and the clean-start
   wipe (§2) has been run with confirmation.
2. The auth settings in §3 are configured: custom SMTP, OTP length 6, e-mail interval ≤ 30 s, and the
   PT-BR reset template.
3. Two e-mail inboxes you control, called **A** and **B** below.
4. The dev server is running (`npm start`, started by you). For desktop PWA checks, use
   `npm run serve:pwa`.
5. Browser data for `localhost` is cleared once, so the legacy `grimorio` database and keys are gone.
   Startup cleanup also handles this (R2).

## Automated checks

```bash
npm run lint
npm test          # includes the new pure-util specs below
npm run build     # must pass the anyComponentStyle 8 kB budget
```

The unit specs cover:
- `identity.util` — all 25 tribe names and the role fallback chain;
- `entry-flow.util` — phase derivation, validation messages and the prompt per context;
- `cloud-error.util` — every mapped code, the offline case and the generic fallback;
- `ProfileStore` — case-insensitive uniqueness and hash verification;
- entity services' `load()` isolation;
- `profileGuard` — the three outcomes;
- `SyncScheduler` — debounce and max-wait timing, with fake timers.

## Manual scenarios

Mobile checks use a 393×852 viewport. Each scenario maps to a spec story.

| # | Steps | Expected |
|---|---|---|
| 1 | Offline (DevTools), no profiles. Open `/collection`. | Modal in *device* context on "Criar perfil". Create `rafa` with U then R. The modal retints live, and Izzet / "Azul · Vermelho" show. "Perfil criado" → Concluir lands on `/collection`. The app is tinted blue-primary. (US1-1..3, SC-001) |
| 2 | Names `jo`, `a b`, `RAFA`, password `1234`. | "Use de 3 a 20 caracteres.", "Use só letras, números, _ . ou -.", "Esse nome já está em uso neste aparelho.", "Use pelo menos 8 caracteres." No profile is created. (US1-4) |
| 3 | Reload. | `rafa` is still active with no password prompt. (US1-5) |
| 4 | Create `bia` (G). In DevTools → Application, write a card into each profile database. Switch via the menu, "Trocar perfil". | The list shows `rafa` first with "Em uso". Hovering `bia` retints the modal, and leaving the list restores it. Unlocking `bia` shows "Perfil trocado … Os dados de rafa ficaram ocultos." Only bia's card is visible. (US2, SC-002, SC-003) |
| 5 | Wrong password on unlock. | "Senha incorreta." No data changes. (US2-4) |
| 6 | "Sair de bia". | "Saindo…", then the list with the notice. Default colors R→U→G, and the wheel is neutral with the "Grimorio" wordmark. A gated page redirects to Home. (US2-6, FR-008) |
| 7 | No profile: open `/`, `/about`. Open `/decks` directly by URL, then close the modal with ✕. | Home and About open without a prompt. `/decks` shows the modal. ✕ lands on Home. From Home, clicking a gated link and closing with ✕ stays on Home. (US3, FR-001) |
| 8 | As `rafa`: menu → "Conta na nuvem" → "Criar conta" with inbox A. | "Conta criada", then the sync line "Sincronizando…" → "Sincronizado agora". The Supabase user has `grm_label: rafa` and `grm_colors: [U,R]`. (US4-1) |
| 9 | Sign up again with A from another profile. | "Esse e-mail já está em uso." + "É seu? Recupere o acesso". (US4-4) |
| 10 | As `bia`, "Conta na nuvem" → sign in with A. | "Essa conta já está vinculada ao perfil rafa neste aparelho." (US4-6, FR-033) |
| 11 | Second browser profile (a "new device"). Top bar → "Entrar com conta na nuvem" with A. | "Configurar perfil" with the A plate, name pre-filled `rafa` and editable, then a new local password. "Perfil pronto": "Baixando sua coleção…" → "Coleção baixada". The data and the Izzet tint arrive. (US4-5, SC-004) |
| 12 | Device 2: add a card while online and wait ≤ 60 s. Device 1: "Sincronizar agora". | The card appears on device 1. (US4-8, US4-10) |
| 13 | Create account B with a profile tinted W; on another profile tinted G, sign in to B. | "Conta vinculada" + "As cores da conta (Mono-branco) passaram a valer para este perfil." The wheel ripples on W. (US4-2) |
| 14 | Wrong cloud password; unknown e-mail. | Both show "E-mail ou senha incorretos." (US4-3, FR-020) |
| 15 | Offline, then any cloud submit. | The offline message. Local create/unlock still work. (US4-11, FR-021) |
| 16 | "Esqueci minha senha" in `in` → e-mail A; repeat with an unknown e-mail. | Identical "Digite o código" screens. The code arrives in A. Resend shows a 30 s countdown. `12345` → "Digite os 6 dígitos do código.", and a wrong code gives the expired/incorrect message. The right code + a new password signs in and links. "Voltar" returns to `in`. (US5, SC-005) |
| 17 | Unlock a linked profile → "Esqueci minha senha". | "Recuperar perfil" → the account password → a new local password → "Perfil desbloqueado … dados intactos". An unlinked profile gets the warning → "Entendi, redefinir" → a new password. Cancelar returns to unlock. (US6) |
| 18 | In the Supabase dashboard, sign out all of rafa's sessions (or change the password on device 2). On device 1: "Sincronizar agora". | The modal opens on "Entre de novo". After the password, "Sincronização retomada" shows with the sync line. (US4-9, FR-032) |
| 19 | "Conta na nuvem" on a linked profile → Desvincular. | "Conta desvinculada". Local data is intact, and the remote rows and account still exist. (US4-7, FR-019) |
| 20 | OS "reduce motion" on. | No ring rotation, halo flicker, sparks, ripples or name blur-in. Everything stays legible. (US8-3, SC-009) |
| 21 | Keyboard only through each phase, plus a screen reader spot check. | Focus is trapped in the modal and returns on close. Errors are announced, and so are the status lines. Swatches announce their pressed state. (FR-038) |
| 22 | Search the built CSS (`dist/grimorio/browser/styles-*.css`) for the legacy tokens `--nav-bar-height` and `--shadow-glow-primary-strong`, and for bare `button{`/`input[type=text]` rules. | None found. (SC-010) |
| 23 | Desktop modal: trigger errors and switch modes. | Height animates, and the face is never below 460 px. (edge case "never jumps") |

## Legacy screens

Collection, decks, import and similar screens are **not** used to verify this spec (Assumptions). If
they look or behave broken on the new base, that is expected.
