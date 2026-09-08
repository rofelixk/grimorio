---
id: D003
titulo: Reverter o projeto para um esqueleto Angular "Hello World"
status: aceita
data: 2026-09-08
dominio: processo
depende_de: []
restringe: []
substitui: []
substituida_por: null
tags: [escopo, platform-awareness, processo]
resumo: >
  A versão anterior tinha CRUD de baralhos, Supabase e OCR por câmera, mas
  nenhum registro de por que foi feita assim. Reverter para um esqueleto mínimo
  e reconstruir com trilha de decisão desde o início, já que o curso avalia o
  processo e não só o resultado.
---

# D003 — Reverter o projeto para um esqueleto Angular "Hello World"

## Contexto
Registrada retroativamente na mesma data em que ocorreu (commits `24cc869` e
`819133c`, 2026-09-08), como primeira aplicação do processo definido em
[D001](0001-manter-registro-de-decisoes.md).

O projeto já tinha chegado a: CRUD de baralhos Commander (comandante, identidade
de cor, singleton), autenticação e persistência via Supabase, e leitura de carta
por câmera com `tesseract.js`. Todo esse trabalho foi feito em modo "vibe coding",
sem registro do raciocínio. O curso avalia cada etapa do processo; entregar código
pronto sem trilha de decisão não demonstra o que precisa ser demonstrado.

## Decisão
Reverter o projeto para um esqueleto Angular mínimo — uma rota exibindo
"Hello World" — e reconstruir a partir daí com registro de decisões desde o
commit inicial. O contexto da versão anterior (proposta, especificações, modelo
de dados, histórico de uso de IA) foi preservado em `backlog/VibeCoding/` antes
da reversão.

## Alternativas consideradas
- **Manter o código e documentar as decisões retroativamente.** Rejeitada:
  racionalização pós-fato não é confiável nem demonstra processo; e seriam muitas
  decisões implícitas para reconstruir de memória.
- **Começar um repositório novo do zero.** Rejeitada: perde o histórico git que
  já registra a evolução e a própria reversão.
- **Manter o código e seguir em frente, registrando só daqui pra frente.**
  Rejeitada: a base herdada continuaria sem justificativa e enviesaria as
  decisões seguintes para "manter o que já existe".

## Consequências
- Perde-se o trabalho de implementação da versão anterior, mas ele era barato de
  refazer e agora será refeito com justificativa.
- Decisões de implementação anteriores (Supabase, OCR, modelagem) **não** foram
  registradas como ADRs: o código correspondente não existe mais, então cada uma
  volta à mesa como decisão nova quando/se for retomada.
- O `README.md` passa a descrever o estado "Hello World" e a apontar para
  `backlog/VibeCoding/`.

## Referências
- Commit `819133c` — `chore!: reverte o projeto para um esqueleto Angular "Hello World"`
- Commit `24cc869` — `docs: adiciona backlog/VibeCoding com o contexto do projeto antes da reversão`
- [D001](0001-manter-registro-de-decisoes.md) — processo aplicado aqui
- `backlog/VibeCoding/` — contexto preservado da versão anterior
