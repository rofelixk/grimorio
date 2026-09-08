# Histórico de versões

Linha do tempo do Grimório do commit inicial até o ponto imediatamente anterior à
reversão "Hello World". Reconstruída do `git log` da branch `main`. Todo commit
substantivo tem o trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` — a
coluna "Papel da IA" resume *como* a IA participou, seguindo o princípio "delegar o
conhecido, colaborar no que se aprende".

Datas: 2026-09-04 e 2026-09-05 (o projeto foi construído em ~2 dias). Reversão em
2026-09-08.

## Marco 0 — Fundação e documentação (docs-first)

| Commit | Assunto | Papel da IA |
|---|---|---|
| `56d8e24` | Initial commit | — |
| `bd0a35a` | Adiciona brief do projeto e `CLAUDE.md` | Colaboração — redação do brief e do CLAUDE.md a partir da visão do autor |
| `8b9f843` | Registra decisão de frontend Angular e fluxo de trabalho (troca React/Next.js por Angular) | Colaboração — documentar decisão e o "porquê" |
| `2172c29` | Scaffold do projeto Angular 22 com Jest (Home + rotas `/decks` e `/collection`, specs) | Delegação — boilerplate de scaffold |
| `b22c4a0` | Adota banco local de cartas via bulk data do Scryfall no MVP (era Fase 2) | Colaboração — decisão de arquitetura de backend, com racional documentado |
| `161a2b9` | Grava id de analytics do Angular CLI no workspace | Delegação — chore |
| `7ed110c` | Adiciona `docs/data-model.md` e conecta a documentação pelo README | Colaboração — modelagem de dados, campo a campo |
| `39bda28` | Define convenção de idioma por público da documentação | Colaboração — convenção de processo |
| `c49f56d` | Adota `card_faces` em JSONB e filtro de importação ampliado | Colaboração — decisão de schema (JSONB vs tabela relacional) |
| `9c462ad` | Adiciona `.gitattributes` para normalizar fim de linha em LF | Delegação — chore |
| `9931544` | Adiciona declaração de diligência sobre uso de IA (no README) | Colaboração — redação da declaração |
| `561dca8` | Bloqueia leitura de arquivos `.env` pelo Claude Code (guardrail) | Colaboração — configurar guardrail de segurança |
| `0871f05` | Interfaces e constantes de carta compartilhadas com alias `@shared` | Delegação — boilerplate de shared code |
| `0b919e3` | Define convenção de nomenclatura pt-BR para identificadores | Colaboração — convenção de código |
| `6229882` | Renomeia páginas para pt-BR (Home/Decks/Collection → Início/Baralhos/Coleção) | Delegação — refactor mecânico |
| `927a8b2` | Script de importação de cartas do Scryfall para o Supabase | Colaboração — backend/ingestão (área de aprendizado); script marcado como "nunca rodar via IA" |
| `b074312` | Permite Claude rodar `npm install/test/build`; restringe scripts que acessam Supabase/Scryfall | Colaboração — definir guardrails de execução |

## Marco 1 — Busca de cartas (PR #1, `feature/busca-de-cartas`)

| Commit | Assunto | Papel da IA |
|---|---|---|
| `8d77f3e` | Busca de cartas na página Início com componente de carta compartilhado | Colaboração via **Plan Mode** — ver estudo de caso em `07-estudos-de-caso-ia.md`. Cliente Supabase injetável, `CartasService`, componente `Cartao`, suítes de teste |
| `b6c267d` | Merge PR #1 | — |

## Marco 2 — Autenticação (PR #2, `feature/autenticacao`)

| Commit | Assunto | Papel da IA |
|---|---|---|
| `6199302` | Autenticação por email/senha com guard nas rotas protegidas | Colaboração — auth é área de aprendizado de backend; mão leve e explicativa |
| `00d0125` | Merge PR #2 | — |

## Marco 3 — Cartas dupla-face e créditos (PR #3, `feature/carta-dupla-face-creditos`)

| Commit | Assunto | Papel da IA |
|---|---|---|
| `e6edfe5` | Virar carta de dupla face ao clicar; corrige layout `prepare` na importação | Delegação — frontend + fix pontual |
| `31859ee` | 84 SVGs de símbolos de mana do Scryfall como assets estáticos (via API `/symbology`) | Delegação — chore de assets |
| `2ab3abf` | Aviso legal no rodapé e página `/creditos` (Fan Content Policy da WotC) | Colaboração — conformidade legal/IP |
| `c1d7881` | Merge PR #3 | — |

## Marco 4 — Layout, detalhe da carta, paginação

| Commit | Assunto | Papel da IA |
|---|---|---|
| `e03dc8f` | Script para rodar o dev server na rede local (`--host 0.0.0.0`) | Delegação — chore |
| `83afb45` | Fixa cabeçalho e rodapé; move navegação para o cabeçalho | Delegação — frontend/layout |
| `7542fee` | Utilitários de símbolos de mana e visualização de carta (`dividirEmSegmentos`, `criarVisualizacaoDeCarta`) | Delegação — utils de frontend |
| `7b7273b` | Página de detalhe da carta, paginação (`range()` do Supabase), busca persistente | Delegação/colaboração — frontend + paginação no backend |
| `cf854b0` | Tile de carta vira no hover (animação 3D) e leva ao detalhe no clique | Delegação — frontend/UX + ajustes mobile |
| `b3c5baa` | Extrai busca de cartas para componente reutilizável (`app-busca-cartas`) | Delegação — refactor |

## Marco 5 — Coleções (CRUD + detalhe)

| Commit | Assunto | Papel da IA |
|---|---|---|
| `6a6a7b4` | CRUD de coleções + página de detalhe com busca de cartas | Delegação — reaproveita arquitetura existente |
| `f403fef` | Documenta tabela `printings` para lookup por set + número | Colaboração — design de schema |
| `a648c18` | Adiciona `docs/design-context.md` para ferramentas visuais | Colaboração — ver estudo de caso multi-plataforma |
| `c49b80e` | Restaura exports faltando em barris (`shared/services`, `shared/components`) | Fix — regressão introduzida por divisão de commits em sessão anterior; descoberta ao rodar testes |
| `77f391f` | Redesenha `/colecao` (grade de binders, busca lateral/sheet, edit/delete na própria coleção) | Colaboração multi-ferramenta — Claude.ai + Claude Design + Claude Code; ver `07-estudos-de-caso-ia.md` |
| `f302d8b` | Registra estudo de caso multi-plataforma do redesign de coleções | Colaboração — redação do estudo de caso |

## Marco 6 — pt-BR, printings, scanner OCR

| Commit | Assunto | Papel da IA |
|---|---|---|
| `cc7d7f9` | Traduz interface para pt-BR e aplica fonte Inter; locale pt-BR no Angular | Delegação — tradução + config |
| `bfaffb9` | Adiciona tabela `printings` e migra ingestão para *Default Cards*; exclui `reversible_card` | Colaboração — backend/ingestão; troca `set_code` solto por `printing_id` com FK |
| `dd02656` | Botão "Voltar" da carta retorna à página de origem (`Location.back()`) | Delegação — fix pontual |
| `cf324a5` | `tunnel:phone` (cloudflared portátil) para testar câmera via HTTPS no celular | Delegação — chore de tooling (removido depois) |
| `b573140` | Scanner de carta via câmera: input nativo + Tesseract.js resolvendo set/número contra `printings` | Colaboração — feature técnica nova (OCR), com painel de debug na tela e ajustes de memória descobertos testando no celular |

## Marco 7 — Performance e baralhos Commander

| Commit | Assunto | Papel da IA |
|---|---|---|
| `d351d17` | Adia decodificação do verso da carta para o hover (memória) | Delegação — perf |
| `45abb00` | Extrai leitura de carta por câmera para `LeitorDeCartaService` | Delegação — refactor |
| `5f68277` | Leitura de carta por câmera na busca da coleção | Delegação — reaproveita serviço |
| `52e145e` | Evita que a lista de cartas da coleção cubra o botão de câmera no mobile | Delegação — fix de layout |
| `8ee8112` | Importa `tesseract.js` sob demanda (chunk separado) — estourava orçamento de bundle de 500kB | Colaboração — diagnóstico de build/bundle |
| `0abaca0` | CRUD de baralhos Commander (comandante, identidade de cor, singleton, limite 99, seletor de impressão) | Delegação/colaboração — reaproveita arquitetura de coleções; regras de Commander em `regras-comandante.ts` |
| `791b819` | Faz link de confirmação de cadastro voltar para a origem atual (`emailRedirectTo`) | Colaboração — fix de fluxo de auth/Supabase |

## 2026-09-08 — Reversão

Branch `reset/hello-world` criada a partir de `main`. Toda funcionalidade, documentação de
produto e dependências de terceiros (Supabase, Tesseract, dotenv) removidas; o app volta a
uma única rota exibindo "Hello World". Este `backlog/` preserva o contexto anterior.
