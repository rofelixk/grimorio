# UI Design: Shared Planechase

**Feature**: `006-shared-planechase`

**Visual source**: `design_handoff_shared_planechase/Planechase.dc.html` (final) and its README. This
file fixes structure, states and flow. Sizes, colors and motion values are the handoff's, added to
`DESIGN.md` first (Principle V).

## 1. Surfaces

| Surface | Route | Status |
|---|---|---|
| Nav item "Modos de jogo" | — | **Modified**: `NAV_DESTINATIONS` (`shared/layout/nav-links/`) |
| Gameplay menu | `/modes` | **New**: `views/game-modes/` |
| Planechase: no game | `/modes/planechase` | **New**: `views/planechase/` |
| Planechase: game (wide console / mobile dock) | `/modes/planechase` | **New**: same view, plus `shared/gameplay/*` |
| Como jogar | `/modes/planechase/rules` | **New**: `views/planechase-rules/` |
| Baralho planar (deck settings) | `/modes/planechase/deck` | **New**: `views/planechase-deck/` |

All of them are routed pages inside `.view-area`. None is a modal (FR-001).

## 2. Layout

### Gameplay menu
```text
h1 Modos de jogo
[ app-action-row: Planechase | Um baralho de planos compartilhado pela mesa. | Abrir/Continuar ]
```
It's a column with a max width of 720px. Mobile and wide share the same layout.

### Planechase: no game
```text
            eyebrow  Nenhuma partida
                 h1  Planechase
   copy  Planos mudam as regras da mesa. Um baralho só, compartilhado por todos — funciona sem internet.
        [Iniciar partida (primary)] [Como jogar]
              link-btn  Baralho: {n} cartas ativas
   (refused start) role=alert: {motivo} · link-btn Ajustar baralho
```
It's a centered column with a max width of 480px.

### Planechase: game, wide (> 640px)
```text
┌ console (role=status, aria-live=polite) ─────────────────────────────────────────┐
│ eyebrow Dado planar · próxima rolagem {N}     [Desfazer][Zerar custo][Planeswalk] │
│ title   {result}                                            [Rolar dado planar]   │
│ sub     {detail}                                                                  │
└───────────────────────────────────────────────────────────────────────────────────┘
┌ plane (1fr 1fr) ─────────────────────────────────────────────────────────────────┐
│ [image 1.4:1 + flair layers]     h2 {Name EN}                                     │
│                                  {type line}                                      │
│                                  {static text}                                    │
│                                  ┌ plate: Caos / Ao encontrar ┐ (lit per FR-011) │
└───────────────────────────────────────────────────────────────────────────────────┘
footer (hairline):                      link-btns Como jogar · Baralho · Reiniciar planos · Encerrar partida
```
- The column has a max width of 1120px.
- **Spec override**: the handoff's footer counts ("{u} usados · {a} disponíveis") are **not
  rendered** (FR-012), and the footer is right-aligned.

### Planechase: game, mobile (≤ 640px)
```text
h2 Planechase
[image]
{Name} / {type} / {text} / plate
[Como jogar][Baralho]
[Reiniciar planos][Encerrar partida]
── dock (sticky bottom, R16) ─────────────
{result}                        Próxima: {N}
{detail}
[Desfazer][Planeswalk][Zerar custo]
[Rolar dado planar ───────────────── block]
```
- The handoff's header counts are dropped (FR-012).

### Como jogar
- Wide: a sticky TOC on the left ("Nesta página" plus 7 anchors) and the article (max 62ch).
- Mobile: the article only.
- Header: a ghost button, "Voltar à partida" or "Voltar", then `h1` "Como jogar" and the intro.
- Sections: O que é · Baralho compartilhado · Início · Controlador planar · Dado planar ·
  Planeswalk · Caos e fenômenos.
- The **Planeswalk** section also explains the app's "Planeswalk" button. Use it whenever a card or
  effect says to planeswalk, or when the table rolled a physical die. When a card changes what a
  roll means (e.g. Chaotic Aether), follow the card over the app's result. Proposed copy: "O botão
  Planeswalk troca de plano sem rolar o dado. Use quando uma carta mandar fazer planeswalk ou
  quando a mesa usar um dado físico. Se uma carta mudar o que o dado faz, vale o texto da carta."
  It's added to the handoff's section text and needs the maintainer's review.

### Baralho planar
```text
[← Voltar]  h1 Baralho planar        {n} de {total} cartas · {f} fenômenos (aria-live)
hint  Toque numa carta para ativar ou desativar. Nada muda até você salvar.
notice (muted text, when < 40 or > 2 phenomena)
per set:  [▾ {Set EN} · {on} de {total}]            Ativar todos · Desativar todos
          tile grid (auto-fill minmax 150px; mobile 2 cols) — hidden when collapsed
footer (pinned): error (role=alert) · [Cancelar] [Salvar]
          or inline confirm: Salvar reinicia a partida em andamento. … [Manter partida] [Salvar e reiniciar]
```
- The view is a grid (`minmax(0,1fr) auto`) with a scrolling body and a pinned footer.
- The set header is a disclosure button with `aria-expanded`. Sets start expanded, and the collapsed
  state isn't saved (FR-017).

## 3. States

| State | Visible changes | Source |
|---|---|---|
| Menu with no game | verb "Abrir" | FR-001 |
| Menu with a game | verb "Continuar" | FR-001 |
| No game | intro + Iniciar partida | US1-3 |
| Start refused | alert with the reason + "Ajustar baralho" → deck | FR-007 |
| Start | result "Plano inicial" / "{name} abre a partida. Role o dado na fase principal do seu turno." | FR-007 |
| Blank roll | "Nada acontece" / "O plano continua o mesmo." | FR-008 |
| Chaos roll | "Caos" / "Resolva a habilidade de caos destacada abaixo.", plate lit, chaos flair | FR-011, FR-011a |
| Chaos roll on a plane with no chaos ability | "Caos" / "Este plano não tem habilidade de caos.", no plate | R2 |
| Die planeswalk | "Planeswalk" / "{prev} foi para os usados.", planeswalk flair | FR-010 |
| Manual planeswalk | "Planeswalk" / "{prev} foi para os usados. O custo do dado não muda.", flair | FR-010 |
| Zerar custo | "Custo zerado" / "A próxima rolagem custa {0}." | FR-009 |
| Phenomenon pending | eyebrow "Fenômeno", "Fenômeno encontrado" / "Resolva o efeito na mesa e conclua para seguir ao próximo plano."; primary "Concluir encontro"; Zerar custo, Planeswalk, Reiniciar planos disabled; plate lit | FR-010 |
| Encounter resolved | "Encontro resolvido" + flair to the next card | US3-3 |
| All used | eyebrow "Planeswalk pendente", "Todos os planos foram usados" / "Reiniciar devolve os planos usados ao baralho e conclui o planeswalk."; actions Desfazer + primary Reiniciar planos; roll, Planeswalk and Zerar custo disabled | FR-013 |
| Reset (anytime) | "Planos reiniciados" / "Os planos usados voltaram ao baralho." | FR-013 |
| Confirm reset / end | the console (or dock) becomes an inline `alertdialog` with a danger border | US4-4 |
| Desfazer | enabled only when the undo slot is set | FR-015a |
| Image loading / unavailable | placeholder box with the name; "Imagem indisponível sem conexão" once the load fails | FR-006 |
| English fallback | same layout, English type line and text | FR-004a |
| Deck: draft invalid on Salvar | a blocking alert; the draft stays open | FR-019 |
| Deck: size notice | muted notice; saving is still allowed | FR-019 |
| Deck: game in progress + changed | the footer becomes the inline confirm | FR-022 |
| Deck: collapsed set | only the header row is shown; its tiles aren't rendered (no image loads) | FR-006, FR-017 |

The sub lines "Planos reiniciados" / "Os planos usados voltaram ao baralho." and "Este plano não tem
habilidade de caos." are not in the handoff (R17). The maintainer approved them on 2026-09-27.

## 4. Interaction flow

```text
Nav "Modos de jogo" → /modes → row → /modes/planechase
  no game: Iniciar partida → validate → game | alert → Ajustar baralho → /deck
  game: actions mutate in place; Reiniciar planos / Encerrar partida → inline confirm → Cancelar | verb
  Como jogar → /rules → Voltar (à partida) → /modes/planechase  (the game is untouched)
  Baralho → /deck → Cancelar | Voltar | any nav → draft discarded, silently
                   Salvar → invalid: alert | no game or unchanged: save → /modes/planechase
                                          | game + changed: confirm → Manter partida (stay) | Salvar e reiniciar → save + new game → /modes/planechase
```
- **Focus after a transition**: the new route's `h1`. After an inline confirm, focus goes to its
  Cancelar button, and returns to the triggering link on Cancelar.

## 5. Design-system reuse

- **Reused**:
  - Tokens, `.btn` (primary/secondary/ghost/danger/block), `.link-btn`, `.eyebrow`,
    `.micro-label`, `.plate`, `.divider`
  - `app-action-row` (the menu)
  - `_breakpoints.scss` (`bp.mobile`, `bp.wide`)
  - `media-query.ts` (reduced motion, mobile)
  - The glow tokens (`--glow-title`, `--glow-button`, `--glow-plate-hover`)
- **New, added to `DESIGN.md` before they're built**: the game console (with its inline confirm
  variant), the phone dock, the lit ability plate, the card image frame with its placeholder, the
  card tile (on/off bead), the collapsible set group, and the two flairs (planeswalk light front,
  chaos shockwave).
  - Each is required by the handoff and has no existing equivalent. Plates exist, but not a lit
    state, and no tile or dock exists.

## 6. Accessibility

- **Console and dock**: the result is in a `role="status" aria-live="polite"` region (FR-008). Each
  roll's announcement is "{result}. {detail}".
- **Inline confirms**: `role="alertdialog"` with `aria-labelledby` and `aria-describedby`. Esc
  cancels.
- **Tiles**: native `<button aria-pressed>` with `aria-label="{name}, plano|fenômeno"` (FR-017).
  When the image is missing, the visible name shows.
- **Card image**: `alt="{name}"`. Flair layers are `aria-hidden`.
- **Set headers**: `<button aria-expanded aria-controls>`. The deck counter is `aria-live="polite"`.
- **Targets and focus**: all targets are at least 44px. Focus uses the global
  `outline: 2px solid var(--role-accent)`.
- **Reduced motion**: no flairs, the plate-lit transition is instant, and the content just swaps
  (FR-011a).
- **Language**: `lang="en"` on card names, English set names, and the English fallback text, so
  screen readers switch voice.

## 7. Copy (PT-BR, in `planechase-copy.ts`)

Everything else is the handoff's copy verbatim (states table above, plus §2 labels).

| Key | Text |
|---|---|
| nav | Modos de jogo |
| menu row | Planechase · Um baralho de planos compartilhado pela mesa. · Abrir / Continuar |
| refused start: too few | Seu baralho salvo tem {n} cartas ativas; são necessárias pelo menos 10. |
| refused start: no plane | Seu baralho salvo não tem nenhum plano ativo. |
| refused start: link | Ajustar baralho |
| reset confirm | Reiniciar planos? · Os planos usados voltam ao baralho. O plano atual continua na mesa. · Reiniciar planos |
| end confirm | Encerrar partida? · A partida some deste aparelho. Seu baralho continua salvo. · Encerrar partida |
| deck errors | Ative pelo menos 10 cartas para salvar — agora são {n}. / Ative pelo menos um plano para salvar. |
| deck notice | Menos de 40 cartas ou mais de 2 fenômenos: a regra pede ao menos 10 × o número de jogadores e no máximo 2 fenômenos por jogador. Dá para salvar mesmo assim. |
| deck confirm | Salvar reinicia a partida em andamento. · Um novo plano inicial é sorteado com o baralho novo. · Manter partida · Salvar e reiniciar |
| image missing | Imagem indisponível sem conexão |
| tile type | plano / fenômeno |
