---
id: D004
titulo: Adicionar um CLAUDE.md mínimo como camada de orientação para assistentes de IA
status: aceita
data: 2026-09-08
dominio: processo
depende_de: [D001, D002, D003]
restringe: []
substitui: []
substituida_por: null
tags: [processo, documentacao, platform-awareness]
resumo: >
  Adicionar um CLAUDE.md enxuto na raiz que diz a qualquer assistente de IA o que
  ler (o resumo de decisões), o que ignorar (backlog/VibeCoding, que é histórico e
  não especificação) e as convenções em vigor. Não recriar o CLAUDE.md grande
  anterior, que descrevia a implementação revertida.
---

# D004 — Adicionar um CLAUDE.md mínimo como camada de orientação para IA

## Contexto
[D001](0001-manter-registro-de-decisoes.md) e
[D002](0002-estrutura-do-registro-de-decisoes.md) montaram um registro de decisões
voltado a humanos. Quem clonar o repositório — ou o assistente de IA dessa pessoa —
não tem nenhum ponteiro para esse registro, e provavelmente trataria
`backlog/VibeCoding/` como especificação viva em vez de contexto histórico de uma
versão revertida (ver [D003](0003-reverter-para-hello-world.md)).

`CLAUDE.md` na raiz é o ponto de entrada convencional que ferramentas de IA
procuram primeiro. Existia um antes da reversão (commit `bd0a35a`, removido em
`819133c`), mas era extenso e ancorado em `docs/project-brief.md`,
`docs/data-model.md` e `docs/design-context.md` — todos descreviam a implementação
que não existe mais.

## Decisão
Adicionar um `CLAUDE.md` novo e enxuto na raiz, em inglês (convenção de idioma para
docs de trabalho), limitado ao que é verdade hoje:

- o que é o projeto e o estado atual ("Hello World", revertido);
- **ler primeiro** o `docs/decisoes-resumo.md`, ADRs completos sob demanda;
- **ignorar** `backlog/VibeCoding/` para análise de código — é histórico, não
  especificação;
- convenções em vigor: fluxo do registro de decisões, divisão de idioma por
  público, formato de commit, quem roda os comandos de verificação.

Cresce junto com o projeto. Convenções de código do CLAUDE.md antigo (identificadores
em pt-BR, prefixo `I` em interfaces, alias `@shared/*`, arquitetura Supabase/Scryfall)
**não** são reaproveitadas aqui: cada uma volta como ADR própria quando o código
correspondente for retomado.

## Alternativas consideradas
- **Não ter CLAUDE.md; confiar no README.** Rejeitada: o README é público, em
  pt-BR, voltado a quem usa/contribui, e não diz "esta pasta é morta, não
  implemente a partir dela"; ferramentas de IA procuram `CLAUDE.md`
  especificamente.
- **Colocar a orientação de IA no próprio README.** Rejeitada: mistura públicos e
  idiomas; o README fica em pt-BR e orientado a humanos.
- **Restaurar o CLAUDE.md grande anterior e podar.** Rejeitada: quase nada dele é
  verdade agora; começar do mínimo é mais honesto e mais barato de manter.

## Consequências
- Mais um documento a manter atualizado; mitigado mantendo-o curto e apontando
  para o registro de decisões em vez de duplicá-lo.
- A orientação "ler / ignorar" precisa ser revista se `backlog/VibeCoding/` algum
  dia for promovido de volta a especificação ativa.
- Quando convenções de código forem re-ratificadas por ADR, o CLAUDE.md ganha um
  resumo delas com link para a decisão.

## Referências
- [D001](0001-manter-registro-de-decisoes.md), [D002](0002-estrutura-do-registro-de-decisoes.md), [D003](0003-reverter-para-hello-world.md)
- `CLAUDE.md` — arquivo adicionado por esta decisão
- Commit `bd0a35a` (CLAUDE.md original) / `819133c` (remoção na reversão)
- `backlog/VibeCoding/` — contexto histórico da versão anterior
