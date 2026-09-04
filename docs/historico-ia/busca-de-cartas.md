# Histórico de uso de IA — busca de cartas

Registro do processo de especificação e implementação da funcionalidade de busca de
cartas (página Início), como exemplo concreto da colaboração com IA descrita na
[Declaração de diligência sobre uso de IA](../../README.md#declaração-de-diligência-sobre-uso-de-ia)
do README principal. Este documento é um estudo de caso para avaliadores do curso — não
é lido automaticamente pela IA em sessões futuras, só quando alguém o abre.

## Pedido inicial

Enviado ao Claude como uma única especificação, testando o quão completa uma
funcionalidade poderia sair de um pedido bem detalhado desde o início:

> Feature: search bar
> Description: A new searchbar must be included on the home page of the app after the
> buttons for decks and collection, it is a simple input where the user will type some
> text, the text must be at least 3 characters-wide for a search to run. on the right,
> next to the input, there sould be a dropdown so the user can choose what exactly he's
> searching for (name or type-line) and a search button next to it so the command is not
> running while the user is typing but only after pressing the button to avoid
> unecessary calls to supabase. The result must be an aproximation of the search so
> queries for "Ash" return if there is any part of the name or type-line that has "ash"
> in it, do not count if it is uppercase or lowercase. After inputing the text value,
> choosing the search term (default "name") and clicking the button "search" the button
> will become unclickable while a loading circle is shown below the input and buttons.
> If an error occurs on the call, log it into the html. If it is a success load a 50dvh
> simple ul/li list without buletpoints of div's with greyish borders with a slight
> shadow to give the layout some depth that are flexboxes. There must be 3 cards per row
> and a scroll feature for the list, not a scroll of the entire page. The div for the
> card information is detailed as the left side we have the name, mana cost, mana value,
> type-line, oracle-text and color-identity displayed as a simple ul/li list without
> bulletpoints and separated by simple lines that do not connect fully to the border of
> the div and on the right side the image of the card. Create all necessary testing
> suites. the card layout will be used on other areas of the project so make it a shared
> component that can receive card data and present it despite where it's being called
> from. For this first scope count only the 1st face of the card, multifaced cards will
> be added later.

## Perguntas e respostas (resumo)

O Claude revisou o pedido antes de implementar e levantou lacunas reais — resumidas aqui,
não reproduzidas na íntegra:

| Pergunta | Resposta |
|---|---|
| `cards` só permite `SELECT` para usuários autenticados, mas o app ainda não tem login — a busca falharia sempre. | Liberar `SELECT` para `anon` temporariamente (política `cards_anon_select_temporary`, documentada em `data-model.md`, a remover quando a autenticação existir). |
| Não existe cliente/serviço Supabase no app Angular ainda. | Faz parte do escopo desta funcionalidade. |
| Cartas multiface ficam com `mana_cost`/`oracle_text` nulos no nível da carta — como aplicar "conta só a 1a face"? | O componente sempre usa `card_faces[0]` como fallback quando o campo no nível da carta é nulo. |
| O dropdown busca em qual coluna? | Só a coluna selecionada (`name` ou `type_line`), nunca as duas. Padrão `name`. |
| Enter no campo de busca também dispara a busca? | Não — só o clique no botão. |
| O que exibir quando a busca não retorna nada? | Um "no results" simples. |
| O que acontece ao clicar buscar com menos de 3 caracteres? | Mensagem de validação — aparece no primeiro clique e, a partir daí, atualiza ao vivo conforme o usuário digita. |
| Onde exibir o erro? | Um `<p>` simples com a mensagem de erro retornada (aceitável mostrar o erro cru — funcionalidade de caráter mais técnico/teste). |
| Como funciona o layout de 3 por linha? | Flexbox, cartas de tamanho fixo — 7 resultados viram 2 linhas cheias + 1 item na próxima. |
| O layout é responsivo? | Não — fixo em 3 por linha independente da largura da tela, propositalmente (foco em testar a capacidade, não a UX final). |

## Resultado

Implementado com aprovação prévia de um plano (Plan Mode): cliente Supabase injetável
(`@shared/config`), `CartasService` (`@shared/services`) e o componente compartilhado
`Cartao` (`@shared/components`, reutilizável em outras páginas), além da própria busca
em `Inicio`. Suítes de teste cobrindo o fallback de multiface, o serviço (mockando o
cliente Supabase) e o fluxo de busca (validação, carregamento, erro, sucesso, vazio).
`npm test` e `npm run build` executados e conferidos antes da entrega.
