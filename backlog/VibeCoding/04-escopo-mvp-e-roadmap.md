# Escopo do MVP e roadmap

## MVP (6 semanas)

### Dentro do escopo

- CRUD de coleção
- CRUD de decks (foco Commander/EDH), incl. checagem básica de legalidade em Commander
- Sistema de localização de armazenamento com rastreamento de confiança:
  - recipientes planos, nomeados pelo usuário (ex.: "Fichário Azul");
  - cada carta guarda `lastLocationUpdateDate`;
  - confiança sinalizada para reconferência quando a participação da carta em decks muda
    após essa data;
  - ação manual "corrigir localização" reseta a confiança.
- Banco local recortado de cartas, populado do **bulk data** do Scryfall; busca e
  exibição rodam contra essa cópia no Supabase, não contra a API ao vivo.
- Busca/filtro, tratamento de erro, polimento, deploy.

### Fora do escopo do MVP (Fases 2/3)

- Escaneamento de cartas (OCR — reconhecimento de texto/set)
- Motor de análise e recomendação de decks
- Exibição de cartas em português (`printed_name`, `printed_text`; bulk files localizados)
- Busca de cartas totalmente offline

## Roadmap aproximado de 6 semanas

| Semana | Foco |
|---|---|
| 1 | Setup do projeto, auth, schema, import de cartas do bulk Scryfall, CRUD básico de coleção |
| 2 | Terminar CRUD de coleção + recipientes de armazenamento |
| 3 | CRUD de decks + checagem básica de legalidade Commander |
| 4 | Sistema de confiança de localização (detecção de mudança de deck, flags de reconferência, correção manual) |
| 5 | Polimento, busca/filtro, tratamento de erro |
| 6 | Buffer + deploy |

## Fases futuras (ainda não escopadas)

- Escaneamento de cartas via OCR
- Motor de análise e recomendação de decks
- Nomes/textos de carta em português via dados de idioma `pt` do Scryfall (bulk files localizados)
- Busca de cartas totalmente offline (service worker / cache local do DB recortado)
- Possíveis recipientes hierárquicos (fichário → página → slot)

## O que efetivamente foi construído antes da reversão (branch `main`, até `791b819`)

| Área | Estado em `main` |
|---|---|
| Busca de cartas (`/`) | Feito — busca por nome/texto, grade, paginação, estado persistente entre navegações |
| Autenticação email/senha | Feito — `AutenticacaoService` + `exigeAutenticacaoGuard` nas rotas protegidas |
| CRUD de coleções + detalhe | Feito — grade de "binders", modal, busca lateral/sheet, adicionar/remover cópias |
| CRUD de baralhos Commander | Feito — comandante, identidade de cor, singleton, limite 99, seletor de impressão |
| Detalhe da carta + cartas dupla-face | Feito — virar face por clique/hover, layouts multiface |
| Escaneamento de carta via câmera (OCR) | Feito (protótipo) — apesar de estar "fora do MVP"; input nativo + Tesseract.js resolvendo contra `printings` |
| Tabela `printings` + ingestão *Default Cards* | Feito |
| Interface em pt-BR + fonte Inter | Feito |
| Sistema de localização de armazenamento | **Não construído** — recurso central do MVP, ficou só no design (`containers` planejada) |
| Análise/recomendação de decks | Não construído (Fase 2) |
| Português nas cartas | Não construído (Fase 2) |
| Deploy na Vercel | Não confirmado no histórico |
