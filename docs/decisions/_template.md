---
id: DNNN
titulo: Título curto e descritivo da decisão
status: proposta            # proposta | aceita | rejeitada | substituída | obsoleta
data: AAAA-MM-DD
registrada_em: AAAA-MM-DD   # só quando ≠ data (decisão registrada retroativamente)
dominio: tecnica            # processo | produto | tecnica | escopo
depende_de: []              # IDs de decisões das quais esta depende
restringe: []               # IDs de decisões futuras que esta limita
substitui: []               # IDs que esta decisão torna obsoletos
substituida_por: null       # ID que torna esta obsoleta
tags: []
resumo: >
  Uma ou duas frases que resumem a decisão e o motivo principal. Este texto
  é a base da linha correspondente em docs/decisoes-resumo.md.
---

# DNNN — Título curto e descritivo da decisão

## Contexto
Situação e forças em jogo. O que motivou a decisão, quais restrições existiam,
o que estava em disputa.

## Decisão
O que foi decidido, em uma ou duas frases.

## Alternativas consideradas
- **Alternativa X.** Por que foi rejeitada.
- **Alternativa Y.** Por que foi rejeitada.

## Consequências
- O que muda a partir daqui — efeitos bons e ruins.

## Referências
- Commits, links, outras decisões.
