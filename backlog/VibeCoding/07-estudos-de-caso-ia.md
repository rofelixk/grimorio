# Estudos de caso de colaboração com IA

Reprodução condensada dos dois estudos de caso de `docs/historico-ia/`. Texto integral em
[`originais/docs/historico-ia/`](originais/docs/historico-ia/).

---

## 1. Busca de cartas — especificação única + Plan Mode

**Objetivo do exercício:** testar quão completa uma funcionalidade sai de um pedido bem
detalhado desde o início.

**Pedido inicial:** uma única especificação longa (em inglês) descrevendo a searchbar da
Home — mínimo de 3 caracteres, dropdown de campo (`name` / `type_line`, padrão `name`),
botão de busca (sem buscar enquanto digita), match aproximado case-insensitive, botão
desabilitado + spinner durante o carregamento, erro logado no HTML, lista `ul/li` com
scroll próprio, 3 cards por linha, layout do card (nome/custo/valor/tipo/texto/identidade
à esquerda, imagem à direita), suítes de teste, e o card como **componente compartilhado**.
Para o primeiro escopo, só a 1ª face das cartas.

**Perguntas que o Claude levantou antes de implementar (lacunas reais):**

| Pergunta | Resposta do autor |
|---|---|
| `cards` só permite `SELECT` para autenticados, mas o app ainda não tem login — a busca falharia sempre. | Liberar `SELECT` para `anon` temporariamente (política `cards_anon_select_temporary`, a remover quando houver auth). |
| Não existe cliente/serviço Supabase no app Angular ainda. | Faz parte do escopo desta feature. |
| Cartas multiface têm `mana_cost`/`oracle_text` nulos no nível da carta — como aplicar "só a 1ª face"? | Componente sempre usa `card_faces[0]` como fallback quando o campo no nível da carta é nulo. |
| O dropdown busca em qual coluna? | Só a coluna selecionada, nunca as duas. Padrão `name`. |
| Enter no campo também dispara a busca? | Não — só o clique no botão. |
| Sem resultados? | "No results" simples. |
| Clique com < 3 caracteres? | Mensagem de validação no 1º clique, depois ao vivo conforme digita. |
| Layout 3 por linha é responsivo? | Não — fixo, propositalmente (foco em testar a capacidade, não a UX final). |

**Resultado:** implementado com **aprovação prévia de um plano (Plan Mode)**. Entregou:
cliente Supabase injetável (`@shared/config`), `CartasService` (`@shared/services`),
componente compartilhado `Cartao` (`@shared/components`), e a busca em `Inicio`. Suítes
cobrindo fallback de multiface, o serviço (mockando o cliente Supabase) e o fluxo de busca
(validação, carregamento, erro, sucesso, vazio). `npm test` e `npm run build` rodados e
conferidos antes da entrega.

---

## 2. Redesign de `/colecao` — fluxo entre três ferramentas de IA

Cobre uma única funcionalidade passando por **Claude.ai + Claude Design + Claude Code**.

### Etapa 1 — Claude.ai (chat web), sem ligação com o projeto

Conversa solta para pensar sobre um problema de design (a comunidade de Magic dividida
sobre sets "Universes Beyond"; o app deveria ter personas/onboarding?). Ao final, o autor
pediu ao Claude.ai para gerar um prompt pronto para o Claude Design.

**Problema:** o prompt gerado **inventou um app genérico** de "companion MTG" — meta
snapshot, tracking de preço, marketplace de trocas, buscador de eventos/LGS, personas por
onboarding, tudo como app **mobile nativo**. Nada disso existe no escopo do Grimório (app
web pessoal de coleção/deck para Commander). A conversa nunca foi ancorada no projeto real
porque não tinha acesso a ele.

### Etapa 2 — de volta ao Claude Code: diagnóstico

O autor colou a conversa no Claude Code e pediu avaliação. Diagnóstico: o prompt não
estava ruim por má escrita, e sim por **falta de ancoragem** — pedir para uma ferramenta
"puxar contexto do repositório" é caro (teria que vasculhar todo o `CLAUDE.md`, focado em
engenharia, para achar a fração relevante para design) e não garante que ela ache os
limites reais.

**Decisão:** criar `docs/design-context.md` — arquivo pequeno, só com o que uma ferramenta
de design precisa (telas reais, estado visual atual, fora-de-escopo explícito, contexto de
marca), linkado do `CLAUDE.md`.

Uma correção aconteceu já na escrita desse arquivo: a 1ª versão descreveu a paleta de 8
cores das coleções (`PALETA_CORES_COLECAO`) como "decisão de design fechada". O autor
corrigiu — é só um placeholder, a ser substituído por um seletor de duas cores baseado na
roda de cores WUBRG do próprio Magic.

### Etapa 3 — Claude Design, com acesso ao GitHub

Com `design-context.md` publicado e linkado, o autor pediu ao Claude Design para lê-lo
antes de qualquer coisa. **Resultado:** pacote de handoff (`design_handoff_colecao_1e/`)
com `README.md` detalhado (medidas, breakpoints, tokens, estados de interação) e protótipo
HTML navegável, opção "1e" escolhida entre variações. O handoff respeitou os limites: não
inventou paleta/marca nova, manteve a paleta como placeholder lido de `@shared/constants`,
preservou o rodapé de atribuição legal, e sinalizou decisões em aberto ("confirm before
building") em vez de assumi-las.

### Etapa 4 — de volta ao Claude Code: decisão e implementação

O Claude Code leu o handoff e levantou as três decisões que o próprio `README.md` marcava
como pendentes:

| Decisão em aberto | Resposta do autor |
|---|---|
| Nav do cabeçalho virar bottom tab bar nova no mobile? | Mais simples: reposicionar o cabeçalho existente como rodapé fixo no mobile, em todas as páginas, sem tab bar nova. |
| Onde ficam Edit/Delete de uma coleção no mobile? | Mover para a tela da própria coleção (`/colecao/:id`), nos dois breakpoints. |
| A folha de busca no mobile precisa arrastar de verdade? | Toggle simples basta. |

Implementado em `colecao.ts/html/css`, `colecao-detalhe.ts/html/css` e `app.css`
(reordenação via flex `order`, sem duplicar markup). `npm test` e `npm run build` antes da
entrega.

**Achado à parte:** rodar os testes revelou uma regressão já em `main` — dois barris
(`shared/services/index.ts`, `shared/components/index.ts`) com exports faltando desde um
commit anterior da mesma sessão (erro do processo de dividir commits). Corrigido junto
(commit `c49b80e`).

### Lições sobre o fluxo entre ferramentas

- **Claude.ai solto (sem o repo) é bom para pensar em voz alta, ruim para especificar.** A
  mesma pergunta, ancorada no Claude Code, teria evitado o desalinhamento inteiro.
- **"Deixa a IA puxar o contexto sozinha" é caro e impreciso.** Um arquivo pequeno e
  deliberado (`design-context.md`) apontado explicitamente rendeu um handoff muito mais
  alinhado.
- **Cada ferramenta no que faz melhor:** Claude.ai para explorar problema aberto, Claude
  Design para proposta visual navegável, Claude Code para trade-offs de produto,
  implementação no código real e rodar os testes.
