# Feature Specification: Profiles and Accounts

**Feature Branch**: `002-profiles-accounts`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Profiles and accounts: local profiles and optional cloud accounts,
replacing spec 001. Core features (collection, cards, storage locations, decks, color identity)
require a local profile: username + password, stored on the device, offline, no email. A device can
hold multiple profiles; each profile's data and color identity are isolated. Users can create,
switch, and sign out of profiles. Data created before profiles existed must be moved into the first
profile created on that device. Gameplay tools (life counter, planechase) require no profile. A
cloud account (email/password, or Google on web and Android) can optionally be linked to a local
profile to enable sync. Never required. Forgot-password flow for cloud accounts via an emailed code
typed into the app (no link/redirect); must not reveal whether an account exists. Recovery for a
forgotten local-profile password must be defined. Carry over from spec 001's clarifications:
usernames 3–20 chars (letters, digits, _ . -), case-insensitive unique; passwords min 8 chars; both
validated locally before any request; every error in PT-BR, with unrecognized backend errors falling
back to a generic PT-BR message. The sign-in/sign-up UI is being redesigned; capture behavioral
changes, not visuals."

> Supersedes `specs/001-auth-modal/spec.md`, which documented the pre-profile behavior (auth fully
> optional, no local accounts) as a study and no longer complies with Constitution v2.0.0,
> Principle IV.

## Clarifications

### Session 2026-09-24

- Q: How does someone get back into a local-only profile (no linked cloud account) if they forget
  its password? → A: Anyone on the device can reset its password after an explicit warning; the
  profile lock is a privacy convenience, not security.
- Q: When a profile with local data is linked to a cloud account that already holds data, are the
  two sides merged automatically or does the person choose? → A: Merged automatically, per item,
  most recent change wins (the existing sync rule).
- Q: Does a local profile set up from a cloud sign-in on a new device need its own local password?
  → A: Yes — the person sets a local password during setup, like any other profile.
- Q: Should data created before profiles existed be moved into the first profile? → A: No — this
  only matters during the transition, which will be handled by wiping all local and cloud data and
  starting fresh; the requirement was dropped from the input description's scope.
- Q: Now that every local profile has its own username, does a cloud account still need a separate
  username? → A: No — cloud accounts have no username; they sign in by email + password or Google,
  and the app displays the local profile's username.
- Q: What should happen to the existing `/profile` page (change username, change password, delete
  account) while this feature is built? → A: Hide it until a separate follow-up spec rebuilds it.
- Q: When someone picks a profile to unlock or switch to, does the app list every profile's username
  on the device, or must they type it? → A: List every profile on the device; tap one, then enter
  its password.
- Q: When someone signs in to their cloud account on a new device and a local profile is created,
  where does that profile's username come from? → A: The profile's username is saved to the cloud
  account as a plain label (not a sign-in identifier, not unique across accounts); a new device
  pre-fills it, editable if that name is already taken on the device.
- Q: When someone switches away from a cloud-linked profile and later switches back, is it still
  signed in to the cloud? → A: Yes — each profile keeps its own cloud sign-in on the device and
  resumes it on unlock, until unlinked or the cloud sign-in expires or is revoked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a local profile and use the app (Priority: P1)

A person opening the app on a device wants to start tracking their cards. They create a local
profile with a username and password — no email, no internet needed — and immediately get access
to their collection, storage locations, decks, and color identity.

**Why this priority**: every core feature now sits behind a local profile (Principle IV); without
profile creation nothing else in the app's core is reachable.

**Independent Test**: on a device with no profiles and no network connection, create a profile,
then add a card, a storage location, and a deck, and verify all of them work and persist after
closing and reopening the app.

**Acceptance Scenarios**:

1. **Given** a device with no profiles, **When** the person opens any core feature (collection,
   storage locations, decks), **Then** they are asked to create a profile before continuing,
   and are returned to where they were headed once it's created.
2. **Given** the profile-creation form, **When** the person submits a valid username and a
   password, while offline, **Then** the profile is created and becomes the active profile.
3. **Given** the profile-creation form, **When** the username is shorter than 3 or longer than
   20 characters, or contains anything other than letters, digits, `_`, `.`, or `-`, **Then** the
   form is rejected with a PT-BR message stating the rule.
4. **Given** the profile-creation form, **When** the password is shorter than 8 characters,
   **Then** the form is rejected with a PT-BR message stating the minimum.
5. **Given** a device that already has a profile named `Joao`, **When** someone tries to create a
   profile named `joao`, **Then** it is rejected with a PT-BR message saying the name is already
   used on this device.
6. **Given** an active profile, **When** the person closes and reopens the app, **Then** that
   profile is still active without re-entering the password.

---

### User Story 2 - Share a device between several people (Priority: P1)

Several players share one device (e.g. a household tablet). Each has their own profile, and each
sees only their own collection, decks, and color identity. They can switch between profiles and
sign out.

**Why this priority**: multi-person devices are the reason local profiles exist (Principle IV
rationale); without isolation, profiles would be decoration.

**Independent Test**: create two profiles, add different cards to each, switch between them, and
verify each profile only ever shows its own data and color identity.

**Acceptance Scenarios**:

1. **Given** a device with profiles A and B and A active, **When** the person opens the profile
   list, which shows both A and B, selects B and enters B's password, **Then** B becomes active and only B's data and color identity are shown.
2. **Given** a profile switch attempt, **When** the entered password is wrong, **Then** the switch
   is rejected with a PT-BR message and the previously active profile's data stays hidden from the
   person attempting the switch until a profile is unlocked.
3. **Given** an active profile, **When** the person signs out of it, **Then** no profile is active,
   no profile's data is visible, and core features ask them to pick or create a profile again.
4. **Given** profile A with a linked cloud account and profile B without one, **When** B is active,
   **Then** no sync runs with A's cloud account and none of B's data is sent to it.
5. **Given** profile A with a linked cloud account, **When** the person switches to B and later back
   to A, **Then** A can sync right away without signing in to the cloud account again.

---

### User Story 3 - Use gameplay tools without any profile (Priority: P2)

A person at a game table wants to use a gameplay tool (e.g. a life counter) without creating or
unlocking a profile.

**Why this priority**: required by Principle IV, but gameplay tools don't exist yet — this story
ensures the profile gate is built so it never covers them, rather than delivering a tool itself.

**Independent Test**: with no active profile, open every area of the app that doesn't read or
change owned-card data (currently the About page) and verify none of them ask for a profile.

**Acceptance Scenarios**:

1. **Given** no active profile, **When** the person opens an area that doesn't read or change
   owned-card data, **Then** it opens without any profile prompt.
2. **Given** no active profile, **When** the person opens a core feature, **Then** they are asked
   to pick or create a profile (User Story 1, scenario 1).

---

### User Story 4 - Link a cloud account to sync a profile (Priority: P2)

A person with a local profile wants their data backed up and available on other devices. They link
their profile to a cloud account, by creating a new one (email + password) or signing in to an
existing one (email + password).

**Why this priority**: sync is the main reason to have a cloud account, but the app is fully
usable without it, so it ranks below the local-profile stories.

**Independent Test**: link a profile to a new cloud account on device 1, then on device 2 sign in
with that cloud account and verify the profile's data appears there.

**Acceptance Scenarios**:

1. **Given** an active profile with no linked cloud account, **When** the person creates a cloud
   account with an email and password, **Then** the account is created, linked to the profile, and
   the profile's data is synced to it.
2. **Given** an active profile with local data and no linked cloud account, **When** the person
   signs in to an existing cloud account that already holds data, **Then** it is linked to the
   profile and both sides' data is merged automatically; where the same item changed on both sides,
   the most recent change wins.
3. **Given** cloud sign-in, **When** the email or password is wrong, **Then** sign-in is
   rejected with one generic PT-BR message that does not reveal whether the account exists.
4. **Given** cloud account creation, **When** the email is already used by another cloud account,
   **Then** it is rejected with a PT-BR message saying the email is already in use.
5. **Given** a device with no profile linked to a given cloud account, **When** the person signs in
   with that cloud account, **Then** they confirm the profile username (pre-filled from the cloud
   account, editable if already taken on this device) and choose a local password (FR-004), and a
   local profile is set up on this device, linked to the account and filled with its synced data.
6. **Given** a profile with a linked cloud account, **When** the person unlinks it, **Then** the
   profile keeps all its local data and stops syncing; the cloud account and its data are not
   deleted.
7. **Given** no network connection, **When** the person attempts any cloud action, **Then** they
   see a PT-BR message that the action needs a connection, and local features keep working.

---

### User Story 5 - Use a Google account as the cloud account (Priority: P2)

A person prefers not to create another password and uses their Google account as the cloud account
for their profile, on both the web/desktop app and the Android app.

**Why this priority**: removes friction for the optional sync path; same priority as email-based
linking since it's an alternative route to the same outcome.

**Independent Test**: on the web app and on the Android app, link a profile using Google, then on
another device sign in with the same Google account and verify the profile's data appears.

**Acceptance Scenarios**:

1. **Given** an active profile with no linked cloud account, **When** the person chooses "continue
   with Google" and completes Google's consent step, **Then** a cloud account is created or signed
   in to and linked to the profile, on both the web app and the Android app.
2. **Given** a cloud account created with email/password, **When** the person later continues
   with Google using a Google account with the same email, **Then** they reach the same cloud
   account, not a second one.
3. **Given** a person who cancels or fails Google's consent step, **When** they return to the app,
   **Then** nothing is linked and they see a PT-BR message (or no message, if they cancelled).
4. **Given** a device with no profile linked to a Google-based cloud account, **When** the person
   continues with Google, **Then** they still choose a local password for the new local profile,
   exactly as in User Story 4, scenario 5.

---

### User Story 6 - Recover a forgotten cloud account password (Priority: P3)

A person who forgot their cloud account password requests a code by email, types it into the app,
and sets a new password — without leaving the app to follow a link.

**Why this priority**: important for account continuity, but only affects the optional cloud tier
and only occasionally.

**Independent Test**: request a reset for an existing account, enter the emailed code in the app,
set a new password, and sign in with it; separately, request a reset for a non-existent email and
verify the response looks identical.

**Acceptance Scenarios**:

1. **Given** the forgot-password form, **When** the person enters their email,
   **Then** the app shows the same confirmation ("if an account exists, a code was sent") whether
   or not an account matches.
2. **Given** a code was emailed, **When** the person enters the correct code and a new valid
   password within the code's validity period, **Then** the password is changed and they are
   signed in.
3. **Given** a code was emailed, **When** the person enters a wrong or expired code, **Then** it is
   rejected with a PT-BR message and they can request a new code.
4. **Given** a cloud account that only uses Google, **When** someone requests a reset for it,
   **Then** the confirmation looks the same as for any other request (scenario 1) and no password is
   set by this flow.

---

### User Story 7 - Recover a forgotten local profile password (Priority: P3)

A person who forgot their local profile's password needs a way back into their profile's data.

**Why this priority**: rare, but without a defined path, a forgotten password means permanently
losing access to a collection.

**Independent Test**: for one profile with a linked cloud account and one without, follow the
recovery path and verify access is restored with all data intact.

**Acceptance Scenarios**:

1. **Given** a profile with a linked cloud account, **When** the person chooses "forgot password" for
   that profile and signs in to the linked cloud account, **Then** they set a new local password
   and the profile unlocks with all data intact.
2. **Given** a profile without a linked cloud account, **When** the person chooses "forgot
   password", **Then** they are warned in PT-BR that anyone using this device can reset this
   profile's password, and after confirming they set a new password and the profile unlocks with all
   data intact.

---

### User Story 8 - Delete a local profile (Priority: P3)

A person who no longer uses a device, or who shared it temporarily, removes their profile and its
data from that device.

**Why this priority**: housekeeping for shared devices; the app remains fully functional without it.

**Independent Test**: delete a profile after confirming its password and verify its data is gone
from the device while other profiles and any linked cloud account's data are untouched.

**Acceptance Scenarios**:

1. **Given** an active profile, **When** the person deletes it and confirms with its password,
   **Then** the profile and all its local data are removed from the device and no profile is active.
2. **Given** a deleted profile that had a linked cloud account, **When** deletion completes,
   **Then** the cloud account and its data still exist and can be linked again from any device.
3. **Given** a profile with local changes not yet synced to its linked cloud account, **When** the
   person starts deleting it, **Then** they are warned those changes will be lost before confirming.

---

### Edge Cases

- A person submits a form twice quickly (double-click): only one request/creation happens.
- A cloud request fails for a reason the app doesn't recognize: a generic PT-BR message is shown and
  the form stays usable for a retry, never a raw backend message or a stuck state.
- A person switches between sign-in, create-account, and forgot-password forms mid-entry: any error
  from the previous form clears.
- A form is dismissed without submitting: entered fields and errors reset, so reopening starts clean.
- A cloud account is already linked to a profile on this device, and someone tries to link it to a
  second profile on the same device: rejected with a PT-BR message naming the profile it's linked to.
- A profile is linked to the wrong cloud account by mistake: the automatic merge has no undo;
  unlinking afterward keeps the merged data on both sides.
- A cloud-linked profile's password is forgotten while offline: its recovery path (User Story 7,
  scenario 1) needs a connection, so recovery waits until the device is online.
- The linked cloud account's password is changed on another device: this profile keeps working
  locally and asks the person to sign in to the cloud account again before syncing.

## Requirements *(mandatory)*

### Functional Requirements

**Local profiles**

- **FR-001**: System MUST require an active local profile to use any feature that reads or changes
  owned-card data (collection, cards, storage locations, decks) or color identity.
- **FR-002**: System MUST let a person create a local profile with a username and password, fully
  offline, without an email address.
- **FR-003**: Local profile usernames MUST be 3–20 characters, contain only letters, digits, `_`,
  `.`, or `-`, and be unique per device, compared case-insensitively.
- **FR-004**: Passwords (local profile and cloud account) MUST be at least 8 characters.
- **FR-005**: Username and password rules MUST be checked on the form before any request is sent,
  with a PT-BR message stating the violated rule.
- **FR-006**: A device MUST support multiple local profiles. Each profile's cards, storage locations,
  decks, and color identity MUST be visible and changeable only while that profile is active.
- **FR-007**: Picking a profile to unlock or switch to MUST show a list of every profile's username
  on the device; the person selects one and MUST then enter that profile's password. The active profile MUST
  stay active across app restarts until it is signed out of, switched away from, or deleted.
- **FR-008**: Signing out of a profile MUST leave no profile active and hide all profile data.
- **FR-009**: Local profile passwords MUST never be stored in a form that reveals the password.
- **FR-010**: System MUST let a person delete a local profile after confirming its password,
  removing that profile's local data from the device and warning first if it has unsynced changes.

**Profile-free areas**

- **FR-011**: Areas that don't read or change owned-card data or color identity (currently the
  About page; future gameplay tools such as a life counter) MUST be usable with no active profile.
- **FR-012**: With no active profile, the app MUST use its default color identity.

**Cloud accounts**

- **FR-013**: Linking a cloud account MUST always be optional; no capability may require one.
- **FR-014**: A person with an active profile MUST be able to link it to a cloud account by
  creating one (email and password) or signing in to an existing one (email and password).
- **FR-015**: A person MUST be able to use a Google account as the cloud account, on both the web
  app and the Android app. A Google sign-in with the same email as an existing cloud account MUST
  reach that account rather than create a second one.
- **FR-016**: Cloud accounts MUST NOT have a sign-in username; they are identified by email (or
  Google identity). A cloud account MUST store its linked profile's username as a plain label, not
  unique across accounts and never usable to sign in; the app MUST display the local profile's
  username, never the email or Google name.
- **FR-017**: Only the active profile's data MUST sync, and only with that profile's linked cloud
  account. A cloud account MUST be linked to at most one profile per device, and MAY be linked
  from multiple devices. Each profile MUST keep its own cloud sign-in on the device: switching away,
  signing out of the profile, or restarting the app MUST NOT end it, and unlocking the profile MUST
  resume it without a cloud sign-in — until the profile is unlinked or deleted, or the cloud sign-in
  expires or is revoked, in which case the next cloud action asks the person to sign in again.
- **FR-018**: When a profile with local data is linked to a cloud account that already holds data,
  both sides MUST be merged automatically, per item, with the most recent change winning — the same
  rule ongoing sync uses. No confirmation step or choice of side is offered.
- **FR-019**: Signing in with a cloud account (email/password or Google) on a device with no profile
  linked to it MUST set up a local profile for it on that device, filled with its synced data. The
  profile username MUST be pre-filled from the cloud account's stored label (FR-016) and editable,
  and MUST be changed if already used on this device (FR-003). The person MUST choose a local
  password for that profile during setup, following FR-004; the profile then unlocks with that
  local password like any other, including offline.
- **FR-020**: A person MUST be able to unlink a cloud account from a profile, keeping all local data;
  the cloud account and its data MUST NOT be deleted by unlinking.
- **FR-021**: Cloud sign-in MUST reject a wrong email/password with one generic message that
  doesn't reveal whether the account exists. Cloud account creation MUST say when the email is
  already in use.
- **FR-022**: Cloud actions attempted offline MUST fail with a PT-BR message saying a connection is
  needed, without affecting local features.

**Password recovery**

- **FR-023**: A person MUST be able to reset a forgotten cloud account password by requesting a code
  by email (entering the account's email), typing the code into the app, and choosing a new
  password — without following a link out of the app.
- **FR-024**: A reset request MUST produce the same visible response whether or not a matching
  account exists, and whether or not it uses a password.
- **FR-025**: Reset codes MUST be single-use and expire after a limited time; a wrong or expired code
  MUST be rejected with a PT-BR message and allow requesting a new one.
- **FR-026**: A forgotten local profile password MUST be recoverable with all data intact: for a
  profile with a linked cloud account, by signing in to that cloud account and setting a new local
  password; for a profile without one, by anyone on the device after an explicit PT-BR warning that
  the password can be reset this way, then setting a new password.

**Color identity**

- **FR-027**: Each profile MUST have its own color identity. On linking a cloud account, a color
  identity already saved on the cloud account MUST win over the profile's; if the cloud account has
  none, the profile's color identity MUST be saved to it. The username label (FR-016) follows the
  opposite direction: linking an existing profile keeps that profile's local username and saves it
  to the cloud account as the label, so a device's existing profile is never renamed by linking.

**Errors and forms**

- **FR-028**: Every message shown in profile and account flows MUST be in PT-BR (Principle II).
  Recognized backend errors MUST be mapped to specific PT-BR messages; unrecognized ones MUST fall
  back to a generic PT-BR message, never raw backend text.
- **FR-029**: Forms MUST prevent a second submission while one is in progress, clear errors when
  switching between forms, and reset fully when dismissed.
- **FR-030**: The app MUST always show which profile is active (or that none is) and whether it has
  a linked cloud account.
- **FR-031**: The existing account page (`/profile`: change username, change password, delete
  account) MUST be unavailable: no navigation entry leads to it, and visiting it directly lands on
  the home page instead. Every action this spec requires (profile deletion, unlinking, password
  recovery) MUST be reachable without it.

### Key Entities

- **Local profile**: a person's identity on one device — username (unique per device), password
  (only verifiable, never readable), color identity, and optionally a link to one cloud account.
  Owns that person's cards, storage locations, and decks on the device.
- **Cloud account**: an optional online identity used for sync — email (unique across all
  accounts), password and/or Google identity, saved color identity, and a profile-name label (the
  linked profile's username; not unique, not used to sign in). Can be linked to one
  profile per device, on any number of devices.
- **Owned data** (cards, storage locations, decks): unchanged in shape, but now always belonging to
  exactly one local profile.
- **Password reset code**: a short-lived, single-use code emailed to a cloud account for resetting
  its password.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new person can go from opening the app to adding their first card, including
  creating a profile, in under 60 seconds, with no network connection.
- **SC-002**: 0 items of one profile's data are ever visible while another profile is active, or
  while no profile is active.
- **SC-003**: Switching between two profiles on the same device takes under 10 seconds, including
  entering the password.
- **SC-004**: A person can link a profile to a cloud account (email or Google) and see its data on a
  second device in under 3 minutes.
- **SC-005**: A person who forgot their cloud password can set a new one and sign in within 5
  minutes of requesting a code, without leaving the app except to read the email.
- **SC-006**: 100% of error messages in profile and account flows are in PT-BR; none show raw
  technical or backend text.
- **SC-007**: Every area that doesn't touch owned-card data opens with no profile prompt.

## Assumptions

- This feature ships to a clean start: all existing local and cloud data from earlier versions will
  be wiped before first use, so the app is not required to detect, move, or preserve data created
  before profiles existed, nor cloud sessions signed in before profiles existed.
- The sign-in/sign-up UI is being redesigned in parallel; this spec captures behavior only.
  Layout and visual decisions belong in this feature's `ui.md`, produced by `/speckit-plan`.
- The existing per-item "most recent change wins" sync behavior is reused unchanged for keeping a
  profile and its cloud account in step; sync remains manually triggered.
- Profile-level locking is a privacy convenience between people sharing a device, not protection
  against someone with access to the device — which is why a profile without a cloud account can be
  reset by anyone on the device (FR-026) and why every profile's username is listed to anyone
  using the device (FR-007).
- No limit is placed on the number of profiles per device; at least 10 must work without issue.
- Repeated wrong local passwords are not rate-limited or locked out; cloud sign-in relies on the
  cloud provider's own rate limiting.
- The Home page's content depends on owned data, so it follows FR-001; the About page is the only
  current profile-free area.
- Cloud account email confirmation stays disabled (as today); the emailed reset code requires a
  working outbound email service capable of reaching any address.
- Account-management actions from the old `/profile` page (renaming a profile, changing a local or
  cloud password while signed in, deleting a cloud account) are out of scope; the page is hidden
  (FR-031) and will be re-specified against this spec's model in a follow-up spec.
