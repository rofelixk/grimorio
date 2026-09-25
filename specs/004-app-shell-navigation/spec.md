# Feature Specification: App Shell Navigation — Top Bar and Nav Bar

**Feature Branch**: `feature/004-app-shell-navigation`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "proper top bar with project home link, user sync status and active user profile indicator. on click the active user indicator should open the auth modal. there will be rework on that modal in a later spec but it is out of scope now. nav bar on the left side that links only to colleciton page as of now. proper handeling of mobile use for both top and nav bar"

## Clarifications

### Session 2026-09-25

- Q: How should navigation work on a phone? → A: A menu button at the left of the top bar opens the left nav as a drawer over the content.
- Q (added by the user): How should scrolling work? → A: The page itself never scrolls. The top bar stays fixed, and all content that needs scrolling lives in the view area below it.
- Q (added by the user): How does the nav bar behave on desktop? → A: Collapsed by default. It expands on hover, and a button in the nav bar pins it open.
- Q (added by the user): Should the nav bar link to Home? → A: No. The "Grimorio" wordmark in the top bar is the way to Home.
- Q (added by the user): Is a legal disclaimer needed? → A: Yes. A disclaimer covering Wizards of the Coast, Scryfall, and the use of AI in developing the app sits at the bottom of the view area. The WotC and Scryfall wording comes from the current About page.
- Q (added by the user): Should long profile names be truncated in the indicator? → A: No. The profile-name maximum drops from 20 to 16 characters, matching common gaming handles (PlayStation Online ID 16, X 15, Xbox gamertag 12). Names then always fit whole, so the indicator never truncates them.
- Q (added by the user): When does sync run? → A: Only when the person activates the sync area in the top bar. The earlier automatic sync (after data changes, on profile switch, and after modal flows) is removed. The area shows syncing (not clickable), synced (a recent success) or the time since the last sync. A profile without a cloud account gets a matching message.
- Q (added by the user): What happens if the person switches profile during a sync? → A: They can't. The profile indicator is locked while a sync runs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See who is using the app and reach the profile flows (Priority: P1)

On a device shared by several players, a person opens Grimorio and wants to know at a glance whose collection they are looking at. The top bar shows the active profile (its name and color identity). Tapping it opens the profile/account modal, where they can switch profiles, sign out, link a cloud account, and so on. With no active profile, the same spot invites them to sign in.

**Why this priority**: Profiles isolate each player's data. Showing who is signed in, and giving one obvious way to change that, is the most important job of the shell. It also replaces the temporary profile button from spec 003.

**Independent Test**: Can be fully tested by loading the app with and without an active profile, checking what the indicator shows, and tapping it to confirm that the profile/account modal opens.

**Acceptance Scenarios**:

1. **Given** an active local profile, **When** any screen is shown, **Then** the top bar shows that profile's name and its color identity, named in text as well as shown as color.
2. **Given** an active profile, **When** the person taps the profile indicator, **Then** the profile/account modal opens in its default state for an active profile (switch / sign out).
3. **Given** no active profile, **When** any screen is shown, **Then** the indicator shows a neutral "Entrar" prompt with no profile colors, and tapping it opens the modal at the profile list.
4. **Given** the modal was opened from the indicator, **When** the person switches profile or signs out, **Then** the indicator updates immediately to the new state, without a reload.

---

### User Story 2 - Navigate between Home and the collection (Priority: P1)

A person wants to get from any screen to their collection, and back to the start screen. The "Grimorio" wordmark in the top bar always leads Home. A navigation bar on the left side of the screen links to the collection, and shows which section is currently open. On desktop the nav bar sits collapsed so it takes little space. It expands while the pointer is over it, and a button pins it open for people who prefer it always expanded.

**Why this priority**: Without navigation the collection can only be reached by typing a URL. Together with Story 1, this is the minimum usable shell.

**Independent Test**: Can be fully tested on a wide screen: click the wordmark from any page (you land on Home). Hover the collapsed nav (it expands) and click "Coleção" (you land on the collection, and the link is marked as current). Then pin the nav, reload, and check that it is still pinned.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the person activates the "Grimorio" wordmark, **Then** they land on Home.
2. **Given** an active profile, **When** the person activates "Coleção" in the nav bar, **Then** the collection opens and "Coleção" is marked as the current section.
3. **Given** the person is on a page inside the collection (e.g. a location's detail or the import page), **When** the nav bar is shown, **Then** "Coleção" is still marked as the current section.
4. **Given** no active profile, **When** the person activates "Coleção", **Then** the existing profile gate applies: the profile modal opens, and the collection shows once a profile is active.
5. **Given** a wide screen and a person who has never pinned the nav, **When** any page is shown, **Then** the nav bar is collapsed: a narrow strip on the left that still shows where the collection destination and the current-section mark are.
6. **Given** a wide screen and a collapsed nav, **When** the pointer rests on it (or keyboard focus enters it), **Then** it expands to show full labels over the content, without shifting the content. It collapses again when the pointer or focus leaves.
7. **Given** a wide screen, **When** the person activates the pin button in the nav bar, **Then** the nav stays expanded beside the content (the content area narrows to make room, and nothing is covered). Activating the button again unpins it and returns it to collapsed.
8. **Given** the person pinned the nav, **When** they reload or come back later on the same device, **Then** it is still pinned.
9. **Given** any screen, **When** the nav bar is shown, **Then** it has no Home link. Home is reached only through the wordmark.

---

### User Story 3 - Sync my collection when I choose to (Priority: P2)

A person whose profile is linked to a cloud account decides when to sync. Nothing syncs by itself. The top bar has a sync area next to the profile indicator. Tapping it syncs, and the area shows how the sync went and how long ago the last one happened. For a profile without a cloud account, the area says so.

**Why this priority**: Sync is optional, so only linked profiles benefit. Making it explicit means the person always knows when data left the device, and never has a sync start while they're mid-sort.

**Independent Test**: Can be fully tested with a linked profile: make a change and confirm that nothing syncs. Tap the sync area and watch it go through syncing and synced, then show the time since the last sync. Switch to an unlinked profile and check its message.

**Acceptance Scenarios**:

1. **Given** a linked profile, **When** the person changes collection data, switches into the profile, unlocks it or links it, **Then** no sync starts on its own.
2. **Given** a linked profile and no sync running, **When** the person activates the sync area, **Then** a sync starts and the area shows "Sincronizando…" with an in-progress mark.
3. **Given** a sync is running, **When** the person tries to activate the sync area again, **Then** nothing happens. The area is visibly and accessibly unavailable until the sync ends.
4. **Given** a sync just succeeded, **When** the area is shown, **Then** it shows a synced state ("Sincronizado") for a short while, then changes to the time since the last sync ("Sincronizado há 5 min").
5. **Given** a linked profile that has synced before, **When** the app opens or the person switches into it, **Then** the area shows the time since its last successful sync. The time keeps updating while displayed.
6. **Given** a linked profile that has never synced, **When** the area is shown, **Then** it says so ("Nunca sincronizado"), inviting a tap.
7. **Given** the active profile has no cloud account, **When** the top bar is shown, **Then** the sync area shows a message saying the profile isn't connected to the cloud ("Sem conta na nuvem"). Activating it opens the profile modal where a cloud account can be linked.
8. **Given** a sync attempt fails because the device is offline, the cloud session expired, or another error occurred, **When** the area is shown, **Then** it shows a plain PT-BR message for that case, never raw backend text. For an expired session, activating the area opens the modal at the session-expired step. For the other cases, activating it retries.
9. **Given** no profile is active, **When** the top bar is shown, **Then** there is no sync area.

---

### User Story 4 - Use the shell comfortably on a phone (Priority: P2)

On a phone held in portrait, the person still needs the home link, their profile and sync status, and the collection link. Nothing may overflow, overlap or be too small to tap. The page content keeps most of the screen. A menu button at the left of the top bar opens the navigation as a drawer from the left.

**Why this priority**: Much collection work happens at the table or next to storage boxes, on a phone. The shell must not make that worse.

**Independent Test**: Can be fully tested at a narrow viewport (e.g. 360px wide): check that every shell control is reachable and at least 44px tall, that there is no horizontal scroll, and that the collection can be reached through the menu button in two taps.

**Acceptance Scenarios**:

1. **Given** a narrow screen, **When** any page is shown, **Then** the top bar fits on one row: the menu button, the wordmark, the sync area and the profile indicator. The profile indicator uses a compact form (a compact color mark plus the full name) instead of wrapping or overflowing.
2. **Given** a narrow screen, **When** the person taps the menu button and then "Coleção", **Then** the collection opens and the drawer closes.
3. **Given** a narrow screen, **When** the drawer is closed, **Then** the navigation takes no space from the page content.
4. **Given** a narrow screen and an open drawer, **When** the person picks a destination, taps outside the drawer, or presses Back/Escape, **Then** the drawer closes.
5. **Given** a narrow screen, **When** the nav is shown, **Then** there is no pin button. Pinning applies only on wide screens.

---

### User Story 5 - Scroll only the content, with the top bar always in reach (Priority: P2)

While browsing a long list (e.g. a large collection), a person scrolls down and still wants the profile indicator, sync status and home link at hand. The top bar never scrolls away. Only the view area below it scrolls.

**Why this priority**: A long collection is the normal case. Losing the shell when scrolling means scrolling back up just to switch profile or check sync.

**Independent Test**: Can be fully tested by opening a page taller than the screen, scrolling to the end, and checking that the top bar and the nav stay in place and the whole document never scrolls.

**Acceptance Scenarios**:

1. **Given** a page whose content is taller than the screen, **When** the person scrolls, **Then** only the view area below the top bar scrolls. The top bar stays in place and the whole page never scrolls.
2. **Given** a wide screen with the nav collapsed or pinned, **When** the view area scrolls, **Then** the nav stays in place.
3. **Given** a narrow screen, **When** the view area scrolls, **Then** the top bar stays in place and the address-bar behavior of the mobile browser does not make shell controls unreachable.

---

### User Story 6 - See the legal and attribution notice (Priority: P3)

Anyone using the app can find a short notice at the bottom of the view area. It says that Grimorio is unofficial fan content under Wizards of the Coast's Fan Content Policy and not endorsed by Wizards, that card data and images come from Scryfall, and that AI tools were used in developing the app.

**Why this priority**: It is a precaution for fan-content policy compliance and transparency. It doesn't change what people can do, but it needs to be present on every screen before release.

**Independent Test**: Can be fully tested by scrolling to the end of any page (Home, collection, a short page and a long page) and checking that the notice is there with its three parts and working links.

**Acceptance Scenarios**:

1. **Given** any page, **When** the person scrolls to the end of the view area, **Then** the notice is shown below the page content.
2. **Given** a page shorter than the screen, **When** it is shown, **Then** the notice sits at the bottom of the view area, not right under the short content.
3. **Given** the notice, **When** it is read, **Then** it covers: (a) the Wizards of the Coast fan content statement with a link to the Fan Content Policy, (b) the Scryfall attribution with a link to Scryfall, and (c) a statement that AI tools were used in developing the app.
4. **Given** the notice, **When** a link in it is activated, **Then** the link opens in a new tab and Grimorio stays open.

---

### Edge Cases

- A profile name at the 16-character maximum must show in full in the indicator at every width from 320px up, with no truncation.
- Someone typing a 17th character when creating a profile gets the same plain length error as any other out-of-range name. The name is never silently cut.
- Activating the sync area while a sync is running does nothing, and a second sync never starts.
- The app stays open across a long idle time: the "last synced" time keeps counting correctly (e.g. from "há 5 min" to "há 2 h"). The synced state still changes to last synced after 5 minutes, even if nothing else happens on screen.
- If the person taps the profile indicator while a sync is running, the profile modal does not open. The indicator is unavailable and its label says why (e.g. "Aguarde a sincronização terminar"). It becomes available again as soon as the sync ends, whether the sync succeeded or failed.
- If a sync stalls (e.g. the network drops mid-request), it must end in the error state within 60 seconds, so the person is never locked out of switching profile indefinitely.
- If the person activates "Coleção" while already on the collection, nothing changes and no error appears.
- While a modal is open (e.g. the profile modal opened by the profile gate), nothing behind it can be activated: the profile indicator, the sync area, the wordmark, the nav and page content are all out of reach, by pointer, touch and keyboard. A second modal can never be opened from behind the first.
- If the screen is resized or rotated across the phone/desktop breakpoint while the mobile drawer is open, the layout ends in the correct state for the new width, with no stray backdrop or stuck panel. A desktop pin choice made earlier still applies when the screen is wide again.
- A touch device with a wide screen (e.g. a tablet in landscape) has no hover. The collapsed nav must still be usable there: tapping it, or tapping the pin button, gives access to the labels.
- When a collapsed nav expands on hover, the content underneath must not jump or reflow. Moving the pointer quickly across the nav's edge must not make it flicker.
- If the browser cannot store the pin choice (private mode, blocked storage), the nav simply starts collapsed. Nothing breaks.
- A view that has its own inner scrolling area (e.g. a panel inside a page) still keeps the rule that the whole page never scrolls. The notice sits at the end of the view area, not inside a nested panel.
- With reduced motion, the nav's expand/collapse, the drawer and the syncing mark do not animate beyond what the reduced-motion rule allows.

## Requirements *(mandatory)*

### Functional Requirements

**Top bar**

- **FR-001**: The app MUST show one top bar above every screen, on every route.
- **FR-002**: The top bar MUST show the "Grimorio" wordmark as a link to Home, reachable by keyboard and at least 44px tall.
- **FR-003**: The top bar MUST show an active-profile indicator. With an active profile, it shows the profile's name and color identity: its colors plus a written name (tribe or color names), never color alone. With no active profile, it shows a neutral "Entrar" prompt and no profile colors.
- **FR-004**: Activating the profile indicator MUST open the existing profile/account modal. The modal opens at the step that fits the current state: switch/sign out when a profile is active, the profile list when none is. This spec does not change the modal's own content or flows.
- **FR-005**: The indicator MUST update right away when the active profile changes, the person signs out, or the profile's colors change.
- **FR-005a**: While a sync is running, the profile indicator MUST NOT be activatable, so the active profile can't be switched or signed out mid-sync. It MUST show that it is unavailable and expose that state, with the reason, to assistive technology. A running sync MUST end, successfully or in the error state, within 60 seconds.
- **FR-006**: Sync MUST run only when the person activates the sync area. Nothing else starts a sync: not data changes, a timer, switching into a profile, unlocking it, or the profile modal's link, set-up, unlock and session-renewal flows.
- **FR-007**: For an active profile linked to a cloud account, the sync area MUST show one of: **syncing** ("Sincronizando…", while a sync runs); **synced** ("Sincronizado", for 5 minutes after a successful sync); **last synced** (the time since the last successful sync, e.g. "Sincronizado há 5 min", which updates while displayed); **never synced** ("Nunca sincronizado"); or a failure state (offline, session expired, error) in plain PT-BR.
- **FR-008**: While a sync is running, the sync area MUST NOT be activatable, and it MUST expose that unavailable state to assistive technology. In every other state for a linked profile, activating it starts a sync. The exception is session expired, where activating it opens the profile modal at the session-expired step.
- **FR-009**: For an active profile without a cloud account, the sync area MUST show a message that the profile isn't connected to the cloud. Activating it MUST open the profile modal at the step for linking a cloud account. With no active profile, the sync area MUST NOT be shown.
- **FR-010**: The new top bar MUST replace the temporary profile button and its menu (from spec 003). Every action that menu offered MUST still be reachable, through the profile modal or the sync area. "Sincronizar agora" becomes the sync area itself.

**Nav bar**

- **FR-011**: The app MUST provide a navigation bar on the left side of the screen. For now it contains exactly one destination, "Coleção". It MUST NOT contain a link to Home, because the wordmark already does that.
- **FR-012**: The nav bar MUST mark the current section, both visually and for assistive technology, while the person is on the collection or any page inside it.
- **FR-013**: On wide screens, the nav bar MUST be collapsed by default: a narrow strip that stays visible and shows each destination and the current-section mark in compact form.
- **FR-014**: On wide screens, a collapsed nav MUST expand to show full labels while the pointer is over it or keyboard focus is inside it, and collapse again when both leave. A hover-expanded nav MUST overlay the content without shifting or reflowing it.
- **FR-015**: On wide screens, the nav bar MUST contain a pin button that keeps it expanded. When pinned, the nav sits beside the content (the content area narrows, and nothing is covered). The button MUST state what it will do ("Fixar menu" / "Recolher menu") and expose its pressed state to assistive technology.
- **FR-016**: The pin choice MUST be remembered on the device, across reloads and profile switches. It is a device preference, not per profile. If it can't be stored, the nav starts collapsed.
- **FR-017**: The nav bar MUST list only destinations that exist. Links from the older navigation (Decks, Sobre, the collection-filter panel) are removed from it.

**Mobile**

- **FR-018**: On narrow screens, the top bar MUST stay on one row with no horizontal scroll, in this order: a menu button at the left, the wordmark, the sync area (when a profile is active), and the profile indicator at the right. The profile indicator uses a compact form (a compact color mark plus the full name) instead of wrapping.
- **FR-018a**: On narrow screens, the sync area MUST use a compact form so it fits beside the other controls: a status mark plus the shortest meaningful text, e.g. "há 5 min" instead of "Sincronizado há 5 min". The full message stays available to assistive technology and on tap/focus.
- **FR-019**: On narrow screens, the menu button MUST open the nav as a drawer from the left, over the content. The nav takes no space while the drawer is closed, and any destination is reachable in two taps from any page. The menu button MUST have a text label for assistive technology and expose whether the drawer is open.
- **FR-020**: The drawer MUST close when a destination is chosen, when the person taps outside it, or when they press Escape/Back. While it is open, keyboard focus MUST stay inside it, and on close focus returns to the menu button.
- **FR-021**: On narrow screens the nav MUST NOT show the pin button and MUST NOT use the collapsed strip.
- **FR-022**: Every interactive shell element MUST be at least 44px tall on every width.

**Page layout and scrolling**

- **FR-023**: The document as a whole MUST never scroll, on any width. The top bar stays fixed at the top, the nav stays fixed at the left (wide screens), and the view area below the top bar fills the rest of the screen.
- **FR-024**: All page content that needs scrolling MUST scroll inside the view area. Scroll position resets to the top when the person moves to a different page.
- **FR-025**: On phones, the shell MUST fit the visible screen height, accounting for mobile browser bars appearing and disappearing, so the top bar is never pushed off screen.

**Disclaimer**

- **FR-026**: The view area MUST end with a notice on every page, below the page's own content. When the content is shorter than the view area, the notice sits at the bottom of the view area.
- **FR-027**: The notice MUST include: (a) the statement that Grimorio is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy, not approved or endorsed by Wizards, that portions of the materials used are property of Wizards of the Coast, and "©Wizards of the Coast LLC", with a link to the Fan Content Policy; (b) the attribution that card data and images come from Scryfall, with a link to Scryfall; (c) a statement that AI tools were used in developing the app.
- **FR-028**: The notice MUST be written in PT-BR and set quietly: small, muted text that doesn't compete with page content. Its links open in a new tab.
- **FR-029**: The notice text MUST come from one shared source, so the About page and the notice can't drift apart.

**Profile name length**

- **FR-033**: Creating a local profile MUST accept names of 3 to 16 characters. Every place that states or checks the limit MUST say "3 a 16": the field helper, the length error ("Use de 3 a 16 caracteres.") and the design system's content list. The allowed character set is unchanged.
- **FR-034**: A 16-character profile name MUST fit in the top-bar indicator without truncation at every width from 320px up, alongside the menu button, the wordmark and the sync area in its longest compact state.

**General**

- **FR-030a**: While any modal is open, every control behind it — the top bar, the nav (including a hover-expanded or pinned nav, and the mobile drawer) and the view area — MUST be unreachable by pointer, touch, keyboard and assistive technology. They become available again when the modal closes.
- **FR-030**: All shell text MUST be PT-BR and follow the project's content rules: no emoji, no icon library, no Magic symbols. The only glyphs used as text are those the design system allows. The menu button, the pin button and the collapsed nav's compact form therefore use text or glyphs that the design system approves (see FR-032).
- **FR-031**: Shell colors MUST come from the active profile's color identity, and fall back to the app's default identity when no profile is active.
- **FR-032**: The design system document MUST describe everything below before it is built, since UI the design system doesn't cover is undecided: the nav bar (collapsed, hover-expanded and pinned on desktop; drawer on mobile), the menu button, the pin button, the sync area with each of its states, the updated top bar, and the notice. The top bar entry changes from "identical at every width" to include the mobile menu button.

### Key Entities

- **Active profile**: the local profile currently in use. The shell reads its name, color identity, and whether it is linked to a cloud account.
- **Sync status**: the sync state of the active profile — whether it has a cloud account, whether a sync is running, the result of the last attempt, and the time of the last successful sync. The time is kept per profile across sessions.
- **Navigation destination**: a named section of the app, currently only "Coleção". It has a label and knows which pages count as "inside" it, for the current-section mark.
- **Nav pin preference**: a per-device yes/no choice of whether the desktop nav is pinned open. Default: not pinned.
- **Disclaimer notice**: the shared legal/attribution text (WotC fan content, Scryfall, AI usage) shown at the end of the view area and reused by the About page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any screen, a person can open the profile/account modal with 1 tap, and reach Home or the collection with at most 2 taps, on both phone and desktop.
- **SC-002**: At every viewport width from 320px up, no shell element overflows, overlaps another, or causes horizontal scrolling.
- **SC-003**: 100% of interactive shell elements are at least 44px tall, reachable by keyboard, and have a text label for assistive technology.
- **SC-004**: A change of active profile or sync state shows in the top bar within 1 second, without a reload.
- **SC-005**: Each sync-area state (syncing, synced, last synced, never synced, not connected, offline, session expired, error) is visually distinct and has a distinct written label. A first-time person can tell "synced" apart from "needs attention" without instructions.
- **SC-006**: On any page and any width, scrolling to the end never moves the top bar. The whole document has zero scroll, and all scrolling happens in the view area.
- **SC-007**: On a wide screen with the nav collapsed, hovering it never moves page content by even one pixel. When pinned, no page content is ever covered by the nav.
- **SC-008**: The disclaimer notice, with all three parts and working links, is present on 100% of pages.
- **SC-009**: A pinned nav is still pinned after a reload in 100% of cases where the browser allows storing preferences.
- **SC-010**: 100% of profile names created under the new rule show in full in the top bar at every width from 320px up.
- **SC-011**: No sync ever starts without the person activating the sync area. In a test session of data changes, profile switches and modal flows with no tap on the sync area, 0 syncs are made.

## Assumptions

- The profile/account modal from spec 003 is reused unchanged. Its planned rework is a separate, later spec.
- The collection is the only nav destination for now. Decks, Sobre and other existing pages stay reachable by URL but are not linked from the new nav. Per the project's unreleased-redo scope, legacy pages that relied on the old navigation (e.g. the collection-filter panel inside the old drawer) may lose that entry point. Legacy views that assumed the whole page scrolls may need small fixes to fit the new view area, but only as far as keeping them usable.
- Home stays ungated. The collection keeps its existing profile gate, and the nav does not duplicate that check.
- The existing sync engine (how data is reconciled with the cloud, the states it reports, the stored last-synced time) is reused. Its automatic triggers are removed: the scheduler that synced after changes and on profile switch, and the syncs that the profile modal starts after link, set-up, unlock and session renewal. As a result, a profile set up on a new device starts with an empty collection until the person taps the sync area. The modal's "sync line" (DESIGN.md) no longer applies to those flows. This is the only change this spec makes inside the modal.
- "Narrow" and "wide" use the project's existing mobile/wide breakpoints. Screens in between follow the narrow behavior (drawer) until the wide breakpoint.
- The WotC and Scryfall wording of the notice is taken from the current About page. There is no AI-usage text yet. A plain PT-BR sentence will be written for it (e.g. "Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial."), and the final wording is settled during planning.
- The notice goes in the view area, not in the top bar or the nav, and it scrolls with the content, so it takes no permanent screen space.
- The top-bar layout on wide screens (wordmark left; sync status and profile indicator right) follows the design system's current "App top bar" entry, which is updated as FR-032 describes.
