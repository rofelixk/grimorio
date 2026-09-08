# Histórico de uso de IA — redesign de `/colecao` em três plataformas

Registro do processo de design e implementação do redesign responsivo da tela de
Coleções, como exemplo concreto da colaboração com IA descrita na
[Declaração de diligência sobre uso de IA](../../README.md#declaração-de-diligência-sobre-uso-de-ia)
do README principal. Diferente dos outros estudos de caso desta pasta, este cobre um
fluxo entre **três ferramentas de IA diferentes** (Claude.ai, Claude Design e Claude
Code) numa única funcionalidade. Documento voltado a avaliadores do curso — não é lido
automaticamente pela IA em sessões futuras, só quando alguém o abre.

## Etapa 1 — Claude.ai (chat web), sem ligação com o projeto

O autor abriu uma conversa solta no Claude.ai (não conectada ao repositório) para pensar
em voz alta sobre um problema de design: como a comunidade de Magic está dividida sobre
os sets "Universes Beyond" (crossovers), e se o app deveria ter personas/onboarding para
lidar com isso. Ao final dessa conversa, pediu para o próprio Claude.ai gerar um prompt
pronto para o Claude Design, resumindo a discussão.

**Problema:** o prompt gerado inventou um app genérico de "companion MTG" — com meta
snapshot, tracking de preço, marketplace de trocas, buscador de eventos/LGS, sistema de
personas por onboarding, tudo enquadrado como app **mobile nativo**. Nada disso existe no
escopo do Grimório (ver `project-brief.md`, MVP explicitamente sem análise de deck, sem
features sociais); o Grimório é um app **web** pessoal de coleção/deck para Commander. A
conversa nunca foi ancorada no projeto real porque não tinha acesso a ele.

## Etapa 2 — de volta ao Claude Code: diagnóstico e correção de rota

O autor colou a conversa do Claude.ai no Claude Code e pediu uma avaliação. O
diagnóstico: o prompt não estava desalinhado por má escrita, e sim por falta de
ancoragem — pedir para uma ferramenta "puxar contexto do repositório" é caro (ela teria
que vasculhar todo o `CLAUDE.md`, focado em convenções de engenharia, para achar a
fração relevante para design) e não garante que ela vai achar os limites reais do
projeto.

**Decisão:** criar `docs/design-context.md` — um arquivo pequeno, só com o que uma
ferramenta de design precisa (telas reais existentes, estado visual atual, fora de
escopo explícito, contexto de marca), linkado a partir do `CLAUDE.md`. Mais barato em
tokens do que reprocessar o `CLAUDE.md` inteiro, e não duplica o que já vive lá.

Uma rodada de correção aconteceu já na escrita desse arquivo: a primeira versão descreveu
a paleta de 8 cores das coleções (`PALETA_CORES_COLECAO`) como "uma decisão de design
fechada, para reutilizar". O autor corrigiu — a paleta foi só uma solução prática para
diferenciar coleções visualmente, e já existe um plano de substituí-la por um seletor de
duas cores baseado na roda de cores do próprio Magic (WUBRG). O documento foi ajustado
para registrar isso como placeholder a ser substituído, não como constraint de marca.

## Etapa 3 — Claude Design, com acesso ao GitHub

Com `docs/design-context.md` publicado e linkado, o autor pediu ao Claude Design (que
tem acesso direto ao repositório no GitHub) para ler esse arquivo antes de qualquer outra
coisa, em vez de reexplicar o produto do zero.

**Resultado:** o Claude Design devolveu um pacote de handoff
(`design_handoff_colecao_1e/`) com um `README.md` detalhado (medidas exatas, breakpoints,
tokens de espaçamento/cor, estados de interação) e um protótipo em HTML navegável, opção
"1e" escolhida entre variações exploradas. O handoff respeitou corretamente os limites do
`design-context.md`: não inventou uma paleta/marca nova, manteve a paleta de coleções
como placeholder lido de `@shared/constants` (não hardcoded), preservou o rodapé de
atribuição legal, e sinalizou explicitamente decisões em aberto em vez de assumi-las
("confirm before building").

## Etapa 4 — de volta ao Claude Code: decisão e implementação

O handoff foi lido pelo Claude Code, que resumiu a qualidade do pacote e levantou as três
decisões que o próprio `README.md` marcava como pendentes, para o autor decidir antes de
qualquer código ser tocado:

| Decisão em aberto | Resposta do autor |
|---|---|
| Nav do cabeçalho virar uma bottom tab bar nova no mobile (Home/Collections/Decks com estado ativo)? | Mais simples: reposicionar o cabeçalho existente como rodapé fixo no mobile, em **todas** as páginas, sem criar uma tab bar nova |
| Onde ficam Edit/Delete de uma coleção no mobile (o binder card perde a linha de ações)? | Mover para a tela da própria coleção (`/colecao/:id`), em **ambos** os breakpoints — não só mobile |
| A folha de busca no mobile precisa de arrastar de verdade ou um toggle simples basta? | Toggle simples é suficiente |

Implementado diretamente em `colecao.ts/html/css`, `colecao-detalhe.ts/html/css` e
`app.css` (reordenação via flex `order`, sem duplicar markup de navegação). `npm test` e
`npm run build` executados antes da entrega.

**Achado à parte, não relacionado ao design:** rodar os testes revelou uma regressão real
já publicada em `main` — dois arquivos de barril (`shared/services/index.ts`,
`shared/components/index.ts`) ficaram com exports faltando desde um commit anterior desta
mesma sessão (um erro do próprio processo de dividir commits, não do handoff de design).
Corrigido como parte desta entrega.

## Observações sobre o fluxo entre as três ferramentas

- **Claude.ai solto (sem o repositório) é bom para pensar em voz alta, ruim para
  especificar.** A mesma pergunta, feita já ancorada no Claude Code (que tinha acesso ao
  código e aos docs), teria evitado o desalinhamento de escopo inteiro.
- **"Deixa a IA puxar o contexto sozinha" é caro e impreciso.** Um arquivo pequeno e
  deliberado (`design-context.md`) apontado explicitamente rendeu um handoff muito mais
  alinhado do que pedir para vasculhar o repositório.
- **Cada ferramenta ficou no que faz melhor:** Claude.ai para explorar um problema aberto,
  Claude Design para gerar uma proposta visual detalhada e navegável, Claude Code para
  decidir trade-offs de produto, implementar no código real e rodar a suíte de testes.
  Nenhuma etapa tentou substituir a outra.
