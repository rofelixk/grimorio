---
id: D001
titulo: Manter um registro de decisões do projeto
status: aceita
data: 2026-09-08
dominio: processo
depende_de: []
restringe: [D002]
substitui: []
substituida_por: null
tags: [processo, transparencia, avaliacao]
resumo: >
  Todo o projeto será construído em colaboração com IA e cada etapa é avaliada;
  portanto cada decisão relevante — técnica, de produto ou de processo — precisa
  de registro escrito do contexto e do motivo, não só do resultado no código.
---

# D001 — Manter um registro de decisões do projeto

## Contexto
O Grimório é um trabalho de curso em que **cada etapa do processo é avaliada**,
não apenas o produto final. Toda a fase de discovery e boa parte da implementação
acontecem em colaboração com IA, onde o raciocínio fica na conversa e se perde
depois. O código sozinho mostra *o que* foi feito, nunca *por que* — e uma
racionalização escrita depois do fato não é confiável nem demonstra processo.

Uma versão anterior do projeto já tinha chegado a um CRUD de baralhos Commander,
integração com Supabase e OCR por câmera, sem nenhuma trilha de decisão. Isso
motivou reverter para um esqueleto e recomeçar com registro desde o início
(ver [D003](0003-reverter-para-hello-world.md)).

## Decisão
Manter, dentro do repositório, um registro de decisões: um documento por decisão
relevante, com contexto, alternativas consideradas e consequências. O registro é
público e faz parte do que será avaliado.

Escopo amplo — decisões técnicas, de produto, de escopo e de processo —, mas
decisões fora do âmbito técnico são mantidas o mais enxutas possível.

## Alternativas consideradas
- **Não manter registro; confiar no histórico git e no código.** Rejeitada: o
  git mostra o *que* mudou, não o *porquê*; e o raciocínio de discovery
  raramente vira commit.
- **Documentar tudo retroativamente ao final.** Rejeitada: racionalização
  pós-fato não é confiável e não demonstra o processo que o curso avalia.
- **Manter as anotações fora do repositório** (ferramenta externa, wiki). Rejeitada:
  quebra o vínculo com o commit correspondente e some da revisão.

## Consequências
- Cada decisão relevante a partir daqui gera uma entrada antes ou junto do commit
  que a implementa.
- A forma concreta do registro (formato, numeração, tiers) é definida em
  [D002](0002-estrutura-do-registro-de-decisoes.md).
- Há um custo recorrente de escrita; mitigado mantendo entradas curtas e um
  template pronto.

## Referências
- [D002](0002-estrutura-do-registro-de-decisoes.md) — estrutura do registro
- [D003](0003-reverter-para-hello-world.md) — reversão que tornou isso urgente
- `backlog/VibeCoding/` — contexto da versão anterior, sem trilha de decisão
