---
id: D002
titulo: Estrutura do registro de decisões — ADRs numerados, resumo à mão, tier 3 adiado
status: aceita
data: 2026-09-08
dominio: processo
depende_de: [D001]
restringe: []
substitui: []
substituida_por: null
tags: [processo, documentacao, platform-awareness]
resumo: >
  O registro tem dois níveis mantidos à mão — um documento por decisão em
  docs/decisions/ e um resumo de uma linha por decisão em docs/decisoes-resumo.md.
  Um terceiro nível estruturado para leitura por IA fica adiado e, quando existir,
  será gerado a partir do frontmatter, não escrito à mão.
---

# D002 — Estrutura do registro de decisões

## Contexto
[D001](0001-manter-registro-de-decisoes.md) definiu que haverá um registro de
decisões, mas não a forma. O registro precisa servir três leituras com pesos
diferentes:

1. **Humano avaliando o processo** — quer contexto, alternativas, consequências.
   Verboso, narrativo.
2. **Humano com pressa / IA no meio de uma conversa** — quer a decisão e o motivo
   em uma linha, com link para o resto.
3. **IA reconstruindo o grafo de decisões** — quer os campos estruturados
   (dependências, substituições) sem prosa.

O erro a evitar é manter os três à mão: vira escrituração em triplicata, os três
divergem, e quando divergem não se sabe qual é a verdade.

## Decisão
Manter **duas** fontes escritas à mão e tratar a terceira como derivada:

- **Nível 1 — ADRs.** Um arquivo Markdown por decisão em `docs/decisions/`,
  nome `NNNN-slug-sem-acentos.md`, numeração de 4 dígitos com zero à esquerda.
  ID no texto é `DNNN`. Cada arquivo tem frontmatter YAML (schema abaixo) e corpo
  com seções fixas: Contexto, Decisão, Alternativas consideradas, Consequências,
  Referências. Base em `docs/decisions/_template.md`. Idioma: português, como
  todo material público do projeto.
- **Nível 2 — resumo.** `docs/decisoes-resumo.md`, uma linha por decisão
  (ID, título, motivo em uma frase, data, status), mantido à mão.
- **Nível 3 — dados estruturados.** Adiado. Quando houver decisões suficientes
  para justificar (~10), um script gera um arquivo estruturado a partir do
  frontmatter dos ADRs. Nunca editado à mão, portanto não diverge. Não é
  pré-requisito de nada agora.

O `README.md` aponta para os níveis 1 e 2.

### Schema do frontmatter
| campo            | valores / formato                                             |
|------------------|--------------------------------------------------------------|
| `id`             | `DNNN`                                                       |
| `titulo`         | texto curto                                                 |
| `status`         | `proposta` \| `aceita` \| `rejeitada` \| `substituída` \| `obsoleta` |
| `data`           | `AAAA-MM-DD` — quando a decisão foi tomada                   |
| `registrada_em`  | `AAAA-MM-DD` — só quando ≠ `data` (registro retroativo)     |
| `dominio`        | `processo` \| `produto` \| `tecnica` \| `escopo`            |
| `depende_de`     | lista de IDs                                                |
| `restringe`      | lista de IDs de decisões futuras que esta limita           |
| `substitui`      | lista de IDs que esta torna obsoletos                      |
| `substituida_por`| ID único ou `null`                                          |
| `tags`           | lista livre                                                 |
| `resumo`         | 1–2 frases; base da linha no nível 2                        |

## Alternativas consideradas
- **Um único diário cronológico** (`docs/DIARIO-DECISOES.md`). Rejeitada: cresce
  demais, difícil linkar uma decisão específica, editar entradas antigas parece
  errado.
- **Manter os três níveis à mão.** Rejeitada: escrituração em triplicata,
  divergência garantida.
- **Nível 3 agora, escrito à mão.** Rejeitada: custo alto, valor marginal sobre
  o nível 2 antes de existir um grafo de decisões grande; melhor derivar depois.
- **Frontmatter e chaves em inglês** (padrão MADR). Rejeitada: não há tooling
  MADR no projeto e todo o material público é em português; chaves em português
  ficam consistentes.

## Consequências
- Toda nova decisão: copiar `_template.md`, preencher, adicionar uma linha em
  `docs/decisoes-resumo.md`.
- As arestas do grafo (`depende_de`, `restringe`, `substitui`) são escritas à mão
  no frontmatter, só onde existem. São o que o nível 3 vai consumir.
- Se a estrutura precisar mudar, esta decisão é substituída por outra ADR; o
  nível 1 continua válido, só muda a forma.

## Referências
- [D001](0001-manter-registro-de-decisoes.md) — decisão de manter o registro
- `docs/decisions/_template.md` — template das ADRs
- `docs/decisoes-resumo.md` — nível 2
