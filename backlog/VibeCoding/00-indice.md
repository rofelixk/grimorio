# VibeCoding — índice

Reunião de todas as informações importantes do Grimório antes da reversão ao estado
"Hello World" (2026-09-08). Material sintetizado a partir de `README.md`, `CLAUDE.md`,
`docs/` e do histórico do git.

| Documento | Conteúdo |
|---|---|
| [01-proposta-e-valores.md](01-proposta-e-valores.md) | O que é o app, para quem, e os quatro valores que guiam as decisões. |
| [02-especificacoes-tecnicas.md](02-especificacoes-tecnicas.md) | Stack, arquitetura, convenções de código, estrutura de pastas, comandos. |
| [03-modelo-de-dados.md](03-modelo-de-dados.md) | Resumo do que era persistido no Supabase e por quê. Detalhe completo em `originais/docs/data-model.md`. |
| [04-escopo-mvp-e-roadmap.md](04-escopo-mvp-e-roadmap.md) | Escopo dentro/fora do MVP, roadmap de 6 semanas, fases futuras. |
| [05-historico-de-versoes.md](05-historico-de-versoes.md) | Linha do tempo das versões (commits/PRs), o que mudou em cada uma e o papel da IA. |
| [06-uso-de-ia.md](06-uso-de-ia.md) | Declaração de diligência sobre IA, princípio de colaboração, guardrails configurados. |
| [07-estudos-de-caso-ia.md](07-estudos-de-caso-ia.md) | Dois estudos de caso detalhados de colaboração com IA (busca de cartas; redesign multi-plataforma). |
| [08-contexto-de-design.md](08-contexto-de-design.md) | Estado visual do app e limites de escopo para trabalho de design. |
| [originais/](originais/) | Cópia verbatim de `README.md`, `CLAUDE.md`, toda a pasta `docs/`, os `settings.json` do Claude Code e o `.env.example`. |

## Referência rápida de estado

- **Ponto de partida:** `56d8e24` (Initial commit) — Angular vazio.
- **Versão mais completa antes da reversão:** `791b819` (2026-09-05), branch `main`.
- **Reversão para "Hello World":** branch `reset/hello-world`, 2026-09-08.
- Todo commit substantivo entre esses pontos tem `Co-Authored-By: Claude Sonnet 5`.
