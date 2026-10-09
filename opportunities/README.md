# Opportunities

An opportunity explains **why** a group of features should exist: a need a specific group of users has, which Grimorio can meet. It then breaks that need into features detailed enough to feed `/speckit-specify` directly. `backlog/` holds known work that is too small or too technical to need this (fixes, gaps, single items); an opportunity holds needs too big for one spec.

```
opportunity (opportunities/NNN-*.md)
  └─ feature F1, F2, …          one spec each, or
       └─ sub-feature F2a, F2b   one spec each, when the feature is too big
```

## Files

- [TEMPLATE.md](TEMPLATE.md): copy it to `NNN-slug.md` (next free number, never reused) to start an opportunity.
- `NNN-slug.md`: one opportunity. It is referred to as `OPP-NNN`; its features as `OPP-NNN F2`, `OPP-NNN F2a`.

## Lifecycle

**Opportunity status**

| Status | Meaning |
|---|---|
| `draft` | The need is written down; features are a first breakdown and may still change shape. |
| `shaped` | Every feature is detailed and sized, and the suggested build order is written. |
| `in progress` | At least one feature has a spec folder. |
| `done` | Every feature shipped or was dropped. The file stays as the record of why they exist. |

**Feature maturity**

| Maturity | Meaning |
|---|---|
| `needs shaping` | The concept itself is still open: the open decisions change what the feature *is*, not just details. Not ready for `/speckit-specify`. |
| `ready to spec` | Behavior, data impact and UI surfaces are described; what remains open are decisions `/speckit-clarify` can settle. |
| `specifying` / `in progress` / `shipped` / `dropped` | Set when the spec folder exists (fill in **Spec**), is being built, ships, or the feature is abandoned (say why). |

## Sizing

Each feature (and sub-feature) is scored on five dimensions, 0–2 each. The score shows what the work touches, not how long it takes.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **Data model** | No model change | New field(s) on an existing model | New entity, or a change to what an existing field means |
| **Persistence & sync** | Nothing persisted | Local only (IndexedDB), or a new column on a synced table | New Supabase table, RLS policy, view or function, or a new sync step |
| **UI** | None | Changes to existing views/components that DESIGN.md already covers | A new view or route, or UI DESIGN.md doesn't cover yet |
| **Reach** | One area of the app | Two areas (e.g. collections and decks) | Cross-cutting (shell, auth, every card list, sync) |
| **Unknowns** | Behavior decided | A few open decisions for `/speckit-clarify` | The concept is still forming, or it depends on something outside the app (a third-party format, another person's data) |

| Total | Size | Rule |
|---|---|---|
| 0–2 | **S** | One focused spec, often a quick one. |
| 3–5 | **M** | One spec. |
| 6–7 | **L** | One spec, unless it has a seam where part of it could ship and be useful on its own; then split. |
| 8–10 | **XL** | Must be split into sub-features until each is L or smaller. |

Write the score as `M (1·1·1·0·1)` in the order of the table above, so a later reader can see *why* it is that size. A split is along a seam that ships on its own (local before cloud, owner before visitor, read before write), not along layers (model, then service, then UI).

## Writing an opportunity

1. **Need first.** Fill in the Opportunity section before listing any feature: who, their situation, what they can't do today, why Grimorio is the right place. Success is described in plain terms; don't invent numeric targets.
2. **Features.** Break the need into features. Each one gets every section of the template; whatever isn't known yet goes under **Open decisions** rather than being guessed in the behavior rules.
3. **Size and split.** Score each feature; split what the rule asks for. Sub-features get the same sections, kept shorter where they inherit from the parent.
4. **Check against the project.** Constitution check, prerequisites (`#N` backlog items, earlier specs) and DESIGN.md gaps.
5. **Build order last.** Only once every feature is at least `ready to spec` (or explicitly parked): phases, the critical path, what can run in parallel, and why. The status becomes `shaped`.
6. **Into spec-kit.** Run `/speckit-specify` with a feature's **Spec seed**, then fill in its **Spec** link. The spec becomes the source of truth for that feature; the opportunity is not kept in sync with later spec changes, beyond its status and link.
