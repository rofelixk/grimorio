# Proposta e valores

## O que é

**Grimório** — app web pessoal e **gratuito** para o jogador brasileiro de *Magic: The
Gathering* organizar sua coleção física de cartas e montar decks, com foco em
**Commander/EDH**.

É, ao mesmo tempo:
- um projeto pessoal de paixão;
- um exercício prático de aprendizado em **desenvolvimento backend** e em
  **colaboração com IA** (trabalho de curso de uma capacitação interna da empresa sobre
  desenvolvimento assistido por IA), levado a sério e também usado como portfólio.

## Diferencial: sistema de localização de armazenamento

O recurso que distingue o app: o usuário registra em quais "recipientes" físicos
(fichário azul, deckbox X…) cada carta está guardada. O app **sinaliza quando essa
informação pode ter ficado desatualizada** — por exemplo, quando uma carta entra ou sai
de um deck depois da última atualização de localização. Uma ação manual de "corrigir
localização" reseta a confiança.

- Recipientes são planos e nomeados pelo usuário (ex.: "Fichário Azul").
- Cada carta guarda `lastLocationUpdateDate`.
- Possível evolução futura: recipientes hierárquicos (fichário → página → slot).

## Público-alvo

Jogadores brasileiros de Magic, primariamente do formato Commander/EDH.

## Visão completa do produto (além do MVP)

1. CRUD de coleção de cartas
2. CRUD de decks
3. Escaneamento de cartas (OCR — reconhecimento de texto/set, **não** de imagem)
4. Análise de decks e recomendações (legalidade Commander, curva, sinergia)
5. Interface guiada — incluindo o sistema de localização de armazenamento
6. Totalmente gratuito para usar e para operar

## Os quatro valores (aplicados a decisões técnicas)

| Valor | Significado |
|---|---|
| **Free** (Gratuito) | Sem custo, sem paywall, sem monetização de dados. Manter barato de operar; plano gratuito é restrição rígida, não ponto de partida. Feito com IA (tecnologia de custo ambiental real); ser gratuito e genuinamente útil é uma forma de retribuir. |
| **Brasil** | Jogadores brasileiros primeiro. Nomes/textos de carta em português (`printed_name`, `printed_text`) são requisito central adiado para a Fase 2 — não decidir nada agora que bloqueie isso. Commander é o formato primário. |
| **Knowledge** (Conhecimento) | É trabalho de curso levado a sério. Em conceitos sendo aprendidos (backend, colaboração/especificação com IA), explicar e colaborar — não apenas gerar. Não engenheirar para longe o atrito que faz parte de aprender. |
| **Discovery** (Descoberta) | *Ad astra, per aspera.* Dificuldade é esperada e aceita; não otimizar para removê-la ao custo do entendimento. |

## Princípio de colaboração com IA

- **Delegar** o que já é dominado (boilerplate, padrões familiares/repetitivos, a maior
  parte do trabalho de frontend/Angular).
- **Colaborar** (explicar, não só gerar) no que está sendo aprendido — conceitos de
  backend e prática de especificação/colaboração com IA.
