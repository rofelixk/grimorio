# Uso de IA no Grimório

O projeto foi desenvolvido em colaboração com o **Claude Code (Anthropic)**, assistente
com acesso direto ao código do repositório. O uso de IA é parte declarada do propósito do
projeto (curso de desenvolvimento assistido por IA) e está documentado no `README.md`.

## Princípio de colaboração (do CLAUDE.md)

- **Delegar** o que já é dominado: boilerplate, padrões familiares/repetitivos, a maior
  parte do trabalho de Angular/frontend.
- **Colaborar** (explicar, não só gerar) no que está sendo aprendido: conceitos de
  backend (Supabase, SQL, Row-Level Security, autenticação) e a própria prática de
  especificação/colaboração com IA.

Na prática (ver `05-historico-de-versoes.md`): frontend saiu majoritariamente por
delegação; decisões de schema, ingestão de dados, auth e build/bundle saíram por
colaboração, com o autor implementando as partes de aprendizado antes de revisar.

## Declaração de diligência sobre uso de IA (resumo do README)

**Diligência na criação.** Ferramenta escolhida (assistente que lê/edita código, não
chatbot genérico) porque o propósito é construir fluência em backend e em colaboração com
IA. Informações compartilhadas com o Claude limitadas a: código-fonte do projeto, sua
documentação, e as preferências/nível de conhecimento do autor (registradas para calibrar
as explicações). **Nenhum** dado de usuário, credencial ou informação pessoal de terceiros
foi compartilhado. Dados de carta vêm dos arquivos públicos *bulk data* do Scryfall.
Segredos (ex.: chave `service_role` do Supabase) tratados só no lado servidor, nunca
expostos ao assistente em contexto de navegador.

**Diligência na transparência.** Trabalho de curso + portfólio; público espera divulgação
do uso de IA. Concretamente: o Claude coautorou os commits que produziu (trailer
`Co-Authored-By`), ajudou a redigir a documentação (`docs/`) e colaborou na implementação
de frontend e backend — participação maior em boilerplate de frontend, mão mais leve e
explicativa em backend/banco.

**Diligência na implantação.** Todas as etapas de teste, build e execução rodadas e
verificadas pelo autor, não pelo assistente (convenção explícita do projeto). O Claude
teve que explicar o raciocínio antes de agir, exceto em operações rotineiras já revisadas
(commitar/enviar alterações aprovadas). Nas áreas declaradas como aprendizado, o Claude
deu só o essencial e deixou o autor implementar antes de revisar. Responsabilidade total
pelo resultado final é do autor.

## Guardrails configurados para o Claude Code

De `.claude/settings.json` (ver `originais/claude-settings.json`):

**Permitido (`allow`):**
- `Bash(npm install)`, `Bash(npm test)`, `Bash(npm run build)`

**Negado (`deny`):**
- `Bash(npm run import:cards)` — script que escreve no Supabase / bate no Scryfall
- Leitura de `.env` e variantes (`Read(.env)`, `Bash(cat .env)`, `Bash(type .env)`, etc.)

De `.claude/settings.local.json` (ver `originais/claude-settings.local.json`):
- `allow`: `git checkout *`, `git add *`, `git commit -m ' *`, `npx jest *`, `npm test *`

**Regras de processo (do CLAUDE.md):**
- A IA não roda `npm start` / `ng serve` (servidor longo — o usuário roda e confere).
- A IA nunca roda script que fala com banco/API externa (Supabase, Scryfall); ação
  humana, observada por humano. Qualquer script futuro com essa propriedade herda a regra.

## Ferramentas de IA usadas no fluxo

- **Claude Code** — implementação no código real, decisões de trade-off, rodar a suíte de
  testes, redação de documentação.
- **Claude.ai (chat web, sem acesso ao repo)** — brainstorm de problema aberto (bom para
  pensar em voz alta, ruim para especificar sem ancoragem no projeto).
- **Claude Design (com acesso ao GitHub)** — proposta visual detalhada e protótipo
  navegável, a partir de `docs/design-context.md`.

Detalhe de dois fluxos concretos em [`07-estudos-de-caso-ia.md`](07-estudos-de-caso-ia.md).
