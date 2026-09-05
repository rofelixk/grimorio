# Documentação — grimório

Índice dos documentos do projeto. Para código e comandos, veja o [README principal](../README.md).

| Documento | Conteúdo |
|---|---|
| [project-brief.md](project-brief.md) | Visão, valores, público-alvo, escopo do MVP (in/out), roadmap de 6 semanas, decisões de arquitetura e suas justificativas. Ler quando uma decisão depender do "porquê". |
| [data-model.md](data-model.md) | O que é gravado no Supabase: convenções (chave `oracle_id`, RLS), a tabela `cards` coluna a coluna com origem no Scryfall, campos deliberadamente não guardados, limitações da v1 e tabelas ainda por desenhar. Manter em sincronia a cada mudança de schema. |
| [historico-ia/](historico-ia/) | Estudos de caso do processo de colaboração com IA, funcionalidade por funcionalidade — pedido inicial, perguntas/respostas, resultado. Voltado a avaliadores do curso, não é lido automaticamente pela IA (exceção de idioma abaixo). Inclui um caso multi-plataforma (Claude.ai + Claude Design + Claude Code). |

Convenções:

- Estes documentos registram **intenção e justificativa**. O schema executável ficará nos
  arquivos de migração do Supabase quando existirem.
- Datas relativas são convertidas para absolutas ao escrever.
- **Idioma:** os documentos de trabalho aqui (exceto este índice) são escritos em inglês —
  são a referência usada durante o desenvolvimento, pelo autor e pela IA. O material
  voltado ao público (`README.md` principal, este índice, e `historico-ia/`) e as
  mensagens de commit ficam em pt-BR. Não se mantêm versões traduzidas.
