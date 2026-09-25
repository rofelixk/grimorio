```text
Finish Grimorio's app shell and give Home a purpose. Spec 003 left placeholders: a temporary,
unstyled profile button and menu in the top bar, the frozen legacy nav drawer, and an empty Home.
This feature replaces all three with a final shell built on DESIGN.md — a top bar with the real
active-profile control, navigation, and a Home that introduces Grimorio to newcomers and gives
returning collectors a quick way into their collection — so later view-by-view redesigns have a
finished frame to land in.

Users & problem: Two equally important audiences. (1) A first-time or signed-out visitor who opens
the app and today sees an empty page with no explanation of what Grimorio is or how to start.
(2) A returning collector with a profile who needs to see which profile is active, get to their
collection quickly, and switch profiles, sign out or sync without relying on a placeholder menu.

In scope:
- The final active-profile control in the top bar, replacing the temporary button and menu.
- Navigation for the shell, replacing the legacy nav drawer. Its only destination for now is Coleção.
- Home, in two states:
  - Signed out, intro not dismissed: an introduction explaining what Grimorio is (a collection
    manager that tracks where each physical card is stored), that no account is needed (a local
    profile on this device; cloud account optional), that it is free with no ads, and how to start
    (create or pick a profile). The introduction can be dismissed; the dismissal lasts for the
    current session only and the introduction returns on the next visit.
  - Signed in, or intro dismissed: relevant navigation — entry points into the areas the person
    can use, with light counts of the active profile's owned data (e.g. how many cards) when a
    profile is active.
- Sobre (Fan Content Policy notice and Scryfall attribution) stays reachable, but is not a
  navigation destination.

Out of scope:
- Decks: no navigation leads to Decks until its own redesign spec; its routes stay alive.
- Placeholders for future areas (scanning, gameplay tools) — not shown.
- Account management (rename, change password, delete profile or cloud account) — the follow-up
  account spec.
- Redesigning Coleção, import, collection detail or any other legacy screen. They sit inside the
  new shell and may break visually.
- Contextual per-page content in the shell: the collection filters currently shown in the legacy
  drawer on a location page leave the shell. Their capability and data must not be removed — they
  move with the Collection view (its own redesign decides how they are presented).
- Recent activity / "continue where you left off" on Home.

Key scenarios:
- A first-time visitor opens the app with no profile: Home shows the introduction; they learn what
  Grimorio is and start creating a profile from it.
- A signed-out visitor dismisses the introduction: for the rest of the session Home shows the
  relevant navigation instead; on a new visit the introduction is back.
- A returning collector opens the app with an active profile: Home shows navigation into Coleção
  with a light count of their cards; the top bar shows who is active and whether the profile is
  linked to the cloud.
- From any screen, a person with an active profile switches profile, signs out (locks) the current
  profile, or runs a sync if linked, through the profile control.
- With no active profile, the profile control opens the entry flow on the profile list (as today).
- A person on any screen can reach Sobre.
- Signing out or switching retints the shell to the default identity or the new profile, and Home
  never shows the previous profile's counts (Default Rule).

Constraints:
- Constitution II (PT-BR-first): all copy PT-BR, including status and error text.
- Constitution IV (local-first): Home, Sobre and the shell work with no profile and fully offline;
  no capability depends on a cloud account. Owned-data routes stay gated (profileGuard).
- Constitution V: new UI follows DESIGN.md only; any visual decision it doesn't cover (navigation,
  Home, intro, the final profile control) must be added to DESIGN.md before it is built. No icon
  library, no Magic symbols, no logo beyond the Grenze wordmark; 44px touch targets; respects
  reduced motion.
- DESIGN.md "App top bar" entry stands (wordmark left, profile control right, identical at every
  width); its FR-029 exemption for the placeholder control ends with this feature.
- DESIGN.md: show who is signed in wherever switching is possible; the Default Rule (no profile →
  Vermelho → Azul → Verde, never show a hidden person's colors or data); identity named in text,
  never by color alone.
- The profile control MUST state the active profile (or that none is active) and its cloud link
  state (carries FR-029's requirement forward), and offer switch profile, sign out, and sync now
  (sync only when linked).
- Supersedes spec 003 FR-011a for the signed-in case: Home now shows owned-data counts and links
  into core features when a profile is active. Signed-out Home still shows no owned data.
- Supersedes spec 003 FR-029 (temporary top bar control) and removes the legacy nav drawer.
- No spec 003 capability may become unreachable: cloud account link/unlink and re-authentication
  after session expiry must stay reachable somewhere — where is decided during design.
- Legacy screens may break visually inside the new shell (app unreleased).

Design reference: pending — UI decided by the Claude Design handoff.

Notes for design:
- Sobre should always sit at the bottom of the main page's scrollable area.
- Cloud account entry points (link/unlink/reauth): placement to be defined during design.

Success criteria:
- No placeholders remain: no temporary profile button or menu, no legacy nav drawer, and the
  wordmark appears exactly once on every screen.
- A first-time visitor, with no other help, can tell from Home what Grimorio is, that it's free and
  needs no account, and can start creating a profile from there.
- On every screen, a person can tell which profile is active (or that none is) and whether it is
  linked to the cloud.

Open questions for /speckit-clarify:
- What counts as a "session" for the intro dismissal (browser tab session, app launch, until
  sign-in)? Does the introduction return after signing out within the same session?
- Signed-out Home after dismissal: what does "relevant navigation" offer when Coleção requires a
  profile (entry into the profile flow, Coleção leading into the gate, Sobre)?
- Which light counts appear on signed-in Home (cards total, distinct cards, storage locations)?
- Does the profile control surface sync status (syncing / synced / offline / error), or only the
  link state?
- Does signed-in Home show anything for a profile with zero cards (empty state), and does it point
  to import?
- Should Sobre's "bottom of the scroll area" apply on every screen or only Home (design may settle).
```
