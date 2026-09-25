# Feature Specification: App Shell Navigation — Top Bar and Nav Bar

**Feature Branch**: `feature/004-app-shell-navigation`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "proper top bar with project home link, user sync status and active user profile indicator. on click the active user indicator should open the auth modal. there will be rework on that modal in a later spec but it is out of scope now. nav bar on the left side that links only to colleciton page as of now. proper handeling of mobile use for both top and nav bar"

## Clarifications

### Session 2026-09-25

- Q: How should navigation work on a phone? → A: A menu button in the top bar opens the nav as a drawer over the content. *Revised in design review (see the handoff entry below): the menu button sits at the right, and the drawer opens from the right.*
- Q (added by the user): How should scrolling work? → A: The page itself never scrolls. The top bar stays fixed, and all content that needs scrolling lives in the view area below it.
- Q (added by the user): How does the nav bar behave on desktop? → A: Collapsed by default. It expands on hover, and a button in the nav bar pins it open.
- Q (added by the user): Should the nav bar link to Home? → A: No. The "Grimorio" wordmark in the top bar is the way to Home.
- Q (added by the user): Is a legal disclaimer needed? → A: Yes. A disclaimer covering Wizards of the Coast, Scryfall, and the use of AI in developing the app sits at the bottom of the view area. The WotC and Scryfall wording comes from the current About page.
- Q (added by the user): Should long profile names be truncated in the indicator? → A: No. The profile-name maximum drops from 20 to 16 characters, matching common gaming handles (PlayStation Online ID 16, X 15, Xbox gamertag 12). Names then always fit whole, so they are never truncated.
- Q (added by the user): When does sync run? → A: Only when the person activates it: the sync area in the top bar on wide screens, or the sync action in the drawer on narrow screens. The earlier automatic sync (after data changes, on profile switch, and after modal flows) is removed. The status shows syncing (not clickable), synced (a recent success) or the time since the last sync. A profile without a cloud account gets a matching message.
- Q (added by the user): What happens if the person switches profile during a sync? → A: They can't. The profile control is locked while a sync runs.
- Q: Does a failed sync's state survive a reload or a profile switch? → A: No. Failure states last only for the current session. After a reload or a switch into the profile, the status shows the last-synced or never-synced state.
- Q: On narrow screens, what happens to the drawer when a drawer control opens the profile modal? → A: The drawer closes first, then the modal opens. When the modal closes, focus returns to "Menu". "Sincronizar agora" and "Tentar de novo" leave the drawer open.

### Design handoff 2026-09-25 (`design_handoff_app_shell_navigation/`)

- **Phone layout.** Design review deliberately chose: top bar = wordmark · sync mark · "Menu" (at the right). The drawer opens from the right and holds the account block (profile, full sync status and sync action) above the nav. On phones the profile is therefore reached in 2 taps, not 1, and the bar's sync mark is status only, not a button.
- **Identity display.** The profile control shows the identity-color dots plus the profile name, at every width. The tribe and color names are part of its accessible name but are not shown as visible text. The profile name is already visible text, and the tribe stays available to screen readers. This relaxes DESIGN.md's "identity is always named twice" for the shell, and DESIGN.md records the exception.
- **Status colors.** Healthy sync states are neutral. Only failures use the danger color. Identity colors never signal status.
- **Breakpoint.** The shell has one breakpoint, the existing wide breakpoint (960px). Below it is narrow.
- **Visual direction "Fio de luz".** Flowing identity-color bands (wordmark gradient, the top bar's bottom line, the nav's thread and wash) are adopted and must be added to DESIGN.md.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See who is using the app and reach the profile flows (Priority: P1)

On a device shared by several players, a person opens Grimorio and wants to know at a glance whose collection they are looking at. The profile control shows the active profile's color-identity dots and name. On wide screens it sits in the top bar. On narrow screens it sits at the top of the drawer. Tapping it opens the profile/account modal, where they can switch profiles, sign out, link a cloud account, and so on. With no active profile, the same spot invites them to sign in.

**Why this priority**: Profiles isolate each player's data. Showing who is signed in, and giving one obvious way to change that, is the most important job of the shell. It also replaces the temporary profile button from spec 003.

**Independent Test**: Can be fully tested by loading the app with and without an active profile at both widths, checking what the profile control shows, and tapping it to confirm that the profile/account modal opens.

**Acceptance Scenarios**:

1. **Given** an active local profile on a wide screen, **When** any screen is shown, **Then** the top bar shows the profile's identity-color dots (in pick order) and its name. Its accessible name also gives the tribe and color names, e.g. "Perfil rafa — Izzet · Azul · Vermelho. Trocar de perfil ou sair."
2. **Given** an active profile, **When** the person taps the profile control, **Then** the profile/account modal opens in its default state for an active profile (switch / sign out).
3. **Given** no active profile, **When** the top bar (wide) or the drawer (narrow) is shown, **Then** it shows an "Entrar" prompt with no profile colors (the drawer also says "Nenhum perfil ativo"), and tapping it opens the modal at the profile list.
4. **Given** the modal was opened from the profile control, **When** the person switches profile or signs out, **Then** the control updates immediately to the new state, without a reload.
5. **Given** a narrow screen and an active profile, **When** the person opens the drawer, **Then** the profile control is at its top, with the same dots, name and accessible name as on wide screens.

---

### User Story 2 - Navigate between Home and the collection (Priority: P1)

A person wants to get from any screen to their collection, and back to the start screen. The "Grimorio" wordmark in the top bar always leads Home. On wide screens, a navigation bar on the left links to the collection and shows which section is currently open. It sits collapsed as a thin thread so it takes little space. It expands while the pointer is over it, and it can be pinned open.

**Why this priority**: Without navigation the collection can only be reached by typing a URL. Together with Story 1, this is the minimum usable shell.

**Independent Test**: Can be fully tested on a wide screen: click the wordmark from any page (you land on Home). Hover the collapsed nav (it expands) and click "Coleção" (you land on the collection, and the link is marked as current). Then pin the nav, reload, and check that it is still pinned.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the person activates the "Grimorio" wordmark, **Then** they land on Home.
2. **Given** an active profile, **When** the person activates "Coleção" in the nav, **Then** the collection opens and "Coleção" is marked as the current section.
3. **Given** the person is on a page inside the collection (e.g. a location's detail or the import page), **When** the nav is shown, **Then** "Coleção" is still marked as the current section.
4. **Given** no active profile, **When** the person activates "Coleção", **Then** the existing profile gate applies: the profile modal opens at the profile list, and the collection shows once a profile is active.
5. **Given** a wide screen and a person who has never pinned the nav, **When** any page is shown, **Then** the nav is collapsed: a thin strip on the left showing each destination as a small mark on a thread, with the current destination's mark lit.
6. **Given** a wide screen and a collapsed nav, **When** the pointer rests on it (or keyboard focus enters it), **Then** it expands to show full labels over the content, without shifting the content. It collapses again shortly after the pointer leaves, or when focus leaves.
7. **Given** a wide screen, **When** the person activates the pin button in the expanded nav, or clicks the collapsed strip itself, **Then** the nav stays expanded beside the content (the content area narrows to make room, and nothing is covered). Activating the pin button again ("Recolher menu") returns it to collapsed.
8. **Given** the person pinned the nav, **When** they reload or come back later on the same device, **Then** it is still pinned.
9. **Given** any screen, **When** the nav is shown, **Then** it has no Home link. Home is reached only through the wordmark.

---

### User Story 3 - Sync my collection when I choose to (Priority: P2)

A person whose profile is linked to a cloud account decides when to sync. Nothing syncs by itself. On wide screens, the top bar has a sync area next to the profile control, and tapping it syncs. On narrow screens, the top bar shows only a status mark, and the drawer shows the full status with a sync action. Either way, the status shows how the sync went and how long ago the last one happened. For a profile without a cloud account, it says so.

**Why this priority**: Sync is optional, so only linked profiles benefit. Making it explicit means the person always knows when data left the device, and never has a sync start while they're mid-sort.

**Independent Test**: Can be fully tested with a linked profile at both widths: make a change and confirm that nothing syncs. Trigger a sync (the sync area on wide screens, the drawer action on narrow ones) and watch it go through syncing and synced, then show the time since the last sync. Switch to an unlinked profile and check its message.

**Acceptance Scenarios**:

1. **Given** a linked profile, **When** the person changes collection data, switches into the profile, unlocks it or links it, **Then** no sync starts on its own.
2. **Given** a linked profile and no sync running, **When** the person activates the sync area (wide) or the drawer's "Sincronizar agora" (narrow), **Then** a sync starts and the status shows "Sincronizando…" with an in-progress mark.
3. **Given** a sync is running, **When** the person tries to trigger it again, **Then** nothing happens. The wide sync area is visibly and accessibly unavailable, and the drawer hides its action until the sync ends.
4. **Given** a sync just succeeded, **When** the status is shown, **Then** it shows "Sincronizado" for 5 minutes, then changes to the time since the last sync ("Sincronizado há 5 min").
5. **Given** a linked profile that has synced before, **When** the app opens or the person switches into it, **Then** the status shows the time since its last successful sync. The time keeps updating while displayed.
6. **Given** a linked profile that has never synced, **When** the status is shown, **Then** it says "Nunca sincronizado", with the "Sincronizar agora" action.
7. **Given** the active profile has no cloud account, **When** the status is shown, **Then** it says "Sem conta na nuvem". Activating it (wide), or the drawer's "Vincular conta na nuvem" (narrow), opens the profile modal where a cloud account can be linked.
8. **Given** a sync attempt fails because the device is offline, the cloud session expired, or another error occurred, **When** the status is shown, **Then** it shows "Sem conexão", "Sessão expirada" or "Falha ao sincronizar", never raw backend text. For an expired session, the action ("Entrar de novo") opens the modal at the session-expired step. For the other cases, the action ("Tentar de novo") retries.
9. **Given** no profile is active, **When** the shell is shown, **Then** there is no sync status anywhere.
10. **Given** a narrow screen, **When** the person taps the sync mark in the top bar, **Then** nothing happens. The mark is status only, and its accessible name gives the full status.

---

### User Story 4 - Use the shell comfortably on a phone (Priority: P2)

On a phone held in portrait, the person still needs the home link, their profile and sync status, and the collection link. Nothing may overflow, overlap or be too small to tap, and the page content keeps most of the screen. The top bar holds the wordmark, a sync status mark and a "Menu" button at the right. "Menu" opens a drawer from the right, with the profile, the full sync status and action, and the nav.

**Why this priority**: Much collection work happens at the table or next to storage boxes, on a phone. The shell must not make that worse.

**Independent Test**: Can be fully tested at a narrow viewport (e.g. 360px wide): check that every shell control is reachable and at least 44px tall, that there is no horizontal scroll, and that the collection and the profile modal can each be reached in two taps through "Menu".

**Acceptance Scenarios**:

1. **Given** a narrow screen, **When** any page is shown, **Then** the top bar fits on one row: the wordmark at the left, then the sync mark (only when a profile is active), then "Menu" at the right.
2. **Given** a narrow screen, **When** the person taps "Menu" and then "Coleção", **Then** the collection opens and the drawer closes.
3. **Given** a narrow screen, **When** the person taps "Menu" and then the profile control, **Then** the drawer closes and the profile modal opens. When the modal closes, focus is on "Menu".
4. **Given** a narrow screen, **When** the drawer is closed, **Then** the navigation takes no space from the page content.
5. **Given** a narrow screen and an open drawer, **When** the person picks a destination, taps outside the drawer, taps ✕, or presses Back/Escape, **Then** the drawer closes.
6. **Given** a narrow screen, **When** the drawer is shown, **Then** its nav labels are always visible, and there is no pin button and no collapsed strip.

---

### User Story 5 - Scroll only the content, with the top bar always in reach (Priority: P2)

While browsing a long list (e.g. a large collection), a person scrolls down and still wants the profile control, sync status and home link at hand. The top bar never scrolls away. Only the view area below it scrolls.

**Why this priority**: A long collection is the normal case. Losing the shell when scrolling means scrolling back up just to switch profile or check sync.

**Independent Test**: Can be fully tested by opening a page taller than the screen, scrolling to the end, and checking that the top bar and the nav stay in place and the whole document never scrolls.

**Acceptance Scenarios**:

1. **Given** a page whose content is taller than the screen, **When** the person scrolls, **Then** only the view area below the top bar scrolls. The top bar stays in place and the whole page never scrolls, down or sideways.
2. **Given** a wide screen with the nav collapsed or pinned, **When** the view area scrolls, **Then** the nav stays in place.
3. **Given** a narrow screen, **When** the view area scrolls, **Then** the top bar stays in place and the address-bar behavior of the mobile browser does not make shell controls unreachable.
4. **Given** the person scrolled down on one page, **When** they move to a different page, **Then** the view area starts at the top.

---

### User Story 6 - See the legal and attribution notice (Priority: P3)

Anyone using the app can find a short notice at the bottom of the view area. It says that Grimorio is unofficial fan content under Wizards of the Coast's Fan Content Policy and not endorsed by Wizards, that card data and images come from Scryfall, and that AI tools were used in developing the app.

**Why this priority**: It is a precaution for fan-content policy compliance and transparency. It doesn't change what people can do, but it needs to be present on every screen before release.

**Independent Test**: Can be fully tested by scrolling to the end of any page (Home, collection, a short page and a long page) and checking that the notice is there with its three parts and working links.

**Acceptance Scenarios**:

1. **Given** any page, **When** the person scrolls to the end of the view area, **Then** the notice is shown below the page content.
2. **Given** a page shorter than the screen, **When** it is shown, **Then** the notice sits at the bottom of the view area, not right under the short content.
3. **Given** the notice, **When** it is read, **Then** it covers: (a) the Wizards of the Coast fan content statement with a link to the Fan Content Policy, (b) the Scryfall attribution with a link to Scryfall, and (c) "Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial."
4. **Given** the notice, **When** a link in it is activated, **Then** the link opens in a new tab and Grimorio stays open.

---

### Edge Cases

- A profile name at the 16-character maximum must show in full, with no truncation, wherever the profile control appears: the top bar on wide screens, and the drawer on narrow screens from 320px up.
- Someone typing a 17th character when creating a profile gets the same plain length error as any other out-of-range name. The name is never silently cut.
- Triggering sync while a sync is running does nothing, and a second sync never starts.
- The app stays open across a long idle time: the "last synced" time keeps counting correctly ("há 5 min" → "há 2 h" → "há 3 d"). The synced state still changes to last synced after 5 minutes, even if nothing else happens on screen.
- If the person taps the profile control while a sync is running, the profile modal does not open. The control is dimmed and unavailable, and its label says why ("Aguarde a sincronização terminar"). It becomes available again as soon as the sync ends, whether the sync succeeded or failed.
- If a sync stalls (e.g. the network drops mid-request), it must end in the error state within 60 seconds, so the person is never locked out of switching profile indefinitely.
- A failed sync shows its failure state only until the app reloads or the person switches profile. After that, the status shows "Sincronizado há N…" or "Nunca sincronizado" again, and the failure is never restored.
- A profile whose identity is red (or includes red) must never look like it's in an error state. Status never uses identity colors.
- If the person activates "Coleção" while already on the collection, nothing changes and no error appears.
- While a modal is open (e.g. the profile modal opened by the profile gate), nothing behind it can be activated: the top bar, the nav, the drawer and page content are all out of reach, by pointer, touch and keyboard. A second modal can never be opened from behind the first.
- If the screen is resized or rotated across the breakpoint while the drawer is open, the drawer state is dropped and the layout ends in the correct state for the new width, with no stray backdrop or stuck panel. A desktop pin choice made earlier still applies when the screen is wide again.
- A touch device with a wide screen (e.g. a tablet in landscape) has no hover. Tapping the collapsed strip pins the nav open, which gives access to the labels and the pin button.
- When a collapsed nav expands on hover, the content underneath must not jump or reflow. Moving the pointer quickly across the nav's edge must not make it flicker; a short delay before it collapses absorbs that.
- Moving focus into or out of the drawer must never scroll the shell sideways.
- If the browser cannot store the pin choice (private mode, blocked storage), the nav simply starts collapsed. Nothing breaks.
- A view that has its own inner scrolling area (e.g. a panel inside a page) still keeps the rule that the whole page never scrolls. The notice sits at the end of the view area, not inside a nested panel.
- With reduced motion, the flowing color bands stop, the drawer opens and closes instantly, and nothing else animates beyond what the reduced-motion rule allows.

## Requirements *(mandatory)*

### Functional Requirements

**Top bar**

- **FR-001**: The app MUST show one top bar above every screen, on every route.
- **FR-002**: The top bar MUST show the "Grimorio" wordmark as a link to Home, reachable by keyboard, at least 44px tall, and with the accessible name "Grimorio — Início".
- **FR-003**: The app MUST show a profile control: in the top bar on wide screens, and at the top of the drawer on narrow screens. With an active profile, it shows the profile's identity-color dots (in pick order) and the profile name. Its accessible name MUST also include the tribe and color names and what activating it does. With no active profile, it shows an "Entrar" prompt and no profile colors. The drawer adds "Nenhum perfil ativo".
- **FR-004**: Activating the profile control MUST open the existing profile/account modal. The modal opens at the step that fits the current state: switch/sign out when a profile is active, the profile list when none is. This spec does not change the modal's own content or flows, except as stated in Assumptions.
- **FR-005**: The profile control MUST update right away when the active profile changes, the person signs out, or the profile's colors change.
- **FR-005a**: While a sync is running, the profile control MUST NOT be activatable, so the active profile can't be switched or signed out mid-sync. It MUST look unavailable (dimmed) and expose that state, with the reason "Aguarde a sincronização terminar", to assistive technology. A running sync MUST end, successfully or in the error state, within 60 seconds.
- **FR-006**: Sync MUST run only when the person triggers it: the sync area on wide screens, or the drawer's sync action on narrow screens. Nothing else starts a sync: not data changes, a timer, switching into a profile, unlocking it, or the profile modal's link, set-up, unlock and session-renewal flows.
- **FR-007**: For an active profile, the sync status MUST show exactly one of these states:

  | State | Label | Action |
  |---|---|---|
  | syncing | "Sincronizando…" | none |
  | synced (5 minutes after a successful sync) | "Sincronizado" | "Sincronizar agora" |
  | last synced | "Sincronizado há N min / h / d" (minutes under 1 hour, hours under 1 day, days after that; updates every minute while displayed) | "Sincronizar agora" |
  | never synced | "Nunca sincronizado" | "Sincronizar agora" |
  | no cloud account | "Sem conta na nuvem" | "Vincular conta na nuvem" |
  | offline | "Sem conexão" | "Tentar de novo" |
  | session expired | "Sessão expirada" | "Entrar de novo" |
  | error | "Falha ao sincronizar" | "Tentar de novo" |
- **FR-007a**: Healthy sync states MUST be shown in neutral colors. Only the three failure states (offline, session expired, error) use the danger color. Identity colors MUST never signal sync status. Each state also has a distinct mark shape or fill, so states never rely on color alone.
- **FR-008**: On wide screens, the sync area MUST be a single control showing the state mark and the full label. Activating it performs the state's action: start a sync, retry, open the modal at the session-expired step, or open the modal at the cloud-link step. While a sync is running it MUST NOT be activatable, and it MUST expose that to assistive technology. Its accessible name is the full label plus the action (e.g. "Sincronizado há 42 min. Sincronizar agora.").
- **FR-009**: With no active profile, no sync status MUST be shown anywhere.
- **FR-010**: The new shell MUST replace the temporary profile button and its menu (from spec 003). Every action that menu offered MUST still be reachable, through the profile modal or the sync status and its action, except "Desvincular conta": it has no entry point until the profile-modal rework spec (accepted 2026-09-25). "Sincronizar agora" becomes the sync action.

**Nav bar**

- **FR-011**: On wide screens, the app MUST provide a navigation bar on the left side of the screen. For now it contains exactly one destination, "Coleção". It MUST NOT contain a link to Home, because the wordmark already does that. On narrow screens the same destinations appear in the drawer.
- **FR-012**: The nav MUST mark the current section, both visually and for assistive technology, while the person is on the collection or any page inside it.
- **FR-013**: On wide screens, the nav MUST be collapsed by default: a thin strip that stays visible and shows each destination as a mark on a thread, with the current destination's mark lit.
- **FR-014**: On wide screens, a collapsed nav MUST expand to show full labels while the pointer is over it or keyboard focus is inside it. It collapses again shortly after the pointer leaves, or when focus leaves. A hover-expanded nav MUST overlay the content without shifting or reflowing it.
- **FR-015**: On wide screens, the expanded nav MUST contain a pin button that keeps it expanded. It MUST state what it will do ("Fixar menu" / "Recolher menu") and expose its pressed state to assistive technology. Clicking or tapping the collapsed strip itself also pins the nav. When pinned, the nav sits beside the content (the content area narrows, and nothing is covered). The pin button stays hidden while the nav is collapsed, without moving the items when it appears.
- **FR-016**: The pin choice MUST be remembered on the device, across reloads and profile switches. It is a device preference, not per profile. If it can't be stored, the nav starts collapsed.
- **FR-017**: The nav MUST list only destinations that exist. Links from the older navigation (Decks, Sobre, the collection-filter panel) are removed from it.

**Mobile**

- **FR-018**: On narrow screens, the top bar MUST stay on one row with no horizontal scroll, in this order: the wordmark at the left, the sync mark (only when a profile is active), then a "Menu" text button at the right. The profile control is not in the top bar on narrow screens.
- **FR-018a**: On narrow screens, the top-bar sync mark MUST show only the state mark, never text. It MUST NOT be interactive, and it MUST expose the full label to assistive technology as a status. The full label and the state's action live in the drawer.
- **FR-019**: On narrow screens, "Menu" MUST open a drawer from the right, over the content, with a backdrop. The drawer holds, top to bottom: a ✕ close button; the account block (the profile control, the full sync status, and the state's action, which is hidden while syncing); a divider; and the nav destinations with labels always visible. The nav takes no space while the drawer is closed. The profile modal and every destination are reachable in two taps from any page. "Menu" MUST expose whether the drawer is open.
- **FR-020**: The drawer MUST close when a destination is chosen, when the backdrop is tapped, when ✕ is tapped, or when the person presses Escape/Back. While it is open, keyboard focus MUST stay inside it. When it is opened with the keyboard, focus goes to ✕. When it is closed with the keyboard, focus returns to "Menu".
- **FR-020a**: When a drawer control opens the profile modal (the profile control, "Entrar", "Vincular conta na nuvem", "Entrar de novo"), the drawer MUST close before the modal opens, so the drawer and the modal are never open together. When that modal closes, focus returns to "Menu". "Sincronizar agora" and "Tentar de novo" MUST leave the drawer open, so the person sees the status change.
- **FR-021**: On narrow screens there MUST be no side nav, no collapsed strip and no pin button.
- **FR-022**: Every interactive shell element, including the notice's links, MUST have a touch target at least 44px tall on every width.

**Page layout and scrolling**

- **FR-023**: The document as a whole MUST never scroll, down or sideways, on any width. The top bar stays fixed at the top, the nav stays fixed at the left (wide screens), and the view area below the top bar fills the rest of the screen.
- **FR-024**: All page content that needs scrolling MUST scroll inside the view area. Scroll position resets to the top when the person moves to a different page.
- **FR-025**: On phones, the shell MUST fit the visible screen height, accounting for mobile browser bars appearing and disappearing, so the top bar is never pushed off screen.

**Disclaimer**

- **FR-026**: The view area MUST end with a notice on every page, below the page's own content. When the content is shorter than the view area, the notice sits at the bottom of the view area.
- **FR-027**: The notice MUST include three statements:
  - (a) Grimorio is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy, not approved or endorsed by Wizards; portions of the materials used are property of Wizards of the Coast; "©Wizards of the Coast LLC". It links to the Fan Content Policy.
  - (b) Card data and images come from Scryfall, with a link to Scryfall.
  - (c) "Parte do desenvolvimento deste app contou com ferramentas de inteligência artificial."
- **FR-028**: The notice MUST be written in PT-BR and set quietly: small, muted text that doesn't compete with page content. It is labelled "Aviso legal" for assistive technology, and its links open in a new tab.
- **FR-029**: The notice text MUST come from one shared source, so the About page and the notice can't drift apart.

**Profile name length**

- **FR-033**: Creating a local profile MUST accept names of 3 to 16 characters. Every place that states or checks the limit MUST say "3 a 16": the field helper ("3 a 16 caracteres: letras, números, _ . ou -"), the length error ("Use de 3 a 16 caracteres.") and the design system's content list. The allowed character set is unchanged.
- **FR-034**: A 16-character profile name MUST fit in the profile control without truncation: in the top bar on wide screens, and in the drawer on narrow screens from 320px up.

**General**

- **FR-030a**: While any modal is open, every control behind it MUST be unreachable by pointer, touch, keyboard and assistive technology: the top bar, the nav (collapsed, hover-expanded or pinned), the drawer and the view area. They become available again when the modal closes.
- **FR-030**: All shell text MUST be PT-BR and follow the project's content rules: no emoji, no icon library, no Magic symbols. "Menu" and the pin button are text. ✕ is the only glyph, which the design system already allows.
- **FR-031**: Shell colors MUST come from the active profile's color identity, and fall back to the app's default identity when no profile is active. This covers the wordmark, the flowing bands, and the current nav mark and label. Status is the exception (FR-007a).
- **FR-032**: The design system document MUST describe everything below before it is built, since UI the design system doesn't cover is undecided:
  - the "Fio de luz" light recipes: the flowing identity band, its lit text variant, the top bar's flowing bottom line, the nav/drawer thread and wash, gradient text for the wordmark and the current nav label, and the continuous band animation that stops under reduced motion. These are recorded as exceptions to "every border is 1px solid" and "titles never change color".
  - the updated App top bar entry. It is no longer "identical at every width", and the temporary profile-button exemption is replaced by the final profile control.
  - new entries for the side nav (collapsed, hover-expanded, pinned, pin button), the drawer (right side, account block, nav), the sync area and sync mark with all states, and the notice
  - the status-color rule (FR-007a)
  - the identity-display exception: dots plus the profile name, with the tribe and color names in the accessible name only

### Key Entities

- **Active profile**: the local profile currently in use. The shell reads its name, color identity (in pick order), and whether it is linked to a cloud account.
- **Sync status**: the sync state of the active profile — whether it has a cloud account, whether a sync is running, the result of the last attempt, and the time of the last successful sync. Only the time is kept per profile across sessions. The result of the last attempt (including a failure) lasts only for the current session and is cleared on reload or profile switch. The displayed state (FR-007) is derived from it and re-evaluated every minute.
- **Navigation destination**: a named section of the app, currently only "Coleção". It has a label and knows which pages count as "inside" it, for the current-section mark.
- **Nav pin preference**: a per-device yes/no choice of whether the desktop nav is pinned open. Default: not pinned.
- **Disclaimer notice**: the shared legal/attribution text (WotC fan content, Scryfall, AI usage) shown at the end of the view area and reused by the About page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On wide screens, a person can open the profile/account modal with 1 tap and reach Home or the collection with at most 2 taps (1 when the nav is pinned). On narrow screens, the profile modal, the sync action and the collection are each reached in at most 2 taps, and Home in 1.
- **SC-002**: At every viewport width from 320px up, no shell element overflows, overlaps another, or causes horizontal scrolling.
- **SC-003**: 100% of interactive shell elements are at least 44px tall, reachable by keyboard, and have a text label for assistive technology.
- **SC-004**: A change of active profile or sync state shows in the shell within 1 second, without a reload.
- **SC-005**: Each sync state (syncing, synced, last synced, never synced, no cloud account, offline, session expired, error) is visually distinct and has a distinct written label. The three failure states are the only ones in the danger color. A first-time person can tell "synced" apart from "needs attention" without instructions.
- **SC-006**: On any page and any width, scrolling to the end never moves the top bar. The whole document has zero scroll, and all scrolling happens in the view area.
- **SC-007**: On a wide screen with the nav collapsed, hovering it never moves page content by even one pixel. When pinned, no page content is ever covered by the nav.
- **SC-008**: The disclaimer notice, with all three parts and working links, is present on 100% of pages.
- **SC-009**: A pinned nav is still pinned after a reload in 100% of cases where the browser allows storing preferences.
- **SC-010**: 100% of profile names created under the new rule show in full in the profile control, at every width from 320px up.
- **SC-011**: No sync ever starts without the person triggering it. In a test session of data changes, profile switches and modal flows with no sync trigger, 0 syncs are made.

## Assumptions

- The profile/account modal from spec 003 is reused unchanged. Its planned rework is a separate, later spec. The only changes inside it are:
  - removing its automatic syncs (see below)
  - rewording its account-creation and session-renewal subtitles, which still promise automatic sync
  - the profile-name length rule (FR-033)
- The collection is the only nav destination for now. Decks, Sobre and other existing pages stay reachable by URL but are not linked from the new nav. Per the project's unreleased-redo scope, legacy pages that relied on the old navigation (e.g. the collection-filter panel inside the old drawer) may lose that entry point. Legacy views that assumed the whole page scrolls may need small fixes to fit the new view area, but only as far as keeping them usable.
- Home stays ungated. The collection keeps its existing profile gate, and the nav does not duplicate that check.
- The existing sync engine (how data is reconciled with the cloud, the states it reports, the stored last-synced time) is reused. Its automatic triggers are removed: the scheduler that synced after changes and on profile switch, and the syncs that the profile modal starts after link, set-up, unlock and session renewal. As a result, a profile set up on a new device starts with an empty collection until the person triggers a sync. The modal's "sync line" (DESIGN.md) no longer applies to those flows.
- "Wide" is the existing wide breakpoint (960px), which is the shell's only breakpoint. Everything narrower, including tablets in portrait, uses the drawer. The smaller mobile breakpoint is not used by the shell.
- In the Android app, the hardware Back button navigates history rather than dismissing the drawer. The drawer still closes, because it closes on any navigation, but the page also goes back, or the app exits at the first page. A proper Back handler (`@capacitor/app`) is left to a later native-polish spec, alongside the same gap in the profile modal. In browsers and the installed PWA, Back closes only the drawer.
- The notice goes in the view area, not in the top bar or the nav, and it scrolls with the content, so it takes no permanent screen space.
- The visual design, including exact sizes, colors, motion and copy, is specified by the design handoff in `design_handoff_app_shell_navigation/` (its README supersedes its presentation board). DESIGN.md is updated to match, as FR-032 describes.
