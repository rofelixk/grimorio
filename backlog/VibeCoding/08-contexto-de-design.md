# Contexto de design

Resumo de `docs/design-context.md` (texto integral em
[`originais/docs/design-context.md`](originais/docs/design-context.md)). Escrito para
ferramentas de design trabalhando contra o repo.

## O que o app é

Grimório: gerenciador gratuito e Brasil-first de coleção e decks de Magic, foco
Commander/EDH. Projeto pessoal, **não** produto comercial — sem monetização, sem mecânicas
de growth/engagement. **Plataforma: app web responsivo** (Angular via `ng serve` local /
Vercel em produção). Não é app mobile nativo; "mobile" é só um breakpoint responsivo do
mesmo app web.

## Estado visual (antes da reversão)

**Não havia design system.** App funcional-first: controles de formulário HTML padrão,
espaçamento ad-hoc, bordas `1px solid #ddd`, sem escala tipográfica, sem biblioteca de
componentes (sem Material/Tailwind), sem logo, sem cores de marca definidas. "Combinar com
o estilo existente" não fazia sentido além de convenções estruturais — a tarefa real de
design seria *estabelecer* identidade visual, não estender uma.

**`PALETA_CORES_COLECAO`** (`src/app/shared/constants/colecao.ts`): 8 swatches hex
genéricos, só para diferenciar coleções à primeira vista (marcador de borda/ponto). **Não**
é decisão de marca. Substituição planejada: seletor de duas cores na roda WUBRG do próprio
Magic (ex.: um fichário "cor Golgari").

## Telas reais (em `791b819`)

| Rota | Componente | Estado |
|---|---|---|
| `/` | `Inicio` | Busca de carta (nome/texto), grade de resultados, paginação |
| `/colecao` | `Colecao` | Lista coleções (criar/editar/excluir via modal), busca cross-coleção |
| `/colecao/:id` | `ColecaoDetalhe` | Uma coleção: busca + adicionar, lista de cartas com quantidade/remover |
| `/carta/:oracleId` | `Carta` | Detalhe da carta — arte, custo/valor, tipo, texto, virar face |
| `/baralhos` | `Baralhos` | **Só stub** no design-context (embora o CRUD tenha entrado em `0abaca0`) |
| `/cadastro` | `Cadastro` | Formulário de cadastro (email/senha) |
| `/creditos` | `Creditos` | Aviso legal / atribuição |

Chrome compartilhado: header fixo (nav + entrar/sair) e footer (atribuição Scryfall/WotC,
link para Créditos) em toda página. Peças reutilizáveis: `Cartao`, `BuscaCartas`,
`ModalColecao`, `ModalEntrar`.

## Fora de escopo para design (não desenhar sem pedir)

- Sem sistema de persona/onboarding-quiz, sem curadoria de conteúdo ou "tipo de jogador".
- Sem meta stats, tracking de preço, marketplace de trocas, buscador de LGS/eventos.
- Sem UI de escaneamento/OCR ainda (perguntar antes de desenhar fluxos de scan).
- Sem telas mobile nativas — desenhar responsivamente para o único app web.

## Restrições de IP / legais (carregam para qualquer asset gerado)

- Projeto fã não-oficial — nunca implicar endosso da WotC/Hasbro, nunca usar logos/branding deles.
- Imagens de carta vêm da API do Scryfall — não inventar arte de carta nova nem remixar IP
  licenciada (incluindo arte de crossover Universes Beyond).
- Manter o rodapé/créditos de atribuição existente intacto em qualquer redesign de página.
