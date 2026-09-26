# Feature Specification: Profile Modal

**Feature Branch**: `feature/005-profile-modal`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "When the user clicks on their name on the top bar we are going to open a profile modal instead of the auth modal's change-account mode. On this new profile modal the user will be able to change their username, password, color identity, cloud link status (link/unlink), delete account and change current user (that'll open our current auth modal solution). We must understand which functionalities belong on the auth modal and which belong on this profile modal."

> This is the follow-up account-management spec that spec 003 deferred to (its FR-010, and the
> renaming / password-change / deletion items in its Assumptions). It changes spec 004's FR-004
> (what the profile control opens) and closes the "Desvincular conta" gap spec 004's FR-010 left open.

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

## Modal responsibilities *(context)*

Two modals, split by one question: **"who is using this device?"** versus **"manage the profile
that's active now."**

| Entry modal (existing) — *who is at the device* | Profile modal (new) — *the active profile* |
|---|---|
| Profile list: pick a profile, "Em uso" marker, "Sair de {P}" | Overview: identity (wheel, tribe, colors), name, link state |
| Unlock a profile with its password | Change the profile name |
| Create a new profile (with the identity picker) | Change the profile password |
| Sign in with a cloud account on this device (new-device setup) | Change the color identity |
| Forgotten local password: local reset, linked-profile recovery | Link a cloud account (sign in / create account) |
| Cloud password reset, reached from its own sign-in | Cloud password reset, reached from the link sign-in |
| The profile gate (gated route with no active profile) | Renew an expired cloud session ("Entre de novo") |
| | Change the cloud account password (linked profiles) |
| | Unlink the cloud account |
| | Delete the profile (this device) |
| | Delete the cloud account (linked profiles) |
| | "Trocar de perfil" → hands off to the entry modal's profile list |

Consequences:
- The entry modal's *link* context (cloud flows for the active profile) and its *reauth* and
  *unlink* phases move to the profile modal. The entry modal keeps the *device* and *gate* contexts.
- Signing out stays in the entry modal's profile list ("Sair de {P}"), reached through "Trocar de
  perfil". Signing out is about who holds the device, not about managing the profile.
- The cloud password reset flow is shared: both modals reach it from their own cloud sign-in form.
- Only one modal is ever open. "Trocar de perfil" closes the profile modal, then opens the entry
  modal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the profile modal and switch profile (Priority: P1)

A person with an active profile taps their name in the shell's profile control. Instead of the
profile list, a profile modal opens showing their identity: wheel, tribe and color names, profile
name, and whether the profile is linked to a cloud account. From there they can manage the profile
or choose "Trocar de perfil" to go to the profile list, where they can switch or sign out.

**Why this priority**: This replaces the control's current destination. Without it, nothing else
in this spec is reachable, and switching profile must keep working.

**Independent Test**: With an active profile, tap the profile control at both widths; confirm the
profile modal opens with the right identity and link state, and that "Trocar de perfil" closes it
and opens the entry modal's profile list, where switching and signing out still work.

**Acceptance Scenarios**:

1. **Given** an active profile, **When** the person activates the profile control, **Then** the
   profile modal opens, showing the profile's wheel, tribe name, color names in pick order, profile
   name, and link state (linked with the account e-mail, local only, or session expired).
2. **Given** the profile modal is open, **When** the person activates "Trocar de perfil", **Then**
   the profile modal closes and the entry modal opens on the profile list with the active profile
   first and marked "Em uso".
3. **Given** no active profile, **When** the person activates the profile control ("Entrar"),
   **Then** the entry modal opens on the profile list (or the *device* context if the device has no
   profiles), exactly as before; the profile modal never opens without an active profile.
4. **Given** a sync is running, **When** the person tries to activate the profile control, **Then**
   nothing opens (spec 004 FR-005a still applies).
5. **Given** a narrow screen, **When** the person opens the drawer and taps the profile control,
   **Then** the drawer closes, the profile modal opens, and on close focus returns to "Menu".

---

### User Story 2 - Change the color identity (Priority: P1)

A person wants their app to wear different colors. In the profile modal they open the identity
picker, change their picks (1–3 colors, in pick order), see the modal preview the new identity,
and save. The whole app retints right away.

**Why this priority**: Color identity is the app's most visible personal trait and, until now,
could only be chosen once, at profile creation.

**Independent Test**: Change a profile's colors, save, and confirm the whole app retints and the
change survives a reload; reopen, change picks, then cancel, and confirm nothing changed.

**Acceptance Scenarios**:

1. **Given** the profile modal, **When** the person opens the color editor, **Then** the picker
   starts with the profile's current colors in pick order and the modal previews each change.
2. **Given** changed picks, **When** the person saves, **Then** the profile's identity is updated,
   the whole app (shell, profile control, modal) retints immediately, and the new tribe name shows.
3. **Given** changed picks, **When** the person cancels or closes the modal without saving,
   **Then** the profile keeps its previous colors and the app shows them again.
4. **Given** one color picked, **When** the person tries to remove it, **Then** it cannot be
   removed (at least one color always stays selected); a 4th color cannot be added.
5. **Given** a linked profile, **When** the person saves new colors, **Then** the account's saved
   colors are updated to match (see FR-012).
6. **Given** the same account is linked on two devices, **When** colors change on device A and
   device B then syncs, **Then** device B's profile takes the new colors and retints; if both
   changed colors, the most recent change wins on both (FR-012a).

---

### User Story 3 - Link or unlink a cloud account from the profile modal (Priority: P2)

A person whose profile is local-only links it to a cloud account from the profile modal, by signing
in or creating an account. A person whose profile is linked can unlink it, keeping all local data.
A person whose cloud session expired can sign in again from the same place.

**Why this priority**: Linking and unlinking already exist; this story moves them to their natural
home and restores the unlink entry point that spec 004 left without one.

**Independent Test**: From the profile modal, link a local profile (sign-in and create-account
paths), then unlink it, confirming data stays on the device and the link state updates in the
modal and the shell's sync status.

**Acceptance Scenarios**:

1. **Given** a local-only profile, **When** the person chooses to link a cloud account, **Then**
   the profile modal shows the cloud sign-in form, with a path to create an account instead and to
   reset a forgotten cloud password, behaving as spec 003's *link* context did (FR-014, FR-017,
   FR-020, FR-026, FR-033 of spec 003).
2. **Given** a linked profile, **When** the person chooses to unlink, **Then** a confirmation says
   the profile keeps all its data on this device and the account and its cloud data are not
   deleted; confirming unlinks it, with no connection needed.
3. **Given** a linked profile whose cloud session has expired, **When** the profile modal opens,
   **Then** the link state says the session expired and offers "Entrar de novo", which renews it
   with the account password.
4. **Given** the shell's sync status says "Sem conta na nuvem" or "Sessão expirada", **When** the
   person activates its action, **Then** the profile modal opens directly at the link or re-sign-in
   step.
5. **Given** a link, unlink or re-sign-in succeeds, **When** the person finishes, **Then** the
   modal returns to the profile overview with the new link state (no sync starts on its own, per
   spec 004 FR-006).

---

### User Story 4 - Rename the profile (Priority: P2)

A person wants a different profile name. In the profile modal they edit the name and save; the new
name shows everywhere right away.

**Why this priority**: Names chosen in a hurry at creation should be fixable without recreating
the profile and losing data.

**Independent Test**: Rename a profile, confirm the shell, profile list and unlock screen show the
new name, and that the old name can now be used by another profile.

**Acceptance Scenarios**:

1. **Given** the profile modal, **When** the person saves a valid new name, **Then** the profile's
   name changes everywhere at once (profile control, profile list, unlock screen).
2. **Given** a name that breaks the name rules (3–16 characters; letters, digits, `_`, `.`, `-`)
   or is used by another profile on this device, **When** the person saves, **Then** the same field
   errors as profile creation show and nothing changes.
3. **Given** a linked profile, **When** the name changes, **Then** the account's profile-name label
   is updated to match (see FR-012).

---

### User Story 5 - Change the profile or cloud account password (Priority: P2)

A person wants a new local profile password. They enter the current password and a new one; from
then on, only the new password unlocks the profile. A person with a linked profile can also change
the cloud account's password, as a separate action.

**Why this priority**: Standard account hygiene; spec 003 only allowed a password change through
the forgotten-password flows.

**Independent Test**: Change the local password, sign out, and confirm the old password is rejected
and the new one unlocks the profile. With a linked profile, change the cloud password and confirm
signing in to the account (e.g. new-device sign-in) needs the new one, while the local password is
unchanged.

**Acceptance Scenarios**:

1. **Given** the profile modal, **When** the person enters the correct current password and a
   valid new one (at least 8 characters), **Then** the profile password changes and a confirmation
   shows.
2. **Given** a wrong current password, **When** the person submits, **Then** "Senha incorreta."
   shows on the current-password field and nothing changes.
3. **Given** a linked profile, **When** the local password changes, **Then** the cloud account's
   password is unaffected, and vice versa.
4. **Given** a linked profile with a valid session, online, **When** the person enters the correct
   current cloud password and a valid new one, **Then** the account password changes, the profile
   stays linked and signed in on this device, the confirmation says other devices must sign in
   again, and every other device linked to the account shows "Sessão expirada" at its next cloud
   action.
5. **Given** a wrong current cloud password, **When** the person submits, **Then** the generic
   wrong-credentials message shows and nothing changes.
6. **Given** a local-only profile, **When** the profile modal is shown, **Then** no cloud-password
   action is offered; **Given** an expired session, the person must sign in again first.
7. **Given** no connection, **When** the person submits a cloud password change, **Then** the
   offline message shows and nothing changes.

---

### User Story 6 - Delete the profile or the cloud account (Priority: P3)

A person who no longer uses a profile on this device deletes it ("Excluir perfil"), after confirming
with its password. The profile and all its data disappear from the device and no profile is active
afterwards. A person who wants to leave the cloud entirely deletes the linked cloud account
("Excluir conta na nuvem"): the account and every piece of cloud data belonging to it are gone.
Both actions are irreversible, and the person is told so before confirming.

**Why this priority**: Needed to keep shared devices tidy and to let a person remove their data
from the cloud, but used rarely and never on the path to everyday use.

**Independent Test**: Delete a profile with data; confirm it is gone from the profile list, none of
its data is reachable, the app is back on the default identity, and other profiles are untouched.
Separately, delete a linked profile's cloud account; confirm the account can no longer be signed in
to, its cloud data is gone, and the local profile is kept as local-only with its data.

**Acceptance Scenarios**:

1. **Given** the profile modal, **When** the person chooses "Excluir perfil", **Then** a
   confirmation step names the profile, lists what will be deleted from this device (cards, storage
   locations, decks, colors, the profile itself), says plainly that it can't be undone, and asks for
   the profile password. For a linked profile it also says the cloud account and its cloud data are
   not deleted by this action.
2. **Given** the correct password, **When** the person confirms, **Then** the deletion happens, no
   profile is active, the app returns to the default identity, and the entry modal opens on the
   profile list (or the *device* context if no profiles remain).
3. **Given** a wrong password, **When** the person confirms, **Then** "Senha incorreta." shows and
   nothing is deleted.
4. **Given** other profiles on the device, **When** one profile is deleted, **Then** the others and
   all their data are unaffected.
5. **Given** a linked profile with local changes not yet synced, **When** the "Excluir perfil"
   confirmation shows, **Then** it warns that those changes will be lost and offers "Sincronizar
   agora"; after a successful sync the warning disappears, and the person can also delete without
   syncing.
6. **Given** a linked profile with a valid session, online, **When** the person chooses "Excluir
   conta na nuvem", **Then** a confirmation step names the account e-mail, says that the account and
   all its cloud data (cards, storage locations, saved colors and name) will be deleted for good,
   that other devices linked to it will stop syncing, that it can't be undone, and that this
   device's profile and data stay; it asks for the cloud account password.
7. **Given** the correct cloud password, **When** the person confirms, **Then** the account and all
   its cloud data are deleted, the profile becomes local-only with all its local data, and the
   profile modal shows the local-only link state.
8. **Given** a wrong cloud password, no connection, or an expired session, **When** the person tries
   to delete the cloud account, **Then** nothing is deleted and the matching message shows
   (wrong-credentials, offline, or a prompt to sign in again first).

---

### Edge Cases

- Saving a rename or color change with no actual change closes the edit step without doing anything.
- Renaming to the same name with different letter case follows the device's existing uniqueness
  rule: it is allowed only if no *other* profile holds that name.
- A linked profile renamed or recolored while offline or with an expired session keeps the change
  locally at once; the account's label/colors catch up later (FR-012). The change is never blocked
  or rolled back for lack of a connection.
- Unlinking, renaming, recoloring, changing the local password and deleting a local profile never
  need a connection. Linking and signing in again do; offline they fail with the offline message.
- Closing the profile modal mid-edit (Esc, backdrop, close button) discards unsaved edits, restores
  the profile's own colors, and clears every field and error.
- Deleting the last profile on the device leaves the device with no profiles; the entry modal opens
  in its *device* context.
- Deleting a linked profile leaves its cloud account and cloud data untouched; the account can
  still be set up on this or another device later.
- A cloud account deleted from one device leaves other devices' profiles linked to a missing
  account. On those devices, the next cloud action (sync, re-sign-in) finds the account gone: the
  profile keeps all its local data, becomes local-only, and the person is told the account no longer
  exists. Nothing local is ever deleted because of a remote account deletion.
- If the connection drops mid-way through a cloud account deletion, the account is either fully
  deleted or not at all; the person sees the outcome, and a partial deletion is never reported as
  success.
- A cloud password change doesn't sign the profile out of its cloud session on this device, but
  ends the account's sessions on every other device.
- The shell's sync action is unreachable while any modal is open (spec 004). The only sync the
  profile modal can start is the delete confirmation's "Sincronizar agora" (FR-018a), and it runs
  only when the person chooses it.
- The shell's profile control, the sync status and the entry modal's list reflect a rename, color
  change, link change or deletion immediately, without a reload.

## Requirements *(mandatory)*

### Functional Requirements

**Opening and scope**

- **FR-001**: With an active profile, activating the shell's profile control (wide top bar or
  narrow drawer) MUST open the profile modal. With no active profile, it MUST open the entry modal
  as before. This replaces spec 004 FR-004's "switch/sign out" destination.
- **FR-002**: The profile modal MUST only ever show the active profile, and MUST never open with no
  active profile.
- **FR-003**: The profile modal's overview MUST show the profile's color identity (wheel, tribe
  name and color names in pick order), its name, and its link state: linked (with the account
  e-mail), local only, or session expired.
- **FR-004**: The profile modal MUST offer, from its overview: change colors, change name, change
  the profile password, link / unlink the cloud account (whichever applies), renew an expired
  session (when it applies), change the cloud account password and delete the cloud account (linked
  profiles only), delete the profile, and "Trocar de perfil".
- **FR-005**: "Trocar de perfil" MUST close the profile modal and open the entry modal on the
  profile list. At most one modal MUST be open at a time.
- **FR-006**: The entry modal MUST no longer host cloud flows for an already-active profile (its
  former *link* context, and its re-sign-in and unlink phases); those live only in the profile
  modal. The entry modal keeps profile picking, unlocking, creating, signing out, new-device cloud
  sign-in and setup, and both forgotten-password recoveries.
- **FR-007**: The shell's sync-status actions that lead to linking ("Sem conta na nuvem" /
  "Vincular conta na nuvem") and to re-sign-in ("Sessão expirada" / "Entrar de novo") MUST open the
  profile modal directly at that step.

**Editing the profile**

- **FR-008**: A person MUST be able to change the active profile's color identity to 1–3 colors in
  pick order (primary, accent, tertiary), with at least one always selected. The modal MUST preview
  the picks while editing; saving MUST apply them app-wide immediately; cancelling or closing MUST
  restore the saved colors.
- **FR-009**: A person MUST be able to rename the active profile. The new name MUST follow the
  profile-name rules (3–16 characters; letters, digits, `_`, `.`, `-`; unique on the device among
  *other* profiles), checked on submit with the same messages as profile creation.
- **FR-010**: A person MUST be able to change the active profile's local password by giving the
  current password and a new one of at least 8 characters. A wrong current password MUST be
  rejected with "Senha incorreta." and change nothing. The new password MUST be stored in the same
  non-revealing form as any profile password.
- **FR-011**: Rename, color change, password change and unlink MUST work fully offline.
- **FR-012**: For a linked profile, a rename or color change MUST be written to the account (label
  and saved colors) right away when online with a valid session, otherwise at the next successful
  sync or re-sign-in.
- **FR-012a**: Colors MUST follow the account across devices: at each sync, the most recent color
  change, from this or any other linked device, MUST win, and the losing side MUST be updated to
  match (the app retints if the local colors change). The profile name MUST NOT propagate: each
  device keeps its own name, and the account label only records the most recent one.

**Cloud link**

- **FR-013**: Linking from the profile modal MUST behave as spec 003 defined for the *link*
  context: sign in or create an account, cloud password reset from the sign-in form, merge of
  existing data (spec 003 FR-017), colors rule (FR-026), one-profile-per-account rule (FR-033),
  generic wrong-credentials and e-mail-in-use messages (FR-020), offline message (FR-021).
- **FR-014**: Unlinking from the profile modal MUST confirm first, stating that local data stays and
  the account and its cloud data are not deleted, and MUST need no connection (spec 003 FR-019).
- **FR-015**: For a linked profile whose cloud session has expired, the profile modal MUST offer
  re-sign-in with the account password, after which syncing can resume (spec 003 FR-032).
- **FR-016**: No flow in the profile modal MUST start a sync on its own (spec 004 FR-006).
- **FR-016a**: For a linked profile with a valid session, a person MUST be able to change the cloud
  account password by giving the current cloud password and a new one of at least 8 characters. It
  MUST need a connection (offline message otherwise), reject a wrong current password with the
  generic wrong-credentials message, leave the local profile password unchanged, and keep the
  profile linked and signed in on this device. It MUST end every other session of that account, so
  other linked devices fall into the expired-session state (spec 003 FR-032) and need "Entrar de
  novo" with the new password; the success message MUST say so. Labels MUST make clear which
  password each field is (profile vs. cloud account).

**Deleting**

- **FR-017**: A person MUST be able to delete the active profile ("Excluir perfil") after a
  confirmation step that names the profile, lists what is deleted, states that it is irreversible,
  and requires the profile password. A wrong password MUST delete nothing.
- **FR-018**: Deleting a profile MUST remove it and all its owned data (cards, storage locations,
  decks, color identity, cloud sign-in) from the device, leave no profile active, return to the
  default identity, and open the entry modal (profile list, or *device* context if none remain).
  Other profiles and their data MUST be unaffected. It MUST need no connection, and MUST NOT
  delete the linked cloud account or any cloud data; the confirmation MUST say so for a linked
  profile.
- **FR-018a**: For a linked profile with local changes not yet synced, the delete confirmation MUST
  warn that those changes will be lost and offer "Sincronizar agora" in place. The sync runs only
  when the person chooses it (spec 004 FR-006 holds); while it runs, deletion MUST be locked; if it
  fails (offline, expired session, error), the matching status shows and deleting without syncing
  MUST stay allowed.
- **FR-019**: For a linked profile with a valid session, a person MUST be able to delete the cloud
  account ("Excluir conta na nuvem") after a confirmation step that names the account e-mail, states
  that the account and all cloud data belonging to it are deleted permanently, that other linked
  devices stop syncing, that it is irreversible, and that this device's profile and data stay; it
  MUST require the cloud account password.
- **FR-019a**: Deleting the cloud account MUST remove the account and every cloud record belonging
  to it, succeed entirely or not at all, and need a connection (offline message otherwise). On
  success, the profile MUST become local-only with all its local data intact. A wrong password MUST
  delete nothing and show the generic wrong-credentials message.
- **FR-019b**: A profile on another device linked to a deleted account MUST, at its next cloud
  action, become local-only with its local data intact and tell the person the account no longer
  exists.

**Shared behavior**

- **FR-020**: The profile modal MUST follow the themed-modal rules of the entry modal: tinted by
  the active profile (or the identity being previewed), PT-BR copy only with no raw backend text,
  busy labels that lock the button while a request runs, fields and errors cleared on switching
  steps and on close, keyboard and screen-reader usable with focus kept inside and returned to the
  control that opened it, and 44px touch targets.
- **FR-021**: Every change made in the profile modal (name, colors, link state, deletion) MUST be
  reflected immediately in the shell's profile control and sync status and in the entry modal's
  profile list.

### Key Entities

- **Local profile**: unchanged in shape (name, password verifier, color identity, optional cloud
  link). New in this spec: its name, colors and password can change after creation, and it can be
  deleted along with its owned data.
- **Cloud account**: its profile-name label records the latest linked profile name, and its saved
  colors are the shared, last-write-wins source for every linked device (FR-012, FR-012a); its password can be changed while signed in; it can be deleted along with all its cloud
  data.
- **Owned data** (cards, storage locations, decks): always belongs to exactly one profile; removed
  with it on deletion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any screen, a person with an active profile reaches any profile-management
  action in at most 2 taps on wide screens and 3 on narrow screens (via "Menu").
- **SC-002**: A person can change their color identity and see the whole app retinted in under 15
  seconds.
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
- **SC-006**: 100% of profile-modal messages are PT-BR copy; none show raw technical text.
- **SC-007**: Every action previously reachable from the profile control (switch, sign out, link,
  re-sign-in) remains reachable, and unlink becomes reachable again.

## Assumptions

- Visuals follow `DESIGN.md`. The profile modal and its steps (overview, editors, delete
  confirmations) aren't described there yet; their design comes from a design handoff still to be
  provided, and gets added to `DESIGN.md` before the UI is built (Constitution Principle V). This spec
  defines behavior only; where the handoff and this spec disagree on layout or copy, the handoff
  wins, while behavior conflicts are resolved by updating this spec. New PT-BR copy is added to the
  centralized entry copy.
- The color editor reuses the identity picker from profile creation, with the same pick-order and
  1–3 rules.
- Renaming and recoloring don't ask for the password: the profile is already unlocked by the
  person using it. Changing a password and deleting do (the profile password for local actions, the
  cloud password for cloud ones).
- Deleting a cloud account needs a trusted server-side step, since a signed-in client can't delete
  its own account; the plan decides how.
- A deleted cloud account's e-mail becomes free to register again.
- Signing out is reached through "Trocar de perfil" → "Sair de {P}" (2 steps); the profile modal
  has no separate sign-out action.
- The sync lock (spec 004 FR-005a) keeps applying to the profile control, so the profile modal
  can't open while a sync runs.
- No migration or compatibility handling: the app is unreleased; the entry modal's removed *link*
  context is simply deleted.
- Spec 004's "no automatic sync" rule holds; FR-012's "at the next successful sync" means the next
  sync the person starts.
