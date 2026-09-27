# Quickstart: Profile Modal validation

**Prerequisites**
- The migration `005_delete_own_account` is applied ([contracts/supabase.md](contracts/supabase.md)),
  and the security advisors have been checked.
- The dev server is running (`npm start`, started by you). Browser checks go through the `run` skill.
- A clean device: clear site data, or delete the `grimorio-*` IndexedDB databases and the
  `grm-cloud:*` keys. Profiles created before this feature lack `colorsUpdatedAt` and
  `nameUpdatedAt` (research R6).
- For the cloud scenarios: two throwaway accounts, and a second browser profile to act as "device B".

**Automated**: `npm test` and `npm run lint` both pass. Unit coverage is expected for:
- `reconcileIdentity`, `hasUnsyncedChanges`, `validateName` and `profile-flow.util`
- `ProfileStore.rename`/`setColors`/`remove`
- `ProfileLifecycleService.deleteProfile`, which checks isolation: the other profile's database is
  untouched
- `ToastService` (replace, 5 s, host stack)
- `ProfileFlowStore` transitions (origin, Salvar enablement, gone → hub)
- the `CloudAuthService` new methods, with a mocked client

## Scenarios

| # | Steps | Expected | Covers |
|---|---|---|---|
| V1 | Active local profile. Click the profile control (wide), then open it from Menu → profile (narrow) | The hub opens with the name, the wheel and the plate "Sem conta na nuvem". Narrow: full-screen with the chip; closing returns focus to Menu | US1-1, US1-5 |
| V2 | Hub → each sub-screen → Voltar. Then "Trocar de perfil" | The sub-screens open and Voltar returns. Trocar closes the modal and opens the entry list, where the active profile comes first with "Em uso". Switching and "Sair de {P}" work | US1-2, FR-005 |
| V3 | No profile active → "Entrar". Start a sync from the shell → try the profile control | The entry modal opens. During the sync nothing opens | US1-3, US1-4 |
| V4 | Tap wheel colors on the hub, then on "Perfil neste aparelho". Reload | The app retints on each tap, and the colors survive a reload. Salvar stays disabled. One pick can't be removed, and 3 picks lock the rest | US2-1–4 |
| V5 | Rename to a valid name → Salvar. Rename to "ab", "a b!" and another profile's name in other case. Change your own name's case | The toast "Alterações salvas." shows above the modal, and the name updates in the control, the entry list and unlock. Each invalid name shows its error. The case-only change saves | US2-5–6, FR-009 |
| V6 | Edit the name → Voltar. Edit it → ✕ | Unchanged. The fields are cleared on reopen | Edge Cases |
| V7 | `pw`: wrong current, mismatched new, short new, then valid. Sign out and unlock with old, then new | The errors show on the right fields. "Senha alterada". Old rejected, new accepted. Works offline (DevTools offline) | US4-1–2, FR-010, FR-011 |
| V8 | Local profile → cloud → "Vincular conta na nuvem" → sign in. Repeat with "Criar conta", and with "Esqueci minha senha" → code | Each ends on its done screen. Concluir returns to "Conta na nuvem" (or to the hub when started from the plate). No sync starts | US3-1, US3-6, FR-013 |
| V9 | Linked → "Desvincular conta" (offline) | The confirmation copy, "Conta desvinculada", data kept, the plate becomes local | US3-2, FR-014 |
| V10 | Force expiry (delete `grm-cloud:{id}` tokens' refresh, or revoke via V13 on the other device) → shell "Sessão expirada" | The profile modal opens at `reauth`. "Conta na nuvem" shows only Entrar de novo + Desvincular. Re-sign-in gives "Sincronização retomada" | US3-3–5, FR-007, FR-015 |
| V11 | `cloudpw`: wrong current, offline, valid | The generic error, then the offline message, then "Senha da conta alterada". The local password is unchanged | US4-3–7, FR-016a |
| V12 | Device B, linked to the same account, runs a sync after V11 | B shows "Sessão expirada" and needs the new password | US4-4, R12 |
| V13 | Linked on A and B. Change colors on A, sync A, sync B. Then change on both, and sync B then A | B retints silently to A's colors. In the second round the latest change wins on both. The names stay per device, and the account label is the latest rename | US2-8, FR-012a |
| V14 | Delete a profile with data while another profile exists. Inspect IndexedDB | `grimorio-profile-{id}` is gone, the other profile's database is untouched, the default identity shows, and the entry list opens | US5-1–2, US5-5, SC-004 |
| V15 | Delete the last profile | The modal closes, the app is on Home with "Nenhum perfil neste aparelho", and "Criar perfil" opens the create step. A gated route opens the entry modal | US5-3, FR-018b |
| V16 | Linked with unsynced edits → Excluir perfil. Try "Sincronizar agora" offline, then online | The warning block. Offline: "Sem conexão" + Tentar de novo. Online: "Sincronizado agora — …". Delete is locked while syncing. Deleting without syncing also works | US5-6, FR-018a |
| V17 | Linked on A and B. On A: "Excluir conta na nuvem" with a wrong password, then offline, then correct. Query `card_entries`/`storage_locations` for that user id, and try to sign in | Wrong or offline: nothing deleted. Correct: "Conta excluída", A stays local-only with its data, 0 cloud rows remain, sign-in fails | US5-7–9, FR-019a, SC-005a |
| V18 | On B after V17: sync, or open "Senha da conta" | The profile becomes local-only with its data, the modal returns to the hub, and the gone toast shows. **Record the actual error code** (`user_not_found` vs. a session error). If it's a session error, B shows "Sessão expirada", and a failed "Entrar de novo" shows the hint | FR-019b, FR-019c, R12 |
| V19 | Show a toast with no modal open (for example the V18 toast after closing), and during an open modal. Then trigger two in a row | Visible above the page and the modal, and its ✕ works inside the modal. Gone after 5 s. The second replaces the first. A screen reader announces it | FR-022 |
| V20 | Entry modal: unlock a linked profile → Esqueci minha senha. Also "Esqueci a senha da conta" | "Redefinir senha do perfil" with the e-mail plate. Cancelar → unlock. Continuar → new local password. The reset path works | FR-024 |
| V21 | "Perfil criado" → "Vincular conta na nuvem" | The entry modal closes and the profile modal opens at "Criar conta na nuvem" | R3 |
| V22 | Wheel with reduced motion on/off (DevTools rendering emulation), in both modals | Off: breathing, motes, spin, bursts. On: none of them. The v2 anatomy is in both modals | FR-023 |
| V23 | Keyboard only through the hub → local → pw → Cancelar, and cloud → unlink | Focus lands on the first field or row on each screen, Esc closes, and the targets are ≥ 44px | FR-020 |
