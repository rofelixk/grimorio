# grimorio
app pessoal e gratuito para gerenciar coleção e decks de Magic: The Gathering, feito para o público brasileiro. Inclui sistema de localização de armazenamento físico das cartas e, futuramente, escaneamento de cartas e análise de deck. Projeto de aprendizado em backend e colaboração com IA.

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
