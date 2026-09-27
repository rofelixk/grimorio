# Contract: card data script and translation skill

**Feature**: `006-shared-planechase`. The file formats are in [data-model.md](../data-model.md) §1.

**Who runs them**: only the maintainer runs and tests these tools, and every change to them.
Implementation never executes them (plan.md, "Maintainer-only runs").

## `npm run sync:planechase` → `tsx --env-file=.env scripts/sync-planechase.ts`

**Needs**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the same `.env` as `sync:scryfall`).

**Steps**:
1. Read the catalog ([supabase.md](supabase.md) § Script reads).
2. If any candidate printing has a null `border_color`, `released_at`, `image_small` or
   `image_large`, exit 1 with "Catalog is missing border/release/image columns — run
   `npm run sync:scryfall` first." Write nothing.
3. Per oracle, choose the newest printing (R1). Drop cards with no printing.
4. Split the ability (R2), using `ABILITY_OVERRIDES: Record<oracleId, number | null>` in the
   script.
5. Compute `hash` (R3).
6. Read the previous `cards.json`, if there is one, and `cards.pt-br.json`. Write the new
   `cards.json` deterministically.
7. Print the report (FR-024a). The script's output is maintainer-facing, in English like
   `sync-scryfall.ts`:

   ```text
   Wrote 205 cards (184 planes, 21 phenomena) to src/app/core/data/planechase/cards.json.
   New (2): …names
   Changed (1): …names
   Removed (0)
   Planes with no chaos ability (1): Ghirapur Grand Prix — confirm or add an ABILITY_OVERRIDES entry.
   Missing or outdated translations (3): …names
   Run in Claude Code: /planechase-translate
   ```

   When everything is translated, the last two lines become "Translations are up to date."

**Exit codes**:
- 0 on success, even when translations are needed.
- 1 on a catalog or network error, or when a column is missing.

**Tests**: none automated. The maintainer runs SC-009 by hand.

## `/planechase-translate [card names…]` (Claude Code skill)

**Location**: `.claude/skills/planechase-translate/`
- `SKILL.md`: frontmatter `name: planechase-translate` and a description, then the procedure.
- `glossary.md`: the PT-BR term table (R18).

**Procedure** (what `SKILL.md` instructs):
1. Read `src/app/core/data/planechase/cards.json` and `cards.pt-br.json` (`{}` if the latter is
   missing).
2. The work list: cards with no entry or with `sourceHash !== hash`, plus every card named in the
   arguments. Name matching is case-insensitive and exact. An unknown name is reported, not
   guessed.
3. For each card, translate `typeLine`, `text` and `ability` to PT-BR:
   - Follow `glossary.md`, and use official Portuguese printings wherever they exist.
   - Keep card names and `{…}` symbols as written, and render `{CHAOS}` as `{CAOS}`.
   - Normalize every irregular chaos/encounter opening to the glossary's canonical PT-BR wording
     (research R18). This covers "When chaos ensues", "Chaos:", the "ensures" typo, chaos folded
     into other triggers, and ability-word prefixes.
   - `ability` stays `null` when the source is `null`.
   - Set `sourceHash = hash`.
4. Delete entries whose id isn't in `cards.json`.
5. Write the file with keys sorted by id and 2-space JSON plus a trailing newline. Never modify an
   entry that isn't on the work list.
6. Print the translated card names, grouped as new, updated or requested, for the maintainer to
   review before committing (FR-026). Also list any card whose translated `ability` doesn't start
   with the canonical opening.
