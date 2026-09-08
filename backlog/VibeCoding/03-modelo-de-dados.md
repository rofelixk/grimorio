# Modelo de dados (resumo)

Resumo do que o Grimório persistia no Supabase e o porquê de cada tabela. O detalhamento
coluna a coluna, com origem no Scryfall e limitações da v1, está em
[`originais/docs/data-model.md`](originais/docs/data-model.md) — este arquivo é só o mapa.

## Convenções

- **Chave `oracle_id`** (UUID, independente de idioma e impressão), nunca `scryfall_id`.
- **Oracle-level vs printing-level:** só dados oracle-level (nome, texto, custo, identidade
  de cor, legalidade Commander) vão em `cards`; dados de impressão (set, número do coletor,
  raridade, arte exata) vão em `printings`.
- **RLS:** `cards` e `printings` — `SELECT` para autenticados, escrita só via
  `service_role`. Tabelas por usuário — RLS ligada, cada linha escopada a `auth.uid()`.

## Mapa de relacionamentos

```
cards (oracle_id PK)  ── dado de referência, compartilhado, somente leitura
  ↑ oracle_id FK ── printings (scryfall_id PK)  ── lookup por impressão
  ↑ oracle_id FK ── collection_items.oracle_id
  ↑ oracle_id FK ── deck_cards.oracle_id

collections (id PK, user_id)  ── por usuário
  ↑ collection_id FK ── collection_items

collection_items (id PK)
  → collection_id FK → collections
  → oracle_id FK → cards
  → printing_id FK → printings (nullable — "possuo esta carta" sem impressão escolhida)

decks (id PK, user_id)  ── por usuário
  → commander_oracle_id FK → cards (nullable — vazio até escolher comandante)
  ↑ deck_id FK ── deck_cards

deck_cards (id PK)
  → deck_id FK → decks
  → oracle_id FK → cards
  → printing_id FK → printings (nullable)
```

## Tabelas

| Tabela | Papel |
|---|---|
| `cards` | Catálogo local recortado, populado do bulk *Default Cards* do Scryfall (deduplicado por `oracle_id`, ~30–35k linhas), refresh ~semanal. Colunas oracle-level + `card_faces` JSONB (nullable) para cartas multiface. Filtro de importação: só entra se `games` inclui `paper` **e** `layout` não é não-jogável (`art_series`, `token`, `emblem`, `reversible_card`, …). |
| `printings` | Lookup "set code + número do coletor → impressão", populado do mesmo download. Índice único em `(set_code, collector_number, lang)` — alvo de resolução do scanner OCR. Só `en` ingerido por ora. |
| `collections` | Agrupamentos de cartas nomeados pelo usuário, com cor de uma paleta preset (guardada como chave, não hex cru). Uma carta pode estar em várias coleções. Primeira tabela com CRUD completo por usuário. |
| `collection_items` | Cartas dentro de uma coleção, com `quantity` (incrementa em vez de duplicar linha), `date_added`, `updated_at` (trigger). `printing_id` existe no schema mas **nenhum código de serviço/UI o define** — escolha de escopo. |
| `decks` | Decks Commander do usuário: `name`, `format` (só `commander` construído), `commander_oracle_id` (ponteiro denormalizado, nullable). |
| `deck_cards` | Cartas dentro de um deck. `printing_id` **realmente usado** aqui (via `BaralhosService` + modal `SeletorImpressao`), ao contrário de `collection_items`. `is_commander` boolean. |
| `containers` (planejada) | `user_id`, `name` — recipientes planos de armazenamento. Não desenhada em detalhe. |

## Regras de Commander (impostas em `BaralhosService`, nível de app, não constraints do DB)

- **Elegibilidade de comandante:** `type_line` contém "Legendary" e "Creature", ou
  `oracle_text` contém "can be your commander".
- **Identidade de cor:** `color_identity` da carta deve ser subconjunto da do comandante
  (empurrado para a query via `containedBy` e re-checado antes de gravar).
- **Singleton:** adicionar carta que já tem linha no deck é bloqueado, exceto terreno
  básico ou carta cujo texto permite cópias ilimitadas. Checagem por `oracle_id`,
  independente de `printing_id`.
- **Limite de 99:** soma de `quantity` das linhas não-comandante ≤ 99.

## Adiado (Fase 2+)

- Português: ingerir dados localizados (`printed_name`, `printed_text`, imagens
  localizadas). Sem migração de schema — tudo é chaveado por `oracle_id`.
- Tabela relacional `card_faces` (migrar do JSONB se consulta face a face virar necessidade).
- `edhrec_rank`, `keywords` para análise/recomendação de decks.
