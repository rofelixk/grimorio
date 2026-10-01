# Baseline measurements: Codebase Baseline

Measured on 2026-09-30, before any removal (branch `feature/010-codebase-baseline`, commit `e9eedc0`).

## Source size (`*.ts`/`*.html`/`*.scss` under `src/`)

| Measure | Value |
|---------|-------|
| Files | 374 |
| Lines | 36,315 |

## Production build (`npm run build`)

| Chunk | Names | Raw size | Estimated transfer |
|-------|-------|----------|--------------------|
| `main-YHNX7CKS.js` | main | 852.49 kB | 189.40 kB |
| `styles-LCQBQVGM.css` | styles | 8.76 kB | 2.08 kB |
| `chunk-2NFLSA4Y.js` | - | 449 bytes | 449 bytes |
| **Initial total** | | **861.70 kB** | **191.92 kB** |
| `chunk-XJFW7MOA.js` (lazy) | cards-json | 105.47 kB | 19.66 kB |
| `chunk-TVTU22ZJ.js` (lazy) | cards-pt-br-json | 66.44 kB | 14.80 kB |

No budgets were configured.

## After the removals (T026)

Measured with a temporary `anyComponentStyle` warning of `1kb`, so the build reports every compiled component stylesheet.

| Measure | Value |
|---------|-------|
| Largest compiled component stylesheet | 4.54 kB (`views/collection-area/collection-area.scss`) |
| Next largest | 3.62 kB (`identity-wheel`), 2.92 kB (`deck-area`), 2.90 kB (`profile-modal`), 2.77 kB (`entry-modal`) |
| `cards-json` lazy chunk | 105.47 kB |
| `cards-pt-br-json` lazy chunk | 66.44 kB |
| Initial total | 861.58 kB (`main` 852.37 kB) |

Budgets derived from these (T027): component style 9 kB warning / 18 kB error; each named lazy chunk 210 kB / 420 kB.
