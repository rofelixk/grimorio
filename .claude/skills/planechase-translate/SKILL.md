---
name: planechase-translate
description: Translate Planechase card text (planes and phenomena) to PT-BR into src/app/core/data/planechase/cards.pt-br.json, for cards whose translation is missing or outdated, or for named cards. Maintainer-run after `npm run sync:planechase`.
argument-hint: "[card names…]"
---

# Planechase translation

Writes the reviewed PT-BR text the app shows for each Planechase card. The app uses a translation
only when its `sourceHash` equals the card's `hash` in `cards.json`; otherwise it falls back to
English. The file is committed, so every translation you write here is read by the maintainer
before it ships.

Files (repository root):
- `src/app/core/data/planechase/cards.json` — the source, written by `npm run sync:planechase`.
  Never edit it.
- `src/app/core/data/planechase/cards.pt-br.json` — the output.
- `.claude/skills/planechase-translate/glossary.md` — the terms and canonical openings. Read it
  in full before translating anything.

Types are in `src/app/core/data/planechase/planar-card.model.ts` (`PlanarCardRecord`,
`PlanarTranslations`, `PlanarTranslation`).

## Arguments

Zero or more English card names (e.g. `/planechase-translate "Sokenzan" "Chaotic Aether"`).
Matching is case-insensitive and exact against `cards.json` names. Report an unknown name and
skip it; never guess the closest match.

## Procedure

1. Read `cards.json`, and `cards.pt-br.json` (treat it as `{}` if it doesn't exist). Read
   `glossary.md`.
2. Build the work list:
   - every card with no entry in `cards.pt-br.json` (**new**)
   - every card whose entry has `sourceHash !== card.hash` (**updated**)
   - every card named in the arguments, even if its entry is fresh (**requested**)
3. For each card on the work list, write an entry keyed by the card's `id`:
   - `typeLine`: translate the card type ("Plane" → "Plano", "Phenomenon" → "Fenômeno"); keep the
     plane subtype after the dash as written (`Plane — Zendikar` → `Plano — Zendikar`).
   - `text`: translate paragraph by paragraph, keeping the same `\n` paragraph breaks. `''`
     stays `''`.
   - `ability`: translate it; `null` stays `null`.
   - `sourceHash`: the card's current `hash`.

   While translating:
   - Follow `glossary.md`. Where an official Portuguese printing of a term or card text exists,
     use its wording.
   - Keep every card name (this card's or any other card's) in English, exactly as written.
   - Keep every `{…}` symbol as written, except `{CHAOS}`, which becomes `{CAOS}`.
   - Normalize every chaos or encounter opening to the glossary's canonical wording (glossary
     § Irregular openings) — the same trigger must always read the same way.
   - Handle ability-word/flavor prefixes per glossary § Prefixes.
   - Don't add or drop rules content. If a sentence is ambiguous, translate it literally and flag
     the card in the report.
4. Delete every entry whose key isn't an `id` in `cards.json`.
5. Write `cards.pt-br.json`: keys sorted by id (plain string order), `JSON.stringify(data, null, 2)`
   style (2-space indent, key order inside each entry `sourceHash`, `typeLine`, `text`,
   `ability`), plus one trailing newline. Leave every entry that isn't on the work list
   byte-for-byte unchanged.
6. Print the report for the maintainer to review before committing:
   - the translated card names, grouped as **New**, **Updated** and **Requested**
   - the deleted ids, if any
   - unknown names from the arguments, if any
   - every card whose translated `ability` doesn't start with the canonical chaos trigger (planes)
     or the canonical encounter opening (phenomena), except the documented exceptions in the
     glossary — list each with its opening so the maintainer can check it
   - any card flagged as ambiguous in step 3

Don't run `npm run sync:planechase`, the app or the tests as part of this skill.
