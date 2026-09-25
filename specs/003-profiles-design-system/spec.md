# Feature Specification: Profiles, Accounts and the New Design System

**Feature Branch**: `003-profiles-design-system`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Rebuild of Grimorio's entry experience and design foundation: local
profiles, optional cloud accounts, and the new design system. Spec 003, superseding specs 001 and
002. This is a from-scratch redo of the app, not an incremental change. Existing styling,
components, services, routes and behavior are legacy; their conflicting with this spec, breaking,
or needing replacement or removal is never a reason to reduce scope, add compatibility
requirements, or preserve old behavior. Scope source: everything in design_handoff_auth_profiles/
(DESIGN.md → tokens.css → STATES.md → README.md → prototype/), plus every requirement and
clarification from spec 002. Where the handoff and spec 002 disagree, the handoff wins, except
FR-010 (delete profile) and FR-029 (always show active profile and link state) stay required.
Behavior only; visuals referenced to DESIGN.md. Mark as NEEDS CLARIFICATION only the delete-profile
flow, the app-shell indicator, and success/warning colors. Keep the WotC fan-content note."

> Supersedes `specs/001-auth-modal/spec.md` and `specs/002-profiles-accounts/spec.md`. Requirement
> and story numbers continue spec 002's, because the design handoff references them; new items are
> numbered after the last existing one.

## Scope and sources *(context)*

- **Scope source**: `design_handoff_auth_profiles/`, in precedence order: `DESIGN.md` →
  `tokens.css` → `STATES.md` → `README.md` → `prototype/` (reference only). `STATES.md` is the
  exhaustive list of screens ("phases"), contexts, fields, busy labels, bottom prompts, color
  sources, success screens and errors; each of its rows is a required case of this spec, including
  its exact PT-BR copy.
- **Design source of truth**: the repository's root `DESIGN.md`, which the handoff's `DESIGN.md`
  replaces while keeping the root's Wizards of the Coast fan-content compliance note for
  tribe/guild names. Visual and layout rules are referenced there, never restated here.
- **Legacy**: everything that exists today (the previous sign-in modal and control, account and
  theme handling, all current styles and component styles, current local data and sessions) is
  legacy. Replacing, breaking or removing any of it is expected and never limits this spec.

## Clarifications

### Session 2026-09-24 (inherited from spec 002)

- Q: How does someone get back into a local-only profile if they forget its password? → A: Anyone
  on the device can reset it after an explicit warning.
- Q: When linking to a cloud account that already holds data, merge or choose? → A: Merge
  automatically, per item, most recent change wins.
- Q: Does a profile set up from a cloud sign-in on a new device need its own local password? →
  A: Yes.
- Q: Should pre-profile data be moved into the first profile? → A: No — clean start.
- Q: Do cloud accounts have usernames? → A: No; they sign in by e-mail + password, and store the
  profile's name as a plain label.
- Q: What happens to the old `/profile` page? → A: Hidden until a follow-up spec rebuilds it.
- Q: How is a profile picked? → A: From a list of every profile on the device, then its password.
- Q: Where does a new device's profile name come from? → A: The cloud account's stored label,
  pre-filled and editable.
- Q: Does switching away end a profile's cloud sign-in? → A: No; each profile keeps its own.
- Q: Is Home gated? → A: No; it stays open and shows no owned-card data.
- Q: Google sign-in? → A: Out of scope.
- Q: When does sync run? → A: Automatically (link, new-device setup, unlock, within 1 minute of a
  local change while online) plus manually.
- Q: E-mail confirmation on cloud sign-up? → A: Off; the risk is accepted.

### Session 2026-09-24 (handoff-driven changes to spec 002)

- Every profile always has a color identity of 1–3 colors, chosen when it is created; spec 002's
  "profile without a color identity" case no longer exists.
- Switching forms clears errors and password/code fields but keeps the typed e-mail; closing the
  modal still resets everything.

### Session 2026-09-24 (spec 003)

- Q: Where is a profile deleted? → A: Nowhere in this feature — profile deletion (former FR-010 /
  User Story 7) moves to the follow-up account-management spec.
- Q: What does the app shell show for the active profile? → A: A temporary, unstyled button in the
  nav bar showing the active profile (or that none is) and whether it is linked; clicking it opens
  the new auth modal. Its final design is left to a later spec.
- Q: With the button only opening the modal, how are linking an existing profile, unlinking and
  manual sync reached? → A: Through the temporary button: with no active profile it opens the
  profile list; with an active profile it opens a small, unstyled, temporary menu — "Trocar perfil",
  "Conta na nuvem" (link screens if not linked, unlink if linked) and "Sincronizar agora".
- Q: How far should spec 003 go in moving existing screens onto the new design system? → A:
  Foundation only — the new tokens and base styles replace the legacy global ones app-wide and the
  legacy global rules/tokens are deleted; existing components keep their own stylesheets, unadapted,
  until later specs redesign them — they are not required to stay readable or usable.
- Q: If the profile modal opened by a gated page is closed without choosing a profile, where does
  the person end up? → A: On the page they were on before; if they arrived directly (link or
  reload), on Home.
- Q: Where does the temporary profile button live, given the legacy nav bar may break? → A: In a
  thin new app-shell top bar built in this spec, holding only the "Grimorio" wordmark and the
  temporary button; the legacy nav drawer stays below it and may break.
- Q: Define success and warning colors now? → A: No — this feature uses no success/warning styling;
  warnings are plain text on an info plate and success uses the role-accent sync dot.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a local profile and use the app (Priority: P1)

A person on a device wants to start tracking their cards. They create a local profile — name,
password and a color identity of up to three Magic colors — with no e-mail and no internet, and the
whole app immediately takes on their colors.

**Why this priority**: every core feature sits behind a local profile (Principle IV).

**Independent Test**: on a device with no profiles and no network, create a profile with two
colors, reopen the app, and verify the profile is still active, gated pages are reachable, and the
app is tinted with the chosen colors.

**Acceptance Scenarios**:

1. **Given** a device with no profiles, **When** the person opens any core feature, **Then** the
   modal opens in the *device* context on "Criar perfil", and they return to where they were headed
   once the profile exists.
2. **Given** the "Criar perfil" screen, **When** the person enters a valid name and password,
   picks colors and submits while offline, **Then** the profile is created, becomes active, and the
   "Perfil criado" success screen offers an optional "Vincular conta na nuvem".
3. **Given** the identity picker, **When** the person picks colors, **Then** at most 3 can be picked,
   at least 1 always stays picked, pick order sets primary/accent/tertiary, and the modal retints
   live to the picks while showing the matching tribe name and color names.
4. **Given** the "Criar perfil" screen, **When** the name breaks a rule (3–20 characters; letters,
   digits, `_`, `.`, `-`), is already used on the device (case-insensitive), or the password is
   shorter than 8 characters, **Then** the matching field error from `STATES.md` is shown and no
   profile is created.
5. **Given** an active profile, **When** the app is closed and reopened, **Then** the same profile is
   still active without re-entering the password.

---

### User Story 2 - Share a device between several people (Priority: P1)

Several players share one device. Each has their own profile, data and colors; they pick their
profile from a list, unlock it, switch and sign out.

**Why this priority**: multi-person devices are why local profiles exist.

**Independent Test**: create two profiles with different colors, seed each with different owned
data at the data level (not through legacy screens), switch between them via the list, and verify
each exposes only its own data and colors, and that signing out hides both.

**Acceptance Scenarios**:

1. **Given** profiles exist and none is active, **When** the modal opens in the *gate* context,
   **Then** it lists every profile on the device (name, mini color wheel, tribe name, and "Vinculado
   à nuvem" or "Só neste aparelho") plus a "+ Criar novo perfil" row, tinted with the default
   identity.
2. **Given** the profile list, **When** the person hovers or focuses a row, **Then** the whole modal
   retints to that profile's colors; leaving the list (not a single row) restores the previous
   colors without flicker, and the create row clears the preview.
3. **Given** a selected profile, **When** the correct password is entered, **Then** that profile
   becomes active and the success screen reads "Perfil desbloqueado" — or "Perfil trocado", stating
   the previous profile's data is now hidden, when switching.
4. **Given** a selected profile, **When** the password is wrong, **Then** "Senha incorreta." is
   shown and no profile data becomes visible.
5. **Given** an active profile, **When** the list opens, **Then** the active profile is listed first,
   marked "Em uso", cannot be picked, and a "Sair de {P}" action is offered below the list.
6. **Given** an active profile, **When** the person signs out of it, **Then** no profile is active,
   the modal returns to the default identity, and the list shows the notice that the profile's data
   was hidden.
7. **Given** any screen, **When** the person looks at the new top bar, **Then** a temporary button
   shows the active profile's name and whether it is linked (or that no profile is active); clicking
   it opens the profile list when no profile is active, or the temporary menu when one is.
8. **Given** profile A (linked) and profile B (not linked), **When** B is active, **Then** nothing
   syncs with A's cloud account; **When** A is unlocked again later, **Then** it syncs without a new
   cloud sign-in.

---

### User Story 3 - Use profile-free areas without any profile (Priority: P2)

A person uses areas that don't touch owned-card data — Home, About, and future gameplay tools —
without creating or unlocking a profile.

**Why this priority**: required by Principle IV; ensures the profile gate never covers them.

**Independent Test**: with no active profile, open Home and About and verify neither asks for a
profile and both use the default identity.

**Acceptance Scenarios**:

1. **Given** no active profile, **When** the person opens Home, About, or any area that doesn't read
   or change owned-card data, **Then** it opens without any profile prompt, in the default identity.
2. **Given** no active profile, **When** the person opens a core feature, **Then** the modal opens
   in the *gate* context (or *device* if no profile exists).

---

### User Story 4 - Link a cloud account to sync a profile (Priority: P2)

A person with an active profile links it to a cloud account — new or existing — to back up their
data and use it on other devices; or brings a cloud-synced profile onto a new device.

**Why this priority**: sync is the reason cloud accounts exist; the app is fully usable without it.

**Independent Test**: link a profile to a new cloud account on device 1; on device 2 sign in with it,
set up the profile, and verify its data and colors arrive.

**Acceptance Scenarios**:

1. **Given** an active, unlinked profile, **When** the person opens "Conta na nuvem" from the
   temporary menu (or "Vincular conta na nuvem" on "Perfil criado") and creates a cloud account
   (*link* context, "Criar conta na nuvem") with a valid e-mail and password, **Then** it is created and
   linked, the profile's colors and name are saved to it, and the "Conta criada" screen shows the
   sync line until the first sync finishes.
2. **Given** an active, unlinked profile, **When** the person signs in to an existing cloud account,
   **Then** it is linked, data from both sides is merged (most recent change wins), and if the
   account had saved colors they replace the profile's, announced on the "Conta vinculada" screen
   with the tribe name and a ripple on each newly lit color.
3. **Given** cloud sign-in, **When** the e-mail or password is wrong, **Then** only "E-mail ou senha
   incorretos." is shown, never revealing whether the account exists.
4. **Given** cloud sign-up, **When** the e-mail is already in use, **Then** "Esse e-mail já está em
   uso." is shown with a "É seu? Recupere o acesso" link into the password-reset flow.
5. **Given** a device where no profile is linked to the account, **When** the person signs in from
   the *device* or *gate* context, **Then** a "Configurar perfil" screen shows the account's e-mail,
   the profile name pre-filled from the account's label (editable, must be unique on the device) and
   a new local password; on submit the profile is created, linked, active, tinted with the account's
   colors, and the "Perfil pronto" screen shows "Baixando sua coleção…" until "Coleção baixada".
6. **Given** a cloud account already linked to another profile on this device, **When** someone tries
   to link it again, **Then** "Essa conta já está vinculada ao perfil {nome} neste aparelho." is shown.
7. **Given** a linked profile, **When** the person opens "Conta na nuvem" from the temporary menu,
   unlinks and confirms, **Then** the profile keeps all local data and stops syncing; the cloud
   account and its data are not deleted.
8. **Given** a linked profile, **When** the person chooses "Sincronizar agora", **Then** a sync runs
   immediately and its progress and result are shown.
9. **Given** a linked profile whose cloud sign-in has expired, **When** the person next opens
   "Conta na nuvem" or "Sincronizar agora", **Then** the modal opens on "Entre de novo", which asks for the
   account password and, once signed in, sends pending changes ("Sincronização retomada").
10. **Given** a linked, online profile, **When** the person changes a card, **Then** the change reaches
   the cloud account within 1 minute with no manual action.
11. **Given** no connection, **When** any cloud action is attempted, **Then** the offline message is
    shown and every local feature keeps working.

---

### User Story 5 - Recover a forgotten cloud account password (Priority: P3)

A person resets their cloud password with a 6-digit code emailed to them, typed into the app.

**Why this priority**: account continuity for the optional cloud tier.

**Independent Test**: request a code for an existing e-mail and for an unknown one (identical
responses), enter the code with a new password, and sign in with it.

**Acceptance Scenarios**:

1. **Given** "Recuperar senha", **When** an e-mail is submitted, **Then** the same confirmation is
   shown whether or not an account exists.
2. **Given** the code screen, **When** the correct 6-digit code and a valid new password are entered
   in time, **Then** the password changes and the person is signed in.
3. **Given** the code screen, **When** the code is malformed, wrong or expired, **Then** the matching
   code error is shown and a new code can be requested.
4. **Given** a code was just sent, **When** the person wants another, **Then** re-sending is blocked
   for 30 seconds with a live countdown, then offered again; "Usar outro e-mail" returns to the
   e-mail step keeping the flow's origin.
5. **Given** the reset flow, **When** the person chooses "Voltar", **Then** they return to the flow
   they came from.

---

### User Story 6 - Recover a forgotten local profile password (Priority: P3)

A person who forgot their profile's password gets back in with all data intact.

**Why this priority**: without a path, a forgotten password means losing a collection.

**Independent Test**: from the unlock screen, recover one linked and one unlinked profile, and verify
both unlock with data intact.

**Acceptance Scenarios**:

1. **Given** a linked profile's unlock screen, **When** the person chooses "Esqueci minha senha",
   **Then** "Recuperar perfil" asks for the linked account's password, then a new local password,
   and the profile unlocks with data intact.
2. **Given** an unlinked profile's unlock screen, **When** the person chooses "Esqueci minha senha",
   **Then** a warning states anyone on this device can reset it; after "Entendi, redefinir" they set
   a new password and the profile unlocks; "Cancelar" returns to unlock.

---

### User Story 8 - The app wears the active profile's colors (Priority: P1)

Everywhere in the app, the active profile's color identity tints the interface; with no active
profile, the app's default identity does.

**Why this priority**: the design system's core promise ("a dark tome, retinted by the player") and
the Default Rule, which also protects privacy between profiles.

**Independent Test**: with two profiles of different colors, verify the new top bar and every
modal screen retint on switch, and that with no active profile they use Vermelho → Azul → Verde.

**Acceptance Scenarios**:

1. **Given** an active profile, **When** any screen built in this spec is shown, **Then** it is tinted by that
   profile's roles (1st pick primary, 2nd accent, 3rd tertiary, unset roles falling back
   tertiary → accent → primary).
2. **Given** no active profile, **When** any screen built in this spec is shown, **Then** it uses the default identity
   Vermelho → Azul → Verde and never shows any profile's colors; the identity wheel stays neutral.
3. **Given** a person who prefers reduced motion, **When** any screen built in this spec is shown, **Then** all ring,
   halo, spark, ripple and name animations are off and everything stays legible.

---

### User Story 9 - One design foundation for the whole app (Priority: P2)

The new design system replaces the old styling across the app, so every existing and future screen
is built on the same foundation.

**Why this priority**: the auth flows are its first consumer, but the redo is app-wide.

**Independent Test**: open every existing screen and verify it renders on the new tokens and base
styles (page, surfaces, text, typography) and that no legacy global rule or token remains.

**Acceptance Scenarios**:

1. **Given** any screen, **When** it is shown, **Then** its page, surfaces, text and typography come
   from the new tokens and base styles defined by `DESIGN.md`.
2. **Given** an existing screen not redesigned yet, **When** the foundation replaces the legacy
   styling, **Then** no effort is made to preserve its appearance or usability; it waits for the
   later spec that redesigns it.

---

### Edge Cases

- Double submit: while a request runs the button is locked and relabelled ("Entrando…" etc.), so
  only one request/creation happens.
- An unrecognized backend failure shows "Algo deu errado. Tente de novo em instantes." and the form
  stays usable.
- Switching between forms clears errors and password/code fields, keeps the typed e-mail; closing
  the modal resets everything.
- A field error clears as soon as that field is edited.
- The profile modal opened by a gated page is closed without choosing a profile: the person stays
  where they were (or lands on Home if they arrived directly); the gated page never renders.
- A profile linked to the wrong cloud account by mistake: the merge has no undo; unlinking keeps the
  merged data on both sides.
- A linked profile's password is forgotten while offline: recovery needs a connection and waits.
- Someone registers a cloud account with an e-mail they don't own (confirmation is off): the real
  owner gets "e-mail in use" and can take it over through the reset flow (accepted risk).
- The cloud password is changed elsewhere: the profile keeps working locally and the next cloud
  action goes to "Entre de novo".
- The desktop modal changes height smoothly as content changes (errors, mode switches, success
  screens); it never jumps.

## Requirements *(mandatory)*

### Functional Requirements

**Local profiles**

- **FR-001**: System MUST require an active local profile to use any feature that reads or changes
  owned-card data (collection, cards, storage locations, decks) or color identity. Opening such a
  feature with no active profile MUST open the auth modal instead; if it is closed without a profile
  becoming active, the person MUST stay on the page they were on before, or land on Home if they
  arrived directly (link or reload), and no gated content is ever shown.
- **FR-002**: System MUST let a person create a local profile with a name, a password and a color
  identity, fully offline, without an e-mail address.
- **FR-003**: Profile names MUST be 3–20 characters, contain only letters, digits, `_`, `.`, or `-`,
  and be unique per device, compared case-insensitively.
- **FR-004**: Passwords (local profile and cloud account) MUST be at least 8 characters.
- **FR-005**: All field rules MUST be checked on submit before any request, with the field errors
  defined in `STATES.md`; a field's error MUST clear when that field is edited.
- **FR-006**: A device MUST support multiple profiles; each profile's cards, storage locations, decks
  and color identity MUST be visible and changeable only while that profile is active.
- **FR-007**: Picking a profile MUST show a list of every profile on the device (with its mini wheel,
  tribe name and link state), then require that profile's password. The active profile MUST stay
  active across restarts until signed out of or switched away from.
- **FR-008**: Signing out MUST leave no profile active, hide all profile data, return to the default
  identity, and show the sign-out notice in the profile list.
- **FR-009**: Local profile passwords MUST never be stored in a form that reveals them.
- **FR-010**: *(Deferred.)* Deleting a local profile is out of scope for this feature and moves to
  the follow-up account-management spec.
- **FR-031**: The profile list MUST put the active profile first, mark it "Em uso", make it
  unpickable, and offer "Sair de {P}"; hovering or focusing a row MUST retint the modal to that
  profile, restored when leaving the list as a whole.

**Profile-free areas**

- **FR-011**: Areas that don't read or change owned-card data or color identity (About; future
  gameplay tools) MUST be usable with no active profile.
- **FR-011a**: Home MUST NOT be gated and MUST NOT show owned-card data or links into core features.
- **FR-012**: With no active profile, the app MUST use the default identity Vermelho → Azul → Verde
  (the Default Rule).

**Cloud accounts**

- **FR-013**: Linking a cloud account MUST always be optional; no capability may require one.
- **FR-014**: A person with an active profile MUST be able to link it by creating a cloud account
  (e-mail + password) or signing in to an existing one (e-mail + password), from the temporary menu's
  "Conta na nuvem" or from the "Perfil criado" screen.
- **FR-015**: Cloud accounts MUST NOT have a sign-in username; they store the linked profile's name
  as a plain label (not unique, not usable to sign in). The app MUST display profile names, never
  e-mails, as the person's name.
- **FR-016**: Only the active profile's data MUST sync, only with its linked account. An account MUST
  be linked to at most one profile per device, and MAY be linked from multiple devices. Each profile
  MUST keep its own cloud sign-in across switching, sign-out and restarts until unlinked, or the
  sign-in expires or is revoked.
- **FR-016a**: A linked profile MUST sync automatically on link, on new-device setup, on unlock, and
  within 1 minute after a local change while online, and the person MUST be able to sync manually
  with "Sincronizar agora". Syncs that can't run MUST NOT block local use; pending changes sync at the next trigger. The sync
  line MUST show syncing and done states after link, account creation, unlock of a linked profile,
  setup and re-authentication.
- **FR-017**: Linking a profile to an account that already holds data MUST merge both sides per item,
  most recent change winning, with no confirmation step.
- **FR-018**: Signing in with a cloud account on a device with no profile linked to it MUST lead to
  profile setup: account e-mail shown, profile name pre-filled from the account label (editable,
  unique on the device), a new local password; the result is an active, linked profile filled with
  the account's synced data, unlockable offline with its local password.
- **FR-019**: A person MUST be able to unlink a cloud account from a profile, keeping all local data;
  the account and its data MUST NOT be deleted, and the confirmation MUST say so.
- **FR-020**: Cloud sign-in MUST reject wrong credentials with one generic message that doesn't
  reveal whether the account exists. Cloud sign-up MUST say when the e-mail is already in use and
  offer a path into password recovery.
- **FR-021**: Cloud actions attempted offline MUST fail with the offline message, without affecting
  local features. Local actions (create, unlock, local reset, setup's local step, unlink, sign out)
  MUST never need a connection.
- **FR-032**: When a linked profile's cloud sign-in has expired, automatic sync MUST pause without
  interrupting the person, and the next time they open "Conta na nuvem" or "Sincronizar agora" the
  modal MUST start on "Entre de novo", then resume syncing and send pending changes.
- **FR-033**: An account MUST NOT be linked to a second profile on the same device; the attempt MUST
  name the profile it's already linked to.

**Password recovery**

- **FR-022**: A person MUST be able to reset a cloud password by entering the account e-mail,
  receiving a 6-digit code by e-mail, and entering it with a new password in the app — no link.
- **FR-023**: A reset request MUST produce the same visible response whether or not an account exists.
- **FR-024**: Codes MUST be numeric, 6 digits, single-use and time-limited; wrong, malformed or
  expired codes MUST be rejected with the `STATES.md` messages. Re-sending MUST be blocked for 30
  seconds after each send, with a visible countdown.
- **FR-025**: A forgotten local password MUST be recoverable with data intact: for a linked profile,
  by signing in to its cloud account and setting a new local password; for an unlinked profile, by
  anyone on the device after an explicit warning, then setting a new password.

**Color identity**

- **FR-026**: Every profile MUST have its own color identity of 1–3 colors, chosen at creation with
  at least one always selected; pick order sets primary, accent and tertiary. On linking, colors
  already saved on the account MUST replace the profile's; otherwise the profile's colors MUST be
  saved to the account. Linking MUST keep the existing profile's name and save it as the account
  label.
- **FR-034**: Every color identity MUST be shown with its tribe name (per the table in `DESIGN.md`)
  and its color names, never by color alone.
- **FR-035**: Everything built in this spec, and the new base styles, MUST be tinted by the active
  profile's roles (or the default identity),
  with the modal additionally previewing the identity in view (picks, hovered profile, account
  colors) as defined in `STATES.md`.

**Errors, forms and content**

- **FR-027**: Every message MUST be in PT-BR, using the copy in `STATES.md` and `DESIGN.md`. Recognized
  backend errors MUST map to specific messages; unrecognized ones MUST fall back to the generic one,
  never raw backend text.
- **FR-028**: While a request runs, its button MUST be locked with its busy label. Switching forms MUST
  clear errors and password/code fields but keep the typed e-mail; closing the modal MUST reset all
  fields, errors and state.
- **FR-029**: A thin new top bar, built in this spec on the new foundation and always present, MUST
  hold only the "Grimorio" wordmark and a temporary, unstyled button that states which profile is
  active (or that none is) and whether it is linked to a cloud account. With no active profile,
  clicking it MUST open the auth modal on the profile list (*gate*, or *device* if the device has no
  profiles). With an active profile, it MUST open a small, unstyled, temporary menu: "Trocar perfil"
  (the profile list), "Conta na nuvem" (the *link* sign-in/create screens if not linked, the unlink
  screen if linked) and "Sincronizar agora" (only when linked). The button and menu are placeholders
  whose final design is out of scope and exempt from FR-039/FR-040. The legacy nav drawer is not part
  of this requirement and may break.
- **FR-030**: The old account page (`/profile`) MUST be unavailable: no navigation leads to it and
  visiting it lands on Home. Every action this spec requires MUST be reachable without it.

**Entry modal**

- **FR-036**: All profile and account flows MUST happen in one themed modal that opens in one of
  three contexts — *device* (no profiles on this device), *gate* (profiles exist; pick, unlock,
  switch, sign out), *link* (active profile opening cloud flows) — and MUST implement every phase,
  field, busy label, bottom prompt, color source, success screen and error listed in `STATES.md`.
- **FR-037**: Every success screen MUST end with "Concluir", which closes and resets the modal; the
  "Perfil criado" screen MUST also offer linking a cloud account.
- **FR-038**: The modal MUST be keyboard- and screen-reader-usable: focus stays inside it, form
  errors are announced as alerts, sync lines and notices as status, picker colors expose their
  pressed state and names, the active profile row is marked current, the close control is labelled
  "Fechar", and every field declares its autofill purpose (the code field is numeric).

**Design system**

- **FR-039**: A new design foundation defined by `DESIGN.md` (tokens, themed root, primitives: themed
  modal, identity wheel, mini wheel, identity chip, buttons, fields, info plates, list rows, sync
  line) MUST be the base for every screen in this feature. Its tokens and base styles MUST replace
  the legacy global styles and tokens app-wide, and the legacy global rules and tokens MUST be
  removed. Existing components keep their own stylesheets until later specs redesign them; they are
  not adapted to the new foundation, and losing their appearance or usability is acceptable.
- **FR-040**: Every interactive element MUST have at least a 44px touch target, and every decorative
  animation (ring, halo, spark, ripple, name blur-in) MUST stop when the person prefers reduced
  motion; the modal's height transition MAY remain.
- **FR-041**: Only the three roles may carry color in the interface chrome; identity colors appear
  directly only in swatches, pips and dots. This feature MUST NOT use success or warning colors
  (still undefined in `DESIGN.md`): warnings are plain text on an info plate, and success is shown
  with the role-accent sync dot.

### Key Entities

- **Local profile**: a person's identity on one device — name (unique per device), password (only
  verifiable), color identity (1–3 ordered colors), optional link to one cloud account (with its own
  cloud sign-in). Owns that person's cards, storage locations and decks on the device.
- **Cloud account**: optional online identity for sync — e-mail (unique), password, saved color
  identity, profile-name label. Linked to at most one profile per device, on any number of devices.
- **Color identity**: 1–3 of W/U/B/R/G in pick order, mapped to primary/accent/tertiary roles, with
  a tribe name. The default identity (R → U → G) belongs to no one.
- **Owned data** (cards, storage locations, decks): unchanged in shape, always belonging to exactly
  one profile.
- **Reset code**: 6-digit, single-use, time-limited, e-mailed to a cloud account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new person can go from opening the app to an active profile with colors in under 30
  seconds, offline.
- **SC-002**: 0 items of one profile's data, and 0 of its colors, are ever visible while another
  profile or no profile is active.
- **SC-003**: Switching profiles takes under 10 seconds, including the password.
- **SC-004**: A person can link a profile and see its data on a second device in under 3 minutes.
- **SC-005**: A person who forgot their cloud password can set a new one and sign in within 5
  minutes of requesting a code.
- **SC-006**: 100% of messages in profile and account flows match the PT-BR copy in `STATES.md`;
  none show raw technical text.
- **SC-007**: Home, About and every area not touching owned-card data open with no profile prompt.
- **SC-008**: 100% of the phases, success screens and errors in `STATES.md` are reachable and behave
  as listed, on both desktop and mobile layouts.
- **SC-009**: 100% of interactive elements meet the 44px touch target, and 0 decorative animations run
  under reduced motion.
- **SC-010**: 0 legacy global style rules remain, and no legacy token is declared in the global
  stylesheet; every screen renders on the new tokens and base styles. Legacy component stylesheets
  may still reference legacy tokens that no longer exist (US9-2).

## Assumptions

- Clean start: all local and cloud data is wiped before first use; no migration.
- The project is unreleased, so no real user is affected: only what this spec builds must work when
  it is complete. Legacy screens and components may break and are not used to verify this spec.
- The previous auth UI is preserved at git tag `auth-modal-v1`; nothing from it is carried over.
- The existing per-item "most recent change wins" sync rule is reused; only when sync runs is new.
- Profile locking is a privacy convenience between people sharing a device, not protection against
  someone with access to the device; hence local reset by anyone (FR-025) and the visible list (FR-007).
- No limit on profiles per device; at least 10 must work well.
- Wrong local passwords are not rate-limited; cloud sign-in relies on the provider's limits.
- Google or other third-party sign-in is out of scope.
- Cloud e-mail confirmation stays off; reset codes require an outbound e-mail service able to reach
  any address.
- Account management from the old `/profile` page (renaming, changing passwords while signed in,
  deleting a cloud account) and deleting a local profile (former FR-010 / User Story 7) are out of
  scope for a follow-up spec.
- Redesigning existing screens and components (collection, decks, import, card search, locations,
  nav drawer, etc.) onto the new design-system components is out of scope; they only move onto the
  new tokens and base styles (FR-039), and later specs redesign them one by one.
- Tribe and guild names are Wizards of the Coast terms; fan-content policy compliance must be
  confirmed before release.
- The prototype's simulated timings (≈0.7 s local, ≈1.1 s cloud, ≈2.2 s sync) are illustrative;
  real operations replace them.
