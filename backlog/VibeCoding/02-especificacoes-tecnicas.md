# Especificações técnicas

## Stack

| Camada | Escolha | Motivo |
|---|---|---|
| **Frontend** | Angular 22 (standalone components, roteamento, zone change detection) | Área de domínio prévio do autor. O foco do curso é fluência em colaboração com IA, não aprender um framework novo — frontend fica em terreno familiar (sem React/Next.js). |
| **Backend** | Supabase (Postgres + auth + storage), plano gratuito | — |
| **Hospedagem** | Vercel, plano gratuito | — |
| **Dados de carta** | Scryfall **bulk data** (arquivos baixados, recortados e gravados no Supabase) | API ao vivo é limitada por taxa (~10 req/s), é dependência de runtime que pode cair, e o browser não consegue mandar o `User-Agent` que o Scryfall pede. O Scryfall publica bulk data justamente para isso. |
| **Testes** | Jest via `jest-preset-angular` (substitui Karma/Jasmine) | — |
| **OCR (futuro)** | tesseract.js (import dinâmico, chunk separado) | — |

Tudo roda em plano gratuito — cota e custo são tratados como restrição de design.

## Decisões centrais de arquitetura

- **Cartas indexadas por `oracle_id`** (UUID independente de idioma e de impressão), nunca
  `scryfall_id` (por impressão/idioma). Permite reconhecer a mesma carta entre idiomas e
  impressões e prepara o suporte a português sem migração de schema.
- **Banco local de cartas:** um script server-side (npm local primeiro; depois GitHub
  Action agendada) faz upsert do bulk file recortado do Scryfall na tabela `cards` usando
  a chave `service_role` — nunca no browser. Refresh ~semanal. RLS de `cards` = `SELECT`
  para usuários autenticados, escrita só via `service_role`.
- **Ingestão via *Default Cards*:** o script baixa o bulk *Default Cards* (um objeto por
  impressão); um único download popula tanto `cards` (deduplicado por `oracle_id`) quanto
  `printings` (toda linha filtrada).
- **Sistema de localização:** recipientes planos nomeados pelo usuário; confiança de
  localização sinalizada para reconferência quando a participação da carta em decks muda
  após `lastLocationUpdateDate`.
- **Busca e exibição rodam contra a cópia local** no Supabase — nenhuma chamada ao vivo
  ao Scryfall em runtime.

## Convenções de código (do CLAUDE.md)

- **Idioma por público, sem documentos bilíngues/traduzidos:**
  - Inglês: `CLAUDE.md`, tudo em `docs/` exceto o índice e `docs/historico-ia/`.
  - pt-BR: `README.md`, `docs/README.md`, `docs/historico-ia/`, e todas as mensagens de commit.
- **Identificadores de código (classes, arquivos, pastas, funções, variáveis) em pt-BR**,
  exceto convenções de framework/tooling: blocos do Angular e sufixos (`Component`,
  `Service`, prefixo `app-` de seletores), nomes de scripts npm, e termos de API/lib de
  terceiros (`fetch`, `URI`, nomes que espelham a API/schema externa como campos do
  Scryfall/Postgres).
- **Booleanos:** prefixo `eh` em vez de `is` (`ehAtivo`, não `isActive`).
- **Namespaces de interface prefixados com `I`** (ex.: `ICarta`). Dentro do namespace, o
  nome simples (`Detalhes`) é a forma canônica/armazenada; um formato que desvia ganha
  sufixo nomeando o desvio (`DetalhesRaw` = forma crua da API externa).
- **Comentários** seguem o idioma do código ao redor (pt-BR para código pt-BR).
- **Código transversal** sob `src/app/shared/` é importado via alias `@shared/*`
  (`@shared/interfaces`, `@shared/constants`, `@shared/config`, `@shared/services`,
  `@shared/components`, `@shared/guards`, `@shared/utils`) — configurado em
  `tsconfig.json` e `scripts/tsconfig.json`. Cada subpasta de `shared/` tem alias e
  barrel (`index.ts`) próprios.
- **Exceção de nomenclatura no schema:** tabelas `cards`, `printings`, `collections`,
  `collection_items`, `decks`, `deck_cards` e suas colunas são em inglês, para não
  misturar idiomas dentro do schema SQL.

## Estrutura do app (antes da reversão)

```
src/app/
  app.ts / app.html / app.css        # shell: header fixo + <router-outlet> + footer
  app.config.ts                      # providers: router, locale pt-BR, cliente Supabase
  app.routes.ts                      # rotas (todas component:, nenhuma lazy)
  inicio/                            # busca de cartas (nome/texto), grade, paginação
  colecao/  colecao-detalhe/         # CRUD de coleções + detalhe com adicionar/remover carta
  baralhos/ baralho-detalhe/         # CRUD de baralhos Commander (comandante, identidade, singleton)
  carta/                             # detalhe da carta (arte, custo, texto, virar face)
  cadastro/                          # formulário de cadastro (email/senha)
  creditos/                          # aviso legal / atribuição
  shared/
    components/  busca-cartas, cartao, seletor-impressao,
                 modal-entrar, modal-colecao, modal-baralho
    config/      supabase.config.ts (TOKEN_CLIENTE_SUPABASE, factory do cliente browser)
    guards/      exige-autenticacao.guard.ts
    interfaces/  carta, impressao, colecao, baralho
    constants/   carta, colecao (PALETA_CORES_COLECAO)
    services/    autenticacao, cartas, colecoes, baralhos,
                 estado-busca-cartas, registro-estado-busca-cartas, leitor-de-carta
    utils/       simbolos-mana, visualizacao-carta, destaque-texto,
                 leitura-impressao, regras-comandante
scripts/
  importar-cartas.ts                 # ingestão Scryfall -> Supabase (nunca rodar via IA)
  tsconfig.json
public/assets/mana-symbols/          # 84 SVGs de símbolos de mana do Scryfall
```

## Rotas (em `791b819`)

| Rota | Componente | Guard |
|---|---|---|
| `/` | `Inicio` | — |
| `/baralhos` | `Baralhos` | `exigeAutenticacaoGuard` |
| `/baralhos/:id` | `BaralhoDetalhe` | `exigeAutenticacaoGuard` |
| `/colecao` | `Colecao` | `exigeAutenticacaoGuard` |
| `/colecao/:id` | `ColecaoDetalhe` | `exigeAutenticacaoGuard` |
| `/cadastro` | `Cadastro` | — |
| `/creditos` | `Creditos` | — |
| `/carta/:oracleId` | `Carta` | — |
| `/carta/:oracleId/:printingId` | `Carta` | — (printingId opcional, repassado após scan) |

## Dependências de terceiros (package.json em `791b819`)

- **Runtime:** `@angular/*` 22, `@supabase/supabase-js` ^2.45, `tesseract.js` ^7,
  `dotenv` ^17, `rxjs` ~7.8, `tslib`, `zone.js`.
- **Dev:** `@angular/build` + `@angular/cli` 22, `jest` 30 + `jest-preset-angular` 17 +
  `@types/jest` + `jsdom`, `prettier`, `tsx`, `typescript` ~6.0.
- **Scripts:** `start` (`ng serve`), `start:lan` (`--host 0.0.0.0`), `build`, `watch`,
  `test` (`jest`), `test:watch`, `import:cards` (`tsx scripts/importar-cartas.ts`).

## Comandos e workflow (guardrails do CLAUDE.md)

- A IA **pode** rodar `npm install`, `npm test`, `npm run build` para verificar o próprio
  trabalho.
- A IA **não roda** `npm start` / `ng serve` (servidor longo — o usuário roda e confere).
- A IA **nunca** roda scripts que falam com banco/API externa (Supabase ou Scryfall) —
  atualmente `npm run import:cards`. Escrevem dados reais / batem em serviços com limite;
  ação humana, observada por humano. Qualquer script futuro com a mesma propriedade recebe
  o mesmo tratamento.
- Testes: `npm test` (Jest; config em `jest.config.js` / `setup-jest.ts`).
