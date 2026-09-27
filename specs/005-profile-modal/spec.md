# Feature Specification: Profile Modal

**Feature Branch**: `feature/005-profile-modal`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "When the user clicks on their name on the top bar we are going to open a profile modal instead of the auth modal's change-account mode. On this new profile modal the user will be able to change their username, password, color identity, cloud link status (link/unlink), delete account and change current user (that'll open our current auth modal solution). We must understand which functionalities belong on the auth modal and which belong on this profile modal."

> This is the follow-up account-management spec that spec 003 deferred to (its FR-010, and the
> renaming / password-change / deletion items in its Assumptions). It changes spec 004's FR-004
> (what the profile control opens) and closes the "Desvincular conta" gap spec 004's FR-010 left open.
> Visuals, layout and copy come from `design_handoff_profile_modal/` (README.md →
> ProfileModalApp.dc.html → IdentityWheelV2.js → EntryModal.jsx); this spec fixes behavior.

## Clarifications

### Session 2026-09-26

- Q: What does "delete account" delete? → A: Two separate actions. "Excluir perfil" deletes the
  local profile and all its data on this device. For a linked profile, a separate "Excluir conta na
  nuvem" deletes the cloud account and all cloud data belonging to it. Both are irreversible and
  their confirmations MUST say so.
- Q: Can a linked profile change its cloud account password from the profile modal? → A: Yes, as a
  separate action from the local password change. It needs the current cloud password and a
  connection.
- Q: When a linked profile's colors change on one device, do other devices linked to the same
  account adopt them? → A: Yes. Colors follow the account: at a sync, the most recent color change
  from any device wins on every linked device. The profile name stays per device; the account label
  only records the latest one.
- Q: When deleting a linked profile with local changes not yet synced, what happens to them? → A:
  The confirmation warns that unsynced changes will be lost and offers "Sincronizar agora" before
  deleting; deleting anyway stays allowed.
- Q: When the cloud password changes on one device, are other linked devices signed out? → A: Yes.
  Every other session for that account ends; those devices show "Sessão expirada" and need "Entrar
  de novo" with the new password. This device stays signed in.
- Q: Where does the profile modal's visual design come from, given DESIGN.md doesn't cover it? →
  A: A design handoff will be provided (as for specs 003/004). Planning waits for it, or leaves the
  UI marked as pending the handoff.

### Session 2026-09-27 (design handoff decisions)

- Structure: a **hub** plus two sub-screens organized by where the data lives, "Perfil neste
  aparelho" and "Conta na nuvem". Each destructive action sits inside the sub-screen that owns the
  data; there is no separate danger screen.
- The name is edited on "Perfil neste aparelho", with a "Salvar" that is only enabled when the name
  changed. Saving keeps the person on that screen and confirms with a toast. (The handoff also
  routed colors through this "Salvar"; superseded by the next session.)
- Short confirmations and notices use a **toast** (new design-system component), not inline plates.
- Name/color changes of a linked profile reach the account **quietly at the next sync**; they're not
  written right away, and no warning is shown. Incoming color changes retint silently.
- The hub carries an expanded sync plate, including "Sincronizar agora" for linked profiles.
- Action steps return ("Cancelar" / "Concluir") to the sub-screen they were opened from, not the hub.
- Changing the profile password asks for the new password twice.
- "Excluir conta na nuvem" is not offered while the session is expired.
- Deleting the **last** profile on the device shows an empty-device state in the app, not the entry
  modal.
- A refined identity wheel replaces the current one everywhere (profile modal and entry modal).

### Session 2026-09-27 (after the handoff)

- Q: Where can the active profile's colors be changed, and do they need "Salvar"? → A: The identity
  wheel is always usable for the active profile: on every profile-modal screen that shows it, tapping
  a color changes the profile's colors at once, with no save and no preview step. Color changes no
  longer count toward enabling "Salvar" on "Perfil neste aparelho", which covers the name only. The
  entry modal's wheel is unchanged.
- The entry modal's forgotten-password step for a linked profile is redesigned ("Redefinir senha do
  perfil").

## Modal responsibilities *(context)*

Two modals, split by one question: **"who is using this device?"** versus **"manage the profile
that's active now."**

| Entry modal (existing) — *who is at the device* | Profile modal (new) — *the active profile* |
|---|---|
| Profile list: pick a profile, "Em uso" marker, "Sair de {P}" | **Every screen**: the identity wheel changes colors on tap. **Hub**: profile name, identity wheel, sync plate, entry to the two sub-screens, "Trocar de perfil" |
| Unlock a profile with its password | **Perfil neste aparelho**: name ("Salvar"), profile password, "Excluir perfil" |
| Create a new profile (with the identity picker) | **Conta na nuvem** (linked): account password, unlink, "Excluir conta na nuvem" |
| Sign in with a cloud account on this device (new-device setup) | **Conta na nuvem** (expired): "Entrar de novo", unlink |
| Forgotten local password: local reset, linked-profile reset ("Redefinir senha do perfil") | **Conta na nuvem** (local only): link (sign in / create account) |
| Cloud password reset, reached from its own sign-in | Cloud password reset, reached from link sign-in and "Entrar de novo" |
| The profile gate (gated route with no active profile) | |

Consequences:
- The entry modal's *link* context (cloud flows for the active profile) and its *reauth* and
  *unlink* phases move to the profile modal. The entry modal keeps the *device* and *gate* contexts.
- Signing out stays in the entry modal's profile list ("Sair de {P}"), reached through "Trocar de
  perfil". Signing out is about who holds the device, not about managing the profile.
- The cloud password reset flow is shared: both modals reach it from their own cloud sign-in forms.
- Only one modal is ever open. "Trocar de perfil" closes the profile modal, then opens the entry
  modal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the profile hub and switch profile (Priority: P1)

A person with an active profile taps their name in the shell's profile control. A profile modal
opens on its hub: the profile's name, identity wheel with tribe and color names, a sync plate
showing the cloud link state, and two entries, "Perfil neste aparelho" and "Conta na nuvem". At the
bottom, "Não é você? Trocar de perfil" leads to the profile list, where they can switch or sign out.

**Why this priority**: This replaces the control's current destination. Without it, nothing else
in this spec is reachable, and switching profile must keep working.

**Independent Test**: With an active profile, tap the profile control at both widths; confirm the
hub opens with the right identity and link state, that each sub-screen opens and "Voltar" returns
to the hub, and that "Trocar de perfil" closes it and opens the entry modal's profile list, where
switching and signing out still work.

**Acceptance Scenarios**:

1. **Given** an active profile, **When** the person activates the profile control, **Then** the
   profile modal opens on the hub, titled with the profile name, showing the identity wheel (tribe
   name and color names in pick order, usable as a picker per US2), the sync plate, and the entries "Perfil
   neste aparelho" (meta "Cores, nome e senha") and "Conta na nuvem" (meta: the account e-mail when
   linked, "Sessão expirada · {e-mail}" when expired, "Vincular para sincronizar entre aparelhos"
   when local only).
2. **Given** the hub, **When** the person activates "Trocar de perfil", **Then** the profile modal
   closes and the entry modal opens on the profile list with the active profile first and marked
   "Em uso".
3. **Given** no active profile, **When** the person activates the profile control ("Entrar"),
   **Then** the entry modal opens on the profile list (or the *device* context if the device has no
   profiles), exactly as before; the profile modal never opens without an active profile.
4. **Given** a sync is running, **When** the person tries to activate the profile control, **Then**
   nothing opens (spec 004 FR-005a still applies).
5. **Given** a narrow screen, **When** the person opens the drawer and taps the profile control,
   **Then** the drawer closes, the profile modal opens full-screen with the profile's identity chip
   in its header, and on close focus returns to "Menu".
6. **Given** a linked profile, **When** the hub is shown, **Then** the sync plate shows the sync
   status ("Sincronizado há …", "Sincronizando…" with no button) with the account e-mail and a
   "Sincronizar agora" button that starts a sync. **Given** a local-only profile, it shows "Sem conta
   na nuvem" with "Vincular conta na nuvem". **Given** an expired session, it shows "Sessão
   expirada" with a primary "Entrar de novo".

---

### User Story 2 - Change colors anywhere, rename on "Perfil neste aparelho" (Priority: P1)

A person wants their app to wear different colors. Wherever the profile modal shows their identity
wheel, they tap colors on it (1–3, in pick order) and the profile's colors change at once: the whole
app retints, with nothing to save. To fix their profile name, they edit it on "Perfil neste
aparelho" and press "Salvar"; the new name shows everywhere right away and a toast confirms
"Alterações salvas.".

**Why this priority**: Color identity is the app's most visible personal trait and, until now,
could only be chosen once, at profile creation. Names chosen in a hurry should be fixable without
recreating the profile and losing data.

**Independent Test**: From the hub, tap colors on the wheel and confirm the whole app retints at
once and the colors survive closing the modal and reloading. On "Perfil neste aparelho", confirm
tapping colors leaves "Salvar" disabled; change the name, save, and confirm it shows everywhere;
change it again, press "Voltar", and confirm the name didn't change.

**Acceptance Scenarios**:

1. **Given** any profile-modal screen showing the identity wheel (the desktop identity pane, or the
   wheel in the narrow layout), **When** it's shown, **Then** the wheel is a picker holding the
   profile's current colors in pick order.
2. **Given** the wheel, **When** the person taps a color, **Then** the profile's colors change
   immediately and are kept: the modal and the whole app (shell, profile control) retint and show the
   new tribe name at once. Closing the modal, "Voltar" or "Cancelar" never reverts them.
3. **Given** one color picked, **When** the person tries to remove it, **Then** it cannot be
   removed (at least one color always stays selected); with 3 picked, the other colors are locked.
4. **Given** "Perfil neste aparelho", **When** it opens, **Then** the name field holds the current
   name and "Salvar" is disabled; tapping colors doesn't enable it, only a changed name does.
5. **Given** a changed name, **When** the person saves, **Then** the name changes everywhere at once
   (profile control, profile list, unlock screen), the person stays on this screen, and a toast
   shows "Alterações salvas.". **Given** an unsaved name, "Voltar" or closing discards it.
6. **Given** a name that breaks the name rules (3–16 characters; letters, digits, `_`, `.`, `-`) or
   is used by another profile on this device (ignoring letter case), **When** the person saves,
   **Then** the matching field error shows and nothing changes.
7. **Given** a linked profile, **When** "Perfil neste aparelho" is shown, **Then** its subtitle says
   colors and name also go to the cloud account at the next sync; **Given** a local profile, it says
   everything here works without internet.
8. **Given** the same account is linked on two devices, **When** colors change on device A, A syncs
   and then device B syncs, **Then** device B's profile takes the new colors and retints silently;
   if both changed colors, the most recent change wins on both (FR-012a).

---

### User Story 3 - Link, re-sign-in or unlink on "Conta na nuvem" (Priority: P2)

A person whose profile is local-only links it to a cloud account from "Conta na nuvem", by signing
in or creating an account. A person whose profile is linked can unlink it, keeping all local data.
A person whose cloud session expired can sign in again from the same place, or from the hub.

**Why this priority**: Linking and unlinking already exist; this story moves them to their natural
home and restores the unlink entry point that spec 004 left without one.

**Independent Test**: From "Conta na nuvem", link a local profile (sign-in and create-account
paths), then unlink it, confirming data stays on the device and the link state updates in the
modal and the shell's sync status.

**Acceptance Scenarios**:

1. **Given** a local-only profile, **When** the person chooses "Vincular conta na nuvem" (hub or
   "Conta na nuvem"), **Then** the cloud sign-in step shows, with "Esqueci minha senha" leading to
   the cloud password reset and "Ainda não tem conta na nuvem? Criar conta" leading to account
   creation, behaving as spec 003's *link* context did (FR-014, FR-017, FR-020, FR-026, FR-033 of
   spec 003).
2. **Given** a linked profile, **When** the person chooses "Desvincular conta", **Then** a
   confirmation says the profile keeps all its data on this device and the account and its cloud
   data are not deleted ("Desvincular não apaga nada — nem aqui, nem na nuvem."); confirming unlinks
   it, with no connection needed.
3. **Given** a linked profile whose cloud session has expired, **When** "Conta na nuvem" opens,
   **Then** it says the session expired and the profile keeps working on this device, and offers a
   primary "Entrar de novo" and "Desvincular conta" (and nothing else).
4. **Given** the re-sign-in step, **When** the person enters the account password, **Then** the
   session is renewed ("Sincronização retomada"); "Esqueci minha senha" leads to the cloud password
   reset, which also renews the session on success.
5. **Given** the shell's sync status says "Sem conta na nuvem" or "Sessão expirada", **When** the
   person activates it, **Then** the profile modal opens directly at the sign-in or re-sign-in step.
6. **Given** a link, unlink or re-sign-in succeeds, **When** the person presses "Concluir" on the
   success screen, **Then** the modal returns to the screen the step was opened from, showing the
   new link state (no sync starts on its own, per spec 004 FR-006).

---

### User Story 4 - Change the profile or cloud account password (Priority: P2)

A person wants a new local profile password. From "Perfil neste aparelho" they enter the current
password and the new one twice; from then on, only the new password unlocks the profile. A person
with a linked profile can also change the cloud account's password from "Conta na nuvem", as a
separate action.

**Why this priority**: Standard account hygiene; spec 003 only allowed a password change through
the forgotten-password flows.

**Independent Test**: Change the local password, sign out, and confirm the old password is rejected
and the new one unlocks the profile. With a linked profile, change the cloud password and confirm
signing in to the account (e.g. new-device sign-in) needs the new one, while the local password is
unchanged.

**Acceptance Scenarios**:

1. **Given** the "Senha do perfil" step, **When** the person enters the correct current password
   and a valid new one (at least 8 characters) twice, **Then** the profile password changes and the
   success screen "Senha alterada" says the new password now unlocks the profile on this device
   (and, for a linked profile, that the cloud account password is unchanged).
2. **Given** a wrong current password, **When** the person submits, **Then** "Senha incorreta."
   shows on the current-password field and nothing changes; **given** the two new passwords differ,
   "As senhas não são iguais." shows on the confirmation field.
3. **Given** a linked profile, **When** the local password changes, **Then** the cloud account's
   password is unaffected, and vice versa.
4. **Given** a linked profile with a valid session, online, **When** the person enters the correct
   current cloud password and a valid new one, **Then** the account password changes, the profile
   stays linked and signed in on this device, the success screen "Senha da conta alterada" says
   other devices must sign in again, and every other device linked to the account shows "Sessão
   expirada" at its next cloud action.
5. **Given** a wrong current cloud password, **When** the person submits, **Then** the generic
   wrong-credentials message shows and nothing changes.
6. **Given** a local-only profile or an expired session, **When** "Conta na nuvem" is shown,
   **Then** no account-password action is offered.
7. **Given** no connection, **When** the person submits a cloud password change, **Then** the
   offline message shows and nothing changes.

---

### User Story 5 - Delete the profile or the cloud account (Priority: P3)

A person who no longer uses a profile on this device deletes it ("Excluir perfil", on "Perfil neste
aparelho"), after confirming with its password. The profile and all its data disappear from the
device and no profile is active afterwards. A person who wants to leave the cloud entirely deletes
the linked cloud account ("Excluir conta na nuvem", on "Conta na nuvem"): the account and every
piece of cloud data belonging to it are gone. Both actions are irreversible, and the person is told
so before confirming.

**Why this priority**: Needed to keep shared devices tidy and to let a person remove their data
from the cloud, but used rarely and never on the path to everyday use.

**Independent Test**: Delete a profile with data; confirm it is gone from the profile list, none of
its data is reachable, the app is back on the default identity, and other profiles are untouched.
Delete the last profile and confirm the empty-device state. Separately, delete a linked profile's
cloud account; confirm the account can no longer be signed in to, its cloud data is gone, and the
local profile is kept as local-only with its data.

**Acceptance Scenarios**:

1. **Given** "Perfil neste aparelho", **When** the person chooses "Excluir perfil", **Then** a
   confirmation step names the profile, lists what leaves this device (cards, storage locations,
   decks, colors, the profile itself), says plainly that it can't be undone, and asks for the
   profile password. For a linked profile it also says the cloud account and its cloud data are not
   deleted by this action.
2. **Given** the correct password and other profiles remain on the device, **When** the person
   confirms, **Then** the deletion happens, no profile is active, the app returns to the default
   identity, and the entry modal opens on the profile list.
3. **Given** the correct password and it's the last profile on the device, **When** the person
   confirms, **Then** the deletion happens, the modal closes, and the app shows the empty-device
   state ("Nenhum perfil neste aparelho", with "Criar perfil" opening the entry modal's create step).
4. **Given** a wrong password, **When** the person confirms, **Then** "Senha incorreta." shows and
   nothing is deleted.
5. **Given** other profiles on the device, **When** one profile is deleted, **Then** the others and
   all their data are unaffected.
6. **Given** a linked profile with local changes not yet synced, **When** the "Excluir perfil"
   confirmation shows, **Then** it warns that those changes will be lost if deleted now and offers
   "Sincronizar agora". While it syncs, deleting is locked. On success it says nothing is lost in
   the cloud; on failure it shows the reason ("Sem conexão", "Sessão expirada", "Falha ao
   sincronizar") with "Tentar de novo". Deleting without syncing stays allowed.
7. **Given** a linked profile with a valid session, online, **When** the person chooses "Excluir
   conta na nuvem", **Then** a confirmation step names the account e-mail, lists what leaves the
   cloud for good, says that other devices linked to it will stop syncing, that it can't be undone,
   and that this device's profile and data stay; it asks for the cloud account password.
8. **Given** the correct cloud password, **When** the person confirms, **Then** the account and all
   its cloud data are deleted, the profile becomes local-only with all its local data, and the
   success screen "Conta excluída" says so.
9. **Given** a wrong cloud password or no connection, **When** the person tries to delete the cloud
   account, **Then** nothing is deleted and the matching message shows (wrong-credentials or
   offline). **Given** an expired session, the action isn't offered at all.

---

### Edge Cases

- "Salvar" on "Perfil neste aparelho" stays disabled while the trimmed name equals the saved name,
  so a no-change save can't happen; color taps never enable it.
- Each color tap is saved on its own; a quick series of taps ends on the last state, and the
  account receives only the latest colors at the next sync.
- Tapping colors while an action step is busy (a request running) is allowed: colors are local and
  never affect the step.
- Name uniqueness ignores letter case: a rename is allowed only if no *other* profile on the device
  holds the same name in any case. Changing only the case of one's own name is allowed.
- A linked profile's colors and name are saved locally at once; the account receives them at the
  next sync (FR-012). The change is never blocked, warned about, or rolled back for lack of a
  connection or an expired session.
- Unlinking, renaming, recoloring, changing the local password and deleting a local profile never
  need a connection. Linking, signing in again, changing the account password and deleting the
  account do; offline they fail with the offline message.
- Closing the profile modal mid-edit (Esc, backdrop, ✕) discards an unsaved name and clears every
  field and error; colors already tapped stay (they were saved on tap).
- Deleting the last profile on the device shows the empty-device state; no modal opens by itself.
- Deleting a linked profile leaves its cloud account and cloud data untouched; the account can
  still be set up on this or another device later.
- A cloud account deleted from one device leaves other devices' profiles linked to a missing
  account. On those devices, the first cloud action (sync, opening the account-password step,
  unlinking, deleting the account) finds the account gone: the profile keeps all its local data,
  becomes local-only, the modal returns to the hub, and a toast says the account no longer exists.
  Nothing local is ever deleted because of a remote account deletion.
- If the connection drops mid-way through a cloud account deletion, the account is either fully
  deleted or not at all; the person sees the outcome, and a partial deletion is never reported as
  success.
- A cloud password change doesn't sign the profile out of its cloud session on this device, but
  ends the account's sessions on every other device.
- The shell's sync action is unreachable while any modal is open (spec 004). Inside the profile
  modal, a sync starts only when the person presses "Sincronizar agora" (hub sync plate, or the
  delete confirmation's unsynced-changes block).
- While a sync started from the profile modal runs, "Trocar de perfil" and "Excluir perfil" are
  locked, so the profile can't be switched away from or deleted mid-sync (spec 004 FR-005a).
- A new toast replaces the one showing; a toast disappears by itself after 5 seconds or when
  dismissed.
- The shell's profile control, the sync status and the entry modal's list reflect a rename, color
  change, link change or deletion immediately, without a reload.

## Requirements *(mandatory)*

### Functional Requirements

**Opening and structure**

- **FR-001**: With an active profile, activating the shell's profile control (wide top bar or
  narrow drawer) MUST open the profile modal on its hub. With no active profile, it MUST open the
  entry modal as before. This replaces spec 004 FR-004's "switch/sign out" destination.
- **FR-002**: The profile modal MUST only ever show the active profile, and MUST never open with no
  active profile.
- **FR-003**: The hub MUST show the profile name as its title, the identity wheel (a picker, FR-008)
  with tribe and color names, the sync plate (FR-003a), an entry to "Perfil neste aparelho" and one
  to "Conta na nuvem" (each with its meta line per US1-1), and "Trocar de perfil".
- **FR-003a**: The hub's sync plate MUST show, per link state: linked → sync status, account e-mail
  and "Sincronizar agora" (hidden while syncing); local only → "Sem conta na nuvem" and "Vincular
  conta na nuvem"; expired → "Sessão expirada" (danger styling), the e-mail, and a primary "Entrar
  de novo".
- **FR-004**: "Perfil neste aparelho" MUST hold the name field with its "Salvar", plus entries to change the profile password and to delete the profile. "Conta na nuvem"
  MUST hold, per link state: linked → account password change, unlink, delete account; expired →
  "Entrar de novo" and unlink; local only → "Vincular conta na nuvem". Each sub-screen has "Voltar"
  back to the hub.
- **FR-004a**: Every action step (password changes, link, account creation, cloud reset,
  re-sign-in, unlink, deletions) MUST offer "Cancelar", and its success screen MUST end in
  "Concluir"; both MUST return to the sub-screen (or hub) the step was opened from.
- **FR-005**: "Trocar de perfil" MUST close the profile modal and open the entry modal on the
  profile list. At most one modal MUST be open at a time.
- **FR-006**: The entry modal MUST no longer host cloud flows for an already-active profile (its
  former *link* context, and its re-sign-in and unlink phases); those live only in the profile
  modal. The entry modal keeps profile picking, unlocking, creating, signing out, new-device cloud
  sign-in and setup, and both forgotten-password recoveries.
- **FR-007**: The shell's sync area MUST open the profile modal directly at the sign-in step when
  the profile has no cloud account, and at the re-sign-in step when the session has expired.

**Editing the profile**

- **FR-008**: Wherever the profile modal shows the identity wheel, it MUST be a picker for the
  active profile's colors: 1–3 colors in pick order (primary, accent, tertiary), at least one always
  selected and the rest locked once 3 are picked. Each tap MUST save the new colors at once and
  retint the modal and the whole app immediately; nothing (closing, "Voltar", "Cancelar") reverts
  them. The entry modal's wheel is not affected.
- **FR-009**: A person MUST be able to rename the active profile. The new name MUST follow the
  profile-name rules (3–16 characters; letters, digits, `_`, `.`, `-`; unique on the device among
  *other* profiles, ignoring letter case), checked on save with the same messages as profile
  creation.
- **FR-009a**: "Salvar" on "Perfil neste aparelho" MUST be enabled only while the trimmed name
  differs from the saved name; color changes MUST NOT enable it. A successful save MUST apply the
  name app-wide at once, keep the person on the screen, and show the toast "Alterações salvas.".
- **FR-010**: A person MUST be able to change the active profile's local password by giving the
  current password and a new one of at least 8 characters, entered twice. A wrong current password
  MUST be rejected with "Senha incorreta."; mismatched new passwords with "As senhas não são
  iguais."; either way nothing changes. The new password MUST be stored in the same non-revealing
  form as any profile password.
- **FR-011**: Rename, color change, local password change and unlink MUST work fully offline.
- **FR-012**: For a linked profile, a rename or color change MUST be saved locally at once and
  sent to the account (label and saved colors) at the next successful sync, with no warning or
  prompt about it.
- **FR-012a**: Colors MUST follow the account across devices: at each sync, the most recent color
  change, from this or any other linked device, MUST win, and the losing side MUST be updated to
  match (the app retints silently if the local colors change). The profile name MUST NOT propagate:
  each device keeps its own name, and the account label only records the most recent one.

**Cloud link**

- **FR-013**: Linking from the profile modal MUST behave as spec 003 defined for the *link*
  context: sign in or create an account, cloud password reset from the sign-in form, merge of
  existing data (spec 003 FR-017), colors rule (FR-026), one-profile-per-account rule (FR-033),
  generic wrong-credentials and e-mail-in-use messages (FR-020), offline message (FR-021).
- **FR-014**: Unlinking from the profile modal MUST confirm first, stating that local data stays and
  the account and its cloud data are not deleted, and MUST need no connection (spec 003 FR-019). It
  is offered for both linked and expired profiles.
- **FR-015**: For a linked profile whose cloud session has expired, the profile modal MUST offer
  re-sign-in with the account password (from the hub and "Conta na nuvem"), with "Esqueci minha
  senha" leading to the cloud password reset; either path renews the session so syncing can resume
  (spec 003 FR-032).
- **FR-016**: A sync MUST start from the profile modal only when the person presses "Sincronizar
  agora" (hub sync plate or the delete confirmation). No other flow in it starts a sync (spec 004
  FR-006).
- **FR-016a**: For a linked profile with a valid session, a person MUST be able to change the cloud
  account password by giving the current cloud password and a new one of at least 8 characters. It
  MUST need a connection (offline message otherwise), reject a wrong current password with the
  generic wrong-credentials message, leave the local profile password unchanged, and keep the
  profile linked and signed in on this device. It MUST end every other session of that account, so
  other linked devices fall into the expired-session state (spec 003 FR-032) and need "Entrar de
  novo" with the new password; the success message MUST say so. Labels MUST make clear which
  password each field is ("do perfil" vs. "da conta").

**Deleting**

- **FR-017**: A person MUST be able to delete the active profile ("Excluir perfil") after a
  confirmation step that names the profile, lists what leaves the device, states that it is
  irreversible, and requires the profile password. A wrong password MUST delete nothing.
- **FR-018**: Deleting a profile MUST remove it and all its owned data (cards, storage locations,
  decks, color identity, cloud sign-in) from the device, leave no profile active and return to the
  default identity. If other profiles remain, the entry modal MUST open on the profile list; if none
  remain, the modal MUST close and the app MUST show the empty-device state (FR-018b). Other
  profiles and their data MUST be unaffected. It MUST need no connection, and MUST NOT delete the
  linked cloud account or any cloud data; the confirmation MUST say so for a linked profile.
- **FR-018a**: For a linked profile with local changes not yet synced, the delete confirmation MUST
  warn that those changes will be lost and offer "Sincronizar agora" in place. The sync runs only
  when the person chooses it; while it runs, deletion MUST be locked; its outcome MUST show in place
  (done: nothing is lost in the cloud; failed: "Sem conexão", "Sessão expirada" or "Falha ao
  sincronizar", with "Tentar de novo"). Deleting without syncing MUST stay allowed.
- **FR-018b**: With no profiles on the device and no modal open, the app's main area MUST show an
  empty-device state ("Nenhum perfil neste aparelho", a line saying a profile works without
  internet or e-mail, and "Criar perfil" opening the entry modal's create-profile step).
- **FR-019**: For a linked profile with a valid session, a person MUST be able to delete the cloud
  account ("Excluir conta na nuvem") after a confirmation step that names the account e-mail, lists
  what leaves the cloud for good, states that other linked devices stop syncing, that it is
  irreversible, and that this device's profile and data stay; it MUST require the cloud account
  password. It MUST NOT be offered while the session is expired.
- **FR-019a**: Deleting the cloud account MUST remove the account and every cloud record belonging
  to it, succeed entirely or not at all, and need a connection (offline message otherwise). On
  success, the profile MUST become local-only with all its local data intact. A wrong password MUST
  delete nothing and show the generic wrong-credentials message.
- **FR-019b**: A profile on another device linked to a deleted account MUST, at its first cloud
  action (sync, account-password change, unlink, account deletion), become local-only with its
  local data intact, return the modal to the hub, and show the toast "A conta {e-mail} não existe
  mais. {nome} continua neste aparelho com todos os dados.".

**Shared behavior**

- **FR-020**: The profile modal MUST follow the themed-modal rules of the entry modal: tinted by
  the active profile's current colors, PT-BR copy only with no raw backend text,
  busy labels that lock the button while a request runs, fields and errors cleared on switching
  steps and on close, keyboard and screen-reader usable with focus kept inside and returned to the
  control that opened it, Esc closing it, and 44px touch targets. On narrow screens it is
  full-screen with the profile's identity chip in its header.
- **FR-021**: Every change made in the profile modal (name, colors, link state, deletion) MUST be
  reflected immediately in the shell's profile control and sync status and in the entry modal's
  profile list.
- **FR-022**: Short confirmations and notices MUST use a toast: announced politely to assistive
  technology, dismissible, gone after 5 seconds, and replaced by any newer toast. Toasts MUST NOT
  shift the modal's layout.
- **FR-023**: The refined identity wheel from the handoff MUST replace the current identity wheel
  in both the profile modal and the entry modal, keeping the same pick rules and names, and dropping
  its decorative motion (spin, breathing, motes, bursts) under reduced motion.

**Entry modal changes**

- **FR-024**: In the entry modal, "Esqueci minha senha" on the unlock step of a **linked** profile
  MUST lead to "Redefinir senha do perfil": it shows the account e-mail, asks for the account
  password (with "Esqueci a senha da conta" leading to the cloud password reset), and on success
  leads to setting a new local password. "Cancelar" returns to unlock. Unlinked profiles keep the
  existing local-reset warning.

### Key Entities

- **Local profile**: unchanged in shape (name, password verifier, color identity, optional cloud
  link). New in this spec: its name, colors and password can change after creation, and it can be
  deleted along with its owned data.
- **Cloud account**: its profile-name label records the latest linked profile name, and its saved
  colors are the shared, last-write-wins source for every linked device (FR-012, FR-012a); its
  password can be changed while signed in; it can be deleted along with all its cloud data.
- **Owned data** (cards, storage locations, decks): always belongs to exactly one profile; removed
  with it on deletion.
- **Toast**: a short, transient message (a label and one sentence), at most one at a time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any screen, a person with an active profile reaches any profile-management
  action in at most 3 taps on wide screens and 4 on narrow screens (via "Menu").
- **SC-002**: A person can change their color identity and see the whole app retinted within 5
  seconds of opening the profile modal (no save step).
- **SC-003**: After a rename, color change or deletion, 100% of places showing the profile (shell
  control, sync status, profile list, unlock screen) show the new state without a reload.
- **SC-004**: After a profile is deleted, 0 items of its data are reachable on the device, and 0
  items of any other profile are changed.
- **SC-005**: Rename, color change, local password change, unlink and profile deletion each
  complete with no network connection.
- **SC-005a**: After a cloud account is deleted, 0 cloud records belonging to it remain, and the
  account can no longer be signed in to.
- **SC-005b**: 100% of delete confirmations (profile and cloud account) state that the action is
  irreversible and what it deletes, before the password is asked for.
- **SC-006**: 100% of profile-modal messages match the handoff's PT-BR copy; none show raw technical
  text.
- **SC-007**: Every action previously reachable from the profile control (switch, sign out, link,
  re-sign-in) remains reachable, and unlink becomes reachable again.

## Assumptions

- Visuals, layout and exact copy follow `design_handoff_profile_modal/` (final path only; the
  rejected variants listed in its README are ignored). Its new design-system pieces (toast, danger
  styling for the expired state and destructive rows/buttons, refined identity wheel, empty-device
  state) must be added to `DESIGN.md` before they're built (Constitution Principle V). Where the
  handoff and this spec disagree on layout or copy, the handoff wins; behavior conflicts are
  resolved by updating this spec. New PT-BR copy goes into the centralized entry copy.
- Renaming and recoloring don't ask for the password: the profile is already unlocked by the
  person using it. Changing a password and deleting do (the profile password for local actions, the
  cloud password for cloud ones).
- Deleting a cloud account needs a trusted server-side step, since a signed-in client can't delete
  its own account; the plan decides how.
- A deleted cloud account's e-mail becomes free to register again.
- Signing out is reached through "Trocar de perfil" → "Sair de {P}" (2 steps); the profile modal
  has no separate sign-out action.
- The sync lock (spec 004 FR-005a) keeps applying to the profile control, so the profile modal
  can't open while a shell-started sync runs.
- No migration or compatibility handling: the app is unreleased; the entry modal's removed *link*
  context and the old identity wheel are simply deleted.
- Spec 004's "no automatic sync" rule holds; FR-012's "next successful sync" means the next sync
  the person starts.
