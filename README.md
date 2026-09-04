# grimorio
app pessoal e gratuito para gerenciar coleção e decks de Magic: The Gathering, feito para o público brasileiro. Inclui sistema de localização de armazenamento físico das cartas e, futuramente, escaneamento de cartas e análise de deck. Projeto de aprendizado em backend e colaboração com IA.

## Visão geral

**O que é:** app web para o jogador brasileiro de Magic organizar sua coleção física e montar decks, com foco em Commander/EDH. Um diferencial é o sistema de localização: você registra em quais "caixas" (fichário azul, deckbox X…) cada carta está, e o app sinaliza quando essa informação pode ter ficado desatualizada — por exemplo, quando a carta entra ou sai de um deck.

**No MVP:** cadastro de coleção, cadastro de decks (com checagem básica de legalidade em Commander), sistema de localização com aviso de reconferência, e um banco local de cartas montado a partir dos arquivos *bulk data* do Scryfall (a busca e a exibição rodam contra essa cópia no Supabase, sem depender da API ao vivo).

**Fora do MVP (fases seguintes):** escaneamento de cartas, motor de análise/recomendação de decks, exibição dos nomes/textos em português e busca totalmente offline.

**Stack:** Angular (frontend), Supabase (Postgres + auth), Vercel (hospedagem), Scryfall *bulk data* (dados de cartas). Tudo em plano gratuito — custo zero é requisito, não meta.

**Valores:** gratuito e sem monetização de dados; Brasil em primeiro lugar; projeto levado a sério como aprendizado (backend e colaboração com IA), sem eliminar o atrito que faz parte de aprender.

Contexto completo e o "porquê" das decisões: [docs/project-brief.md](docs/project-brief.md).

## Documentação

- [docs/project-brief.md](docs/project-brief.md) — visão, valores, escopo do MVP, roadmap e o "porquê" das decisões.
- [docs/data-model.md](docs/data-model.md) — o que é persistido no Supabase, coluna a coluna, e a razão de cada campo.
- [docs/](docs/) — índice de toda a documentação.

## Desenvolvimento

Stack: Angular 22 (frontend), Supabase (backend), Vercel (hospedagem), Scryfall bulk data (dados de cartas).

```bash
npm start      # servidor de desenvolvimento em http://localhost:4200
npm run build  # build de produção
npm test       # testes unitários (Jest)
```
