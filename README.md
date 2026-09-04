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

## Declaração de diligência sobre uso de IA

**Diligência na criação.** Desenvolvi o Grimório em colaboração com o Claude Code (Anthropic), um assistente de programação com acesso direto ao código deste projeto. Escolhi essa ferramenta porque o propósito do projeto não é apenas entregar um app, mas construir fluência em desenvolvimento backend e em colaboração com IA como exercício de aprendizado deliberado — uma ferramenta que lê e edita código diretamente, em vez de um chatbot genérico, faz mais sentido para isso. Seguindo o princípio de colaboração definido no projeto, deleguei ao Claude o que eu já dominava — boilerplate, padrões de frontend/Angular já familiares — e reservei conceitos de backend e ferramentas novas (Supabase, SQL, Row-Level Security, autenticação) para trabalho explicado e colaborativo em vez de geração direta, para não eliminar o atrito que faz parte de aprender essas áreas. As informações compartilhadas com o Claude se limitaram ao código-fonte deste projeto, sua documentação e minhas próprias preferências de trabalho e nível de conhecimento (registradas para que as explicações fossem ajustadas ao nível certo); nenhum dado de usuário, credencial ou informação pessoal de terceiros foi compartilhado — os dados de cartas vêm dos arquivos públicos *bulk data* do Scryfall, e segredos (como a chave `service_role` do Supabase) são tratados apenas no lado servidor, nunca expostos ao assistente em contexto de navegador.

**Diligência na transparência.** Este projeto é trabalho de curso, feito para uma capacitação da empresa sobre desenvolvimento assistido por IA, e também funciona como portfólio pessoal. Seu público provável — avaliadores do curso e, depois, qualquer pessoa avaliando meu trabalho — espera razoavelmente a divulgação do uso de IA, dado o próprio tema do curso. Concretamente: o Claude coautorou os commits que produziu (via trailer `Co-Authored-By`), ajudou a redigir a documentação do projeto (`docs/`) e colaborou na implementação de funcionalidades no frontend e no backend, com participação maior em boilerplate de frontend e uma mão mais leve e explicativa em backend/banco de dados, áreas que eu estava ativamente aprendendo.

**Diligência na implantação.** Todas as etapas de teste, build e execução foram rodadas e verificadas por mim, não pelo assistente, por convenção explícita do projeto — nada foi publicado sem que eu mesmo tivesse executado e conferido. Exigi que o Claude explicasse seu raciocínio antes de agir, exceto em operações rotineiras já revisadas (como commitar e enviar alterações já aprovadas), e nas áreas que eu declarei estar aprendendo pedi que ele desse apenas o essencial e me deixasse implementar antes de revisar. Assumo total responsabilidade pela precisão, funcionamento e apresentação do resultado final, incluindo qualquer código, decisão de arquitetura ou documentação sugeridos pela IA — a assistência de IA moldou o processo, mas as decisões e suas consequências são minhas.
