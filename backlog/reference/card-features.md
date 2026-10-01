# Reference: card reading, catalog lookup and CSV import

The working configuration of three features removed by spec 010 (codebase baseline), recorded so the fresh card features can rebuild them without rediscovering tuned values. Parameters and rules only, not code. Sources: `card-ocr.util.ts` (+ spec), `card-ocr.service.ts`, `card-scan-capture`, `add-card-modal`, `card-lookup.service.ts` (+ spec), `supabase-client.ts`, `card-import.util.ts`, `card-import.service.ts`, as of commit `e9eedc0`.

## Card reading (OCR)

### Library and loading

- **Library**: `tesseract.js` `^7.0.0` (7.0.0 installed).
- **Loading**: always a dynamic `import('tesseract.js')`, never static, so esbuild code-splits it into its own lazy chunk.
- **ESM/CJS workaround**: tesseract.js's CJS entry re-exports a spread of a dynamic object, which esbuild can't analyze into named exports. Only `default` is usable: `const { createWorker, PSM } = (await import('tesseract.js')).default`.
- **Assets**: worker, wasm core and language data come from tesseract.js's default CDN at runtime. Nothing is committed to the repo or listed in `angular.json` assets.
- **Testing**: `vi.mock('tesseract.js', () => ({ default: { createWorker, PSM: { SPARSE_TEXT: '11' } } }))` works because it mocks a package, not a relative import.

### Worker

- One worker per scan: `createWorker('eng')`, then `terminate()` in a `finally` (even on failure).
- **Language**: `eng` only (the collector line is Latin characters in every printing language).
- **Parameters** (`worker.setParameters`):
  - `tessedit_pageseg_mode: PSM.SPARSE_TEXT` (`'11'`): look for disconnected text blocks in no particular order, because the crop usually has rules text above it in another font/orientation.
  - `tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789•·./ '` (uppercase letters, digits, bullet `•`, middle dot `·`, period, slash, space).
- One `recognize()` call per scan, on the preprocessed image.

### Image preprocessing

- **No crop, no scaling, no thresholding, no grayscale**: the whole captured photo is passed through as-is apart from inversion.
- **Color inversion**: the collector-info line is printed light-on-dark (white text on a black bar), while Tesseract's English model is trained on dark-on-light. Each RGB channel becomes `255 − value` (alpha untouched), via `createImageBitmap` → 2D canvas → `getImageData`/`putImageData` → `canvas.toBlob(…, 'image/png')`.
- **Fallback**: if inversion throws (no `createImageBitmap`, no 2D context, `toBlob` returns null), OCR runs on the original image.

### Text to set code + collector number

The recognized text is uppercased, then:

1. **Collector number with total** ("145/264"): `/(\d{1,4})\s*\/\s*\d{1,4}/`, group 1.
2. **Else bare zero-padded number**, optionally after a rarity letter ("C 0008"): `/\b(?:[CURMSB]\s+)?(0\d{2,3})\b/`, group 1. The leading zero is required, so a copyright year ("© 2026") or other stray digits don't match.
3. **Else** empty collector number.
4. **Set code + language** ("WAR • EN"): `/\b([A-Z0-9]{2,5})\s*[•·.]?\s+[A-Z]{2}\b/`, group 1. The bullet is optional because OCR often misreads it as a period or drops it ("SOS EN").
5. **Else** empty set code.

Pinned cases: `145/264\nWAR • EN` → WAR/145; `C 0008\nSOS • EN` → SOS/0008; `C 0008\n\nSOS EN` → SOS/0008; `WAR • EN` → WAR/''; `™ & © 2026 Wizards of the Coast` → ''/''; garbage → ''/''.

The padded number ("0008") is returned as read; the catalog lookup strips the zeros (see normalization below).

### Errors and the flow around it

- Any thrown error yields `{ setCode: '', collectorNumber: '', error }` with PT-BR text "Não foi possível ler a carta automaticamente (<message>)." (or without the parenthetical for non-`Error` throws). OCR never throws to the caller.
- After a scan the add-card flow switched to set-code search mode and pre-filled both fields with the guess. If either field was empty it showed "Não foi possível ler as informações completas, digite ou tire uma nova foto." and stopped; otherwise it ran the single-printing lookup and, on a hit, went straight to the confirm step. "Nenhuma carta encontrada…" was shown as an ordinary empty result, not an error banner.

### Camera capture

- No `getUserMedia` stream: a hidden `<input type="file" accept="image/*" capture="environment">` opened by a "Scanear carta" button. `capture="environment"` asks mobile browsers for the rear camera; desktop shows a file picker.
- The selected `File` (a `Blob`) is emitted as-is; nothing is emitted when no file was picked.

## Catalog lookup

### Client

- A dedicated anonymous Supabase client (`createClient(SUPABASE_URL, SUPABASE_ANON_KEY, …)`) with `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'grm-catalog' }`. It never holds a session; the distinct storage key keeps it apart from the per-profile cloud clients (`grm-cloud:{id}`).
- Tables `cards`/`printings` are public read-only (`grant select … to anon, authenticated`), filled by `npm run sync:scryfall`.

### Query shape

Every query selects from `printings` with an embedded join to `cards`:

```
scryfall_id, oracle_id, set_code, set_name, collector_number, rarity, image_url,
cards(name, type_line, oracle_text, color_identity, commander_legality, card_faces)
```

| Operation | Filters | Notes |
|-----------|---------|-------|
| Single printing (set + number) | `eq('set_code', setCode.trim().toLowerCase())`, `eq('collector_number', normalized)`, `.single()` | PostgREST `PGRST116` (no row) → "Nenhuma carta encontrada para {SET} #{number}."; any other error → "Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente novamente." |
| Search by name | `cards!inner(…)` (inner join so the filter applies), `ilike('cards.name', '%query%')`, `order('set_code')`, `order('collector_number')`, `limit(200)` | Query trimmed; under 3 characters returns `[]` without querying. Results collapsed to one per distinct card name, keeping the first in set/number order |
| All printings of a card | `eq('oracle_id', oracleId)`, ordered by set then number | No dedupe |
| Batch by Scryfall id | `in('scryfall_id', ids)` | Returns a `Map` keyed by `scryfall_id`; error or no data → empty map (misses are just absent) |
| Batch by set | `eq('set_code', lowercased)`, `in('collector_number', numbers.map(normalize))` | Error or no data → `[]` |

### Normalization

- **Set code**: trimmed and lowercased for queries; uppercased in results.
- **Collector number**: trimmed, then leading zeros stripped only when followed by another digit (`/^0+(?=\d)/` → ''), because cards print "0001" while Scryfall stores "1". Pinned cases: "0001" → "1"; "007a" → "7a" (the letter suffix is kept); "0" stays "0".

### Batching

- Bulk callers never loop a per-row query: one query per chunk of up to **200** Scryfall ids, and one query per **distinct set code** covering all its collector numbers.

### Result to `CardEntry`

- `name`, `typeLine`, `colorIdentity` (as `Color[]`), `commanderLegality` from `cards`; `scryfallId`, `oracleId`, `collectorNumber` (as stored) from `printings`; `setCode` uppercased; `setName` defaults to `''`; `rarity` defaults to `'common'`.
- `canBeCommander`: type line contains both "Legendary" and "Creature", or the oracle text (or, when null, the faces' oracle texts joined by newlines) contains "can be your commander" (case-insensitive).
- `imageUrl`: the printing's `image_url`, else the first face's `image_url`, else `''`.
- `faces`: only for 2+ faces; each face with an image becomes `{ name, imageUrl }`; `undefined` if none has an image.
- Physical fields on add (confirm step): `finish` default `'nonfoil'`, `language` default `'en'`, `condition` default `'NM'`, `quantity` default `1` (`Number(input) || 1`), `forSale` false, `notes` trimmed or `undefined`.
- Language codes used by the add form: `en`, `ct` (Cantonese), `de`, `fr`, `it`, `jp`, `kr`, `pt`, `ru`, `cs` (Simplified Chinese), `sp` (Spanish).

## CSV import

### Reading the file

- Bytes are decoded as UTF-8; if the result contains the replacement character `�`, they are decoded again as **Windows-1252** (both exports often arrive as Windows-1252, showing "Mans�o" for "Mansão").
- **papaparse** `^5.7.0`: `Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })`; headers come from `meta.fields`.

### Format detection

- A `Scryfall ID` header → **Archidekt**; else an `Edicao (Sigla)` header → **LigaMagic**; else reject with "Formato de CSV não reconhecido. Exporte da Archidekt ou LigaMagic."

### Archidekt columns

| Field | Column | Mapping |
|-------|--------|---------|
| name | `Name` | trimmed |
| set code | `Edition Code` | trimmed, lowercased |
| collector number | `Collector Number` | trimmed |
| Scryfall id | `Scryfall ID` | trimmed; empty → none |
| finish | `Finish` | `foil` → foil, `etched` → etched, else nonfoil (case-insensitive) |
| condition | `Condition` | uppercased; one of NM/LP/MP/HP/DMG, else NM |
| language | `Language` | trimmed, lowercased; empty → `en` |
| quantity | `Quantity` | `Number(…) \|\| 1` |

### LigaMagic columns

| Field | Column | Mapping |
|-------|--------|---------|
| name | `Card (EN)`, else `Card (PT)` | trimmed |
| set code | `Edicao (Sigla)` | trimmed, lowercased |
| collector number | `Card #` | trimmed |
| finish | `Extras` | substring: contains "etched" → etched, else contains "foil" → foil, else nonfoil (free text such as "Foil Especial / Foil Etched") |
| condition | `Qualidade (M NM SP MP HP D)` | M/NM → NM, SP → LP, MP → MP, HP → HP, D → DMG, else NM |
| language | `Idioma (BR EN DE ES FR IT JP KO RU TW)` | BR→pt, EN→en, DE→de, ES→sp, FR→fr, IT→it, JP→jp, KO→kr, RU→ru, TW→cs (no Traditional Chinese code), else en |
| quantity | `Quantidade` | `Number(…) \|\| 1` |

- **Set aliases** (LigaMagic code → Scryfall code): `ud` → `uds`. Extend as mismatches turn up.

### Matching to the catalog

In order, each step only on what the previous left:

1. Rows **with a Scryfall id**: batched by id in chunks of 200. A miss is reported `unmatched` (no further fallback).
2. Rows **with set code and collector number**: grouped by lowercased set code, one batched query per group; matched by normalized collector number.
3. Still unmatched rows whose set code has an **alias**: retried the same way under the aliased code.
4. **Name fallback** for rows missing set/number, rows without alias, and rows still unmatched after the alias: per-row name search, 10 rows at a time (`Promise.all`). No name → `unmatched`; 0 candidates → `unmatched`; more than 1 distinct name → `ambiguous`; exactly 1 and the row has no set or number → matched; otherwise list that card's printings and require an exact set code (case-insensitive) and collector number (exact string) match, else `ambiguous`.

- Output: `matched` (row + catalog result) and `unresolved` (row + reason `unmatched` | `ambiguous`). There was no screen showing it yet.

### Writing

- Identity of "the same physical entry": `scryfallId|finish|language|condition`, compared only against cards already at the target location.
- A match on an existing entry adds the row's quantity to it (also to later rows hitting the same key in the same import); new keys become new `CardEntry`s via `addMany` (`forSale: false`, the target `locationId`, finish/language/condition/quantity from the row, identity fields from the catalog). Returns `{ added, updated }`.
