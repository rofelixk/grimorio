# Feature Specification: Sign-In / Sign-Up (Auth Modal)

**Feature Branch**: `001-auth-modal`

**Created**: 2026-09-23

**Status**: Draft (retrofitted from existing implementation)

**Input**: User description: "Retrofit a baseline specification for the sign-up/sign-in modal
feature, which already exists in the codebase — describe existing sign-in/sign-up/sign-out
behavior, the optional nature of auth, and error states as user-facing requirements."

> This spec documents behavior that already ships in the product (`AuthService`, `AuthControl`,
> `AuthModal`, the `/profile` route). It exists to establish a requirements baseline retroactively,
> so future changes to this area go through `/speckit-plan`/`/speckit-tasks` against a real spec
> instead of ad hoc edits.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account (Priority: P1)

A signed-out visitor who wants to save their collection data to their own account, across devices,
creates an account with an email, a password, and an optional display username.

**Why this priority**: account creation is the entry point for every other authenticated capability
(sync, cross-device continuity); without it nothing else in this feature is reachable.

**Independent Test**: from a signed-out state, open the sign-up form, submit a new email/password
(and optionally a username), and verify the visitor is signed in immediately afterward with no
separate confirmation step.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor with no existing account, **When** they submit sign-up with a
   valid email and password, **Then** an account is created and they are immediately signed in
   (no email-confirmation step is required first).
2. **Given** a signed-out visitor submitting sign-up, **When** they also provide a username,
   **Then** the account is created with that username as its display name.
3. **Given** a signed-out visitor submitting sign-up, **When** the email or the username they
   chose is already associated with another account, **Then** sign-up is rejected with a message
   identifying which one is already in use, in the same language as the rest of the form, and the
   account is not created.
4. **Given** a signed-out visitor submitting sign-up, **When** they leave the email or password
   field empty, **Then** the form is rejected locally with a message asking for both, and no
   network request is made.

---

### User Story 2 - Sign in to an existing account (Priority: P1)

A visitor with an existing account signs back in using either their email or their username, plus
their password, to resume access to their account's data.

**Why this priority**: equally load-bearing as account creation — without sign-in, an account is a
one-time-use artifact rather than something a returning visitor can rely on.

**Independent Test**: from a signed-out state, submit valid credentials for an existing account
(by email, then separately by username) and verify the visitor ends up signed in both times.

**Acceptance Scenarios**:

1. **Given** a visitor with an existing account, **When** they sign in with their email and correct
   password, **Then** they are signed in.
2. **Given** a visitor with an existing account that has a username set, **When** they sign in with
   their username and correct password instead of their email, **Then** they are signed in exactly
   as if they'd used their email.
3. **Given** a visitor attempting sign-in, **When** the password is wrong (for either an email or a
   username identifier), **Then** sign-in is rejected with the same generic invalid-credentials
   message in both cases — the system does not reveal whether the identifier itself was recognized.
4. **Given** a visitor attempting sign-in, **When** they leave the identifier or password field
   empty, **Then** the form is rejected locally with a message asking for both, and no network
   request is made.

---

### User Story 3 - Sign out (Priority: P2)

A signed-in visitor ends their session from any page, returning the app to a fully-usable
signed-out state.

**Why this priority**: necessary for shared/public devices and for switching accounts, but lower
risk/impact than getting in and staying in.

**Independent Test**: while signed in, trigger sign-out from the nav bar and verify the visitor is
returned to a signed-out state without navigating away from their current page.

**Acceptance Scenarios**:

1. **Given** a signed-in visitor, **When** they choose "Sign out," **Then** their session ends and
   the nav bar reflects a signed-out state.
2. **Given** a signed-in visitor on the `/profile` page, **When** they sign out, **Then** they no
   longer have access to `/profile` on a subsequent visit until they sign in again.

---

### User Story 4 - Use the app fully while signed out (Priority: P1)

A visitor who never creates an account can still use every collection/deck-tracking capability of
the app; only the account-specific profile area is unavailable to them.

**Why this priority**: this is a stated product commitment (auth is optional, not a gate) — a
regression here would break the app's core "no forced account" promise for the entire signed-out
audience.

**Independent Test**: without signing in, perform core actions (view/manage collection, storage
locations, decks) and verify none of them are blocked or degraded; then attempt to navigate directly
to `/profile` and verify it redirects to the home page instead of the profile content.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they use collection, storage-location, or deck
   management features, **Then** none of those features are restricted or altered by the absence of
   a session.
2. **Given** a signed-out visitor, **When** they navigate directly to `/profile`, **Then** they are
   redirected to the home page rather than shown profile content.

---

### User Story 5 - Choose a color identity at sign-up (Priority: P3)

A visitor creating an account may optionally pick a color identity (one to three MTG colors) that
personalizes their account's visual theme, carried with them across devices once signed in.

**Why this priority**: personalization, not core access — sign-up, sign-in, and sign-out all remain
fully usable without ever touching this, making it the lowest-priority independently-testable slice.

**Independent Test**: on the sign-up form, pick a color identity before submitting, complete sign-up,
and verify the choice is restored as the account's identity color on a later sign-in (e.g. a
different session) rather than reset to the app's default.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor filling out the sign-up form, **When** they pick a color identity
   before submitting, **Then** the modal's own accent visually reflects that pick immediately, before
   the account is even created.
2. **Given** a signed-out visitor who picked a color identity during sign-up, **When** sign-up
   completes, **Then** that color identity is saved to their new account.
3. **Given** a visitor with a previously saved color identity, **When** they sign in in a new
   session, **Then** their saved color identity is restored rather than falling back to the app's
   default.
4. **Given** a signed-out visitor filling out the sign-up form, **When** they submit without picking
   a color identity, **Then** the account is created successfully with no identity color saved,
   defaulting to the app's standard look.

---

### Edge Cases

- What happens when a visitor submits the sign-up form twice in quick succession (double-click)?
  The form MUST prevent a second concurrent submission while one is already in flight.
- What happens when sign-in/sign-up fails for a reason other than validation (e.g. the backend is
  unreachable)? The visitor MUST see a generic, non-technical error message rather than a raw
  error or a silently stuck form.
- What happens when a visitor switches between the sign-in and sign-up forms mid-entry? Any
  in-progress error message MUST clear, since it no longer applies to the newly selected mode.
- What happens when the modal is dismissed (closed without submitting)? All entered fields
  (identifier, username, password, error state) MUST reset, so reopening the modal always starts
  from a clean form rather than leaking a previous attempt's state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a signed-out visitor create an account with an email and a password.
- **FR-002**: System MUST let a visitor optionally set a username at sign-up, which becomes their
  display name in place of their email wherever the app shows a short label for the account.
- **FR-003**: System MUST sign a visitor in immediately upon successful sign-up, without requiring
  a separate email-confirmation step.
- **FR-004**: System MUST reject a sign-up attempt whose email or username is already associated
  with another account, communicating which one is taken rather than a generic failure — both cases
  MUST be treated identically (same language, same clarity), per Principle II's requirement that
  user-facing text be localized regardless of whether the underlying error originates from the app
  or a dependency.
- **FR-005**: System MUST let a visitor sign in using either their account's email or their
  username, combined with their password.
- **FR-006**: System MUST reject sign-in with an invalid identifier/password combination using one
  consistent, generic message that does not disclose whether the identifier was a recognized
  account.
- **FR-007**: System MUST let a signed-in visitor sign out from anywhere in the app, without forcing
  navigation to a specific page to do so.
- **FR-008**: Per Principle IV (Local-First, Account-Optional), this feature MUST NOT introduce any
  new gating on collection, storage-location, or deck management capability — the only gate this
  feature adds is the one stated in FR-009.
- **FR-009**: System MUST restrict the `/profile` page to signed-in visitors, redirecting a
  signed-out visitor who navigates there directly to the home page instead.
- **FR-010**: System MUST validate that both required fields (identifier/email and password; email
  and password at minimum for sign-up) are filled before attempting a sign-in or sign-up request,
  surfacing a message locally without making a network request when they are not.
- **FR-011**: System MUST show a clear, non-technical error message when a sign-in or sign-up
  attempt fails for any reason, and MUST NOT leave the form in a stuck or ambiguous state.
- **FR-012**: System MUST prevent submitting a second sign-in/sign-up request while one is already
  in progress for the same form.
- **FR-013**: System MUST reset all entered form state (fields and error message) when the sign-in/
  sign-up modal is closed, so it always reopens blank.
- **FR-014**: System MUST reflect the visitor's current session state (signed in vs. signed out) in
  the navigation bar at all times, including immediately after sign-in, sign-out, or sign-up.
- **FR-015**: System MUST let a visitor optionally choose a color identity (one to three colors)
  while signing up, and MUST save that choice to the new account when one is made.
- **FR-016**: System MUST visually reflect a visitor's chosen color identity on the sign-up/sign-in
  modal itself as they pick it, and MUST restore a previously saved color identity on sign-in.
- **FR-017**: System MUST allow sign-up to complete successfully when no color identity is chosen,
  leaving the account without one rather than forcing a choice.

### Key Entities

- **Account**: a visitor's credentials and identity — email (required, used for authentication),
  password (required), username (optional, unique across accounts, used as an alternate sign-in
  identifier and as the account's display name when set), color identity (optional, one to three
  colors, personalizes the account's visual theme).
- **Session**: the live signed-in/signed-out state for the current visitor, which every other part
  of the app (nav bar, `/profile` access) reads and reacts to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can go from an empty sign-up form to a signed-in state in under 30
  seconds under normal conditions, with no extra confirmation step outside the app.
- **SC-002**: 100% of failed sign-in/sign-up attempts (validation, taken username, wrong
  credentials, or backend failure) leave the visitor with a specific, readable message and a form
  they can immediately retry — never a silent failure or a raw technical error.
- **SC-003**: A signed-out visitor can complete core collection/deck-tracking tasks with zero
  friction attributable to the absence of an account — no capability outside `/profile` prompts for
  or requires sign-in.
- **SC-004**: 100% of direct, unauthenticated attempts to reach `/profile` are redirected away from
  it rather than exposing any profile content.
- **SC-005**: A visitor who saved a color identity at sign-up sees it applied on every subsequent
  sign-in, with no manual re-selection required.

## Assumptions

- This spec covers sign-up, sign-in, sign-out, and the optional/gated boundary of auth in the app.
  Password change, username change, and account deletion are related but separate capabilities
  already present in the codebase (`AuthService.updatePassword`/`updateUsername`/`deleteAccount`)
  and are treated as out of scope here — a follow-up spec should cover the `/profile` account-
  management surface on its own.
- "Confirm email" is assumed to stay disabled for the scope of this spec (sign-up grants an
  immediate session); re-enabling it is a future, separately-specified change, not covered by these
  requirements.
- Visitors are assumed to have a stable connection when submitting the form; offline submission
  behavior is covered by the generic failure-message requirement (FR-011) rather than a dedicated
  offline flow.
- The existing `/profile` route and its `authGuard` are treated as the current, correct scope
  boundary for "signed-in only" content — no other route is assumed to require a session.
- PT-BR localization (Principle II) is only required in this spec for the error surfaces named in
  its acceptance scenarios (FR-004, FR-006, FR-011) — whether every other `AuthService` error
  surface (`signIn`'s underlying failures, `updatePassword`, `deleteAccount`, etc.) must also be
  localized is an open compliance question deferred to a separate pass, not decided by this spec.
- This spec does not address data isolation between different accounts using the same browser/
  device (e.g. a shared computer) — sign-out here only ends the Supabase session and does not
  clear or partition local IndexedDB data. That gap, and a proposed local-profile-based fix, are
  deferred to a separate future spec; this spec's User Story 3 should not be read as implying
  sign-out is a data boundary.
