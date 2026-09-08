---
description: Fecha a sessão de trabalho — resume o que mudou e rascunha a entrada no registro de decisões para revisão.
disable-model-invocation: true
shell: bash
allowed-tools: Read Write Bash(git status:*) Bash(git diff:*) Bash(git log:*)
---

# Fechar sessão

Ritual combinado: ao final de uma sessão de discovery ou discussão, rascunhar a(s)
entrada(s) de decisão para o Rodrigo revisar. A estrutura e as convenções estão em
`docs/decisions/0001-manter-registro-de-decisoes.md` e
`docs/decisions/0002-estrutura-do-registro-de-decisoes.md`.

## Contexto da sessão

Working tree:
!`git status --short`

Diff não commitado (resumo):
!`git diff --stat HEAD`

Commits recentes (identifique quais são desta sessão):
!`git log --oneline -12`

ADRs existentes (para achar o próximo número):
!`ls docs/decisions`

## Tarefa

1. **Resuma** em 3–5 bullets o que foi discutido e decidido nesta sessão. Em português.

2. **Decida se houve decisão que merece registro.** Merece ADR o que muda o rumo do
   projeto — técnico, de produto, de escopo ou de processo. Se nada se firmou, diga
   isso e pare: entrega só o resumo.

3. **Para cada decisão firmada**, rascunhe um arquivo novo em `docs/decisions/`:
   - Nome `NNNN-slug-sem-acentos.md`, próximo número de 4 dígitos.
   - Base em `docs/decisions/_template.md`; preencha **todo** o frontmatter.
   - `status: proposta`, salvo se o Rodrigo já confirmou a decisão nesta sessão — aí `aceita`.
   - Corpo em português: Contexto, Decisão, Alternativas consideradas, Consequências,
     Referências. Conteúdo real, sem placeholders.
   - Preencha as arestas do grafo: `depende_de`, `restringe`, `substitui`.
   - `data:` = hoje. Use `registrada_em:` só se a decisão foi tomada antes.

4. **Atualize** `docs/decisoes-resumo.md` — uma linha por nova decisão, no formato das
   linhas que já existem lá.

5. **Não faça commit.** Apresente os rascunhos. O Rodrigo edita, ajusta o `status` e
   commita (Conventional Commits em pt-BR).

## Se a sessão mexeu em discovery e não em decisões

Atualize o artefato relevante em `docs/discovery/` em vez de criar um ADR, e diga o
que mudou.
