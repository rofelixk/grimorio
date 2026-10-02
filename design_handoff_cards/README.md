# Handoff: Cartas (spec 015-cards)

## Overview
Interface da spec `specs/015-cards`: lista de cartas dentro das páginas de coleção, modal de busca, modal de adicionar/editar carta e avisos. Desktop primeiro. Tudo em PT-BR. Sem nova rota e sem item de navegação (FR-001).

Este documento junta as decisões de layout das seções A (página da coleção), B (modal de busca), C (modal de adicionar/editar) e D (avisos e confirmações).

## About the Design Files
Os arquivos `.dc.html` deste pacote são **referências de design em HTML** — protótipos de aparência e comportamento, não código de produção. A tarefa é **recriá-los no app Angular existente** (`src/app/...`), usando os componentes e tokens do Grimorio (`CompactModal`, `app-toast`, classes `.btn`, `.field`, `.plate`, `.eyebrow`, `.micro-label`, etc.).

## Fidelity
**Alta fidelidade.** Cores, tipografia, espaçamento e animações usam os tokens do Grimorio Design System. Valores `var(--*)` abaixo são os tokens reais; os exemplos de carta (nomes, sets, artistas) são dados de exemplo.

Imagens de cartas são **marcadores** nos mocks: caixa 5:7, borda `1px solid var(--color-border)`, fundo `linear-gradient(var(--color-surface-raised), var(--color-surface))`. No app entra a imagem real (`imageUrl` / `faces`). Sem imagem: manter o marcador.

---

## A. Página da coleção (`Cards List Details.dc.html`)

### Estrutura (coleção folha, com cartas)
Coluna da página existente: `max-width: 1080px`, grid `minmax(0,1fr) 220px`, gap `--space-6`, padding `--space-5`.

**Coluna principal, de cima para baixo (cabeçalho fixo, ver "Rolagem"):**
1. **Linha do caminho (breadcrumb):** `Coleção · {nome}` à esquerda; **Editar** (`btn--secondary`) e **Excluir** (`btn--danger`) alinhados à direita nessa mesma linha. Ficam no topo, longe da grade, para evitar cliques acidentais.
2. **Título:** swatch 24px da cor da coleção (com glow), `h1` Grenze 600 `--font-size-2xl`, `--glow-title`.
3. **Barra da lista:** rádio `Só imagens` / `Com detalhes` à esquerda (rótulo `--font-size-sm`, alvo 44px); **Adicionar cartas** (`btn--primary`) à direita. Não há título "Cartas" nem placas de estatística na coluna principal.
4. **Grade de cartas.**

**Coluna lateral (220px, `border-left: 1px solid var(--color-border)`, `padding-left: --space-5`):**
- Resumo em uma linha: `**128** cartas · **6** à venda` (`--font-size-sm`, muted; números em `--color-text`), `white-space: nowrap`, com linha de 1px embaixo (`padding-bottom: --space-3`). Não mostra subcoleções (cartas e subcoleções nunca coexistem).
- Eyebrow `Buscar e filtrar`
- Campo de busca **desativado** (`field__input`, `opacity: .5`, `cursor: not-allowed`), placeholder `Buscar cartas`
- Texto `Filtros em breve.`

### Cartão da carta (opção 5b)
Imagem + placa de detalhes **coladas**, sem moldura externa.
- Imagem: `aspect-ratio: 5/7`, borda 1px, raio `6px`. Com detalhes visíveis: raio `6px 6px 0 0`.
- Placa: `margin-top: -1px`, `padding: --space-2`, borda 1px, raio `0 0 6px 6px`, fundo `--color-surface`.
  - Linha 1: `{SET} · {nº}` à esquerda (`--font-size-xs`, texto); `{Acabamento} · {Idioma} · {Condição}` à direita (muted). Ex.: `CMR · 472` / `Foil · EN · NM`.
  - Linha 2: `À venda` à esquerda (`.micro-label`, só quando à venda); `×{quantidade}` à direita (peso 700).
  - Sem nome da carta e sem artista (a imagem já mostra o nome).
- Grade: modo **Com detalhes** = 4 colunas, gap `--space-4` (linha) × `--space-3` (coluna). Modo **Só imagens** = 6 colunas, gap `--space-3` (ver "Em aberto").

### Alternância Só imagens ⇄ Com detalhes
- A placa fica sempre no fluxo, dentro de um wrapper `display:grid; grid-template-rows: 0fr → 1fr` + `opacity 0 → 1`, `transition .32s cubic-bezier(0.4,0,0.2,1)`. Filho interno com `min-height:0; overflow:hidden`. Assim a aba cresce e **empurra** as linhas de baixo.
- O raio inferior da imagem transiciona junto (`border-radius .32s`). A borda inferior da imagem fica sempre presente; a placa usa `margin-top:-1px` para a emenda não piscar.
- Persistir a escolha do rádio (preferência do perfil/aparelho).

### Rolagem
- **Cabeçalho fixo** (`position: sticky; top: 0`) do breadcrumb até a barra da lista, fundo opaco `--color-bg`, `z-index: 2`.
- **Sem linha dura** sob o cabeçalho: um elemento absoluto abaixo dele, `height: 32px`, `linear-gradient(var(--color-bg), transparent)`, `pointer-events: none`. As cartas somem ao passar por baixo.
- **Coluna lateral fixa**, ocupando a altura toda, ao lado da grade. Só a grade rola. Nenhuma carta passa por trás da coluna lateral.

### Estados da página
- **Vazia, sem subcoleções (A2):** duas placas lado a lado (`plate`, padding `--space-4`):
  - `Guardar cartas aqui` — "Adicione as cartas que estão fisicamente nesta coleção." — botão `btn--primary` **Adicionar cartas**.
  - `Dividir em subcoleções` — "Organize por gaveta, fichário ou pasta. Depois disso, as cartas ficam nas subcoleções." — botão `btn--secondary` **Nova subcoleção**.
  - Nota: "Uma coleção guarda cartas ou subcoleções — nunca os dois."
  - Resumo da lateral: `0 cartas · 0 à venda`. *(Textos são rascunhos no tom do app.)*
- **Com subcoleções (A3):** sem lista de cartas e **sem** "Adicionar cartas" (FR-004). Eyebrow `Subcoleções`; linhas no padrão das linhas de coleção (gradiente raised→surface, raio 8px, swatch 20px, nome + meta `260 cartas · 9 à venda`), **sem** texto "Abrir"; linha tracejada `+  Nova subcoleção`. Resumo da lateral soma as subcoleções.
- **Caixa de espera (A4), somente leitura:** breadcrumb sem Editar/Excluir; título com quadrado vazado 24px; mesmo rádio e **mesma grade 5b**; sem Adicionar cartas e sem editar. Texto: "Cartas sem lugar definido. Aqui só dá para ver — sem adicionar nem editar."

### Clique no cartão
Abre o modal de edição (seção C). Na caixa de espera, o cartão não é interativo.

---

## Efeito de hover (lista, caixa de espera e resultados da busca)
Aplica-se a **cada cartão** (imagem + placa quando visível). Tudo respeita `prefers-reduced-motion` (sem animação de borda/poeira).

1. **Borda giratória 1px:** camada atrás do cartão, `inset: -1px`, raio `7px`, `background: conic-gradient(from var(--spin-angle), …cores, cor1)`, `animation: spin 6s linear infinite` sobre `--spin-angle` (propriedade registrada em `motion.css`). `opacity 0 → 1` em `.24s`.
2. **Halo:** mesma camada, `inset: -5px`, `filter: blur(7px)`, raio `12px`, `opacity 0 → .45` em `.24s`.
3. **Crescer + sombra:** `transform: scale(1.08)`, `box-shadow: 0 14px 30px rgba(0,0,0,.65), 0 4px 10px rgba(0,0,0,.5)` (repouso: `0 1px 3px rgba(0,0,0,.4)`), `z-index: 10`, `transition .24s cubic-bezier(0.4,0,0.2,1)`. A placa de detalhes fica acima da borda/halo (`position: relative`).
4. **Poeira (uma vez por entrada do mouse):** 10 partículas saindo do **perímetro** do cartão para fora, em todas as direções. Tamanho `(2–4px) × 0.7`, `box-shadow: 0 0 4px 1px {cor}`, `animation: spark 3.6s cubic-bezier(0.4,0,0.2,1)`, atraso escalonado `k × .07s`, deslocamento `30px × jitter(0.7–1.5)` via `--dx/--dy` (keyframe `spark` de `motion.css`). Cores = as da borda, alternando.
5. **Só imagens:** ao passar o mouse, a placa de detalhes aparece com fade (`opacity`, `.24s`) como **overlay** logo abaixo do cartão (`position:absolute; top:100%; margin-top:-1px; z-index:4; pointer-events:none`), cobrindo o topo da linha de baixo; **não** empurra a grade.

**Cores pela identidade de cores da carta (`colorIdentity`):**
- 1 cor → a cor (tokens `--identity-w/u/b/r/g`: `#d8cdb0`, `#3d6b85`, `#7c5aa6`, `#a8402c`, `#4c7a43`)
- 2–3 cores → as cores em sequência no conic-gradient
- 4 cores → **prata** `#b6b8c2`, `#e8e9ee`, `#8d8f9b`
- 5 cores → **ouro** `#c49a3c`, `#f0d98a`, `#9a7424`
- incolor → neutro `#a89e96`, `#6b635c`

---

## B. Modal de busca (`Cards Search Modal.dc.html`)
Modal com anel + halo (padrão do app), largura **720px**, altura da face **640px**; área de resultados rola (`scrollbar-width: thin`). Fecha com ✕ (aria-label "Fechar"). Cor do anel: perfil ativo.

- Título `Adicionar cartas` (Grenze 600, `--font-size-xl`, `--glow-title`).
- Campo `Nome da carta` (`field`), placeholder `Ex.: sol ring`, helper `Mínimo de 3 caracteres.` Foco automático ao abrir.
- **Resultados: só imagens**, grade de **5 colunas**, gap `--space-4` × `--space-3`, padding da área `--space-3` (folga para o hover crescer). Um item por **carta** (não por impressão). Mesmo hover da lista (cores pela identidade da carta). Clique abre o modal de adicionar.
- **Não** mostra nome nem tipo (decisão de design, ver "Em aberto"). Cada item precisa de `aria-label` com nome e tipo.
- Estados:
  - **Inicial** (campo em foco): "Busque uma carta pelo nome para escolher a impressão que você tem."
  - **Menos de 3 caracteres:** "Digite pelo menos 3 caracteres para buscar." Nenhuma busca roda.
  - **Carregando:** 10 retângulos 5:7 (`--color-surface`, `opacity .6`) + `.micro-label` "Buscando…"
  - **Resultados:** grade; paginação por rolagem, 100 por página.
  - **Carregando mais:** `.micro-label` "Carregando mais…" no fim, resultados mantidos.
  - **Falha na página seguinte:** `plate` "Não foi possível carregar mais cartas." + `btn--secondary` **Tentar de novo**; resultados mantidos.
  - **Nenhum resultado:** "Nenhuma carta encontrada para “{texto}”. Confira a grafia — a busca usa o nome em inglês."
  - **Sem conexão:** `plate` "Sem conexão. O catálogo precisa de internet — o resto do app continua funcionando." + **Tentar de novo**.
- Só os resultados do último texto digitado são exibidos (descartar respostas antigas).

---

## C. Modal de adicionar / editar carta (`Cards Add Modal.dc.html`)
Modal com anel + halo, largura **880px**, dois painéis (`grid-template-columns: 300px minmax(0,1fr)`).

**Cor do modal = identidade da carta.** O container leva `data-theme-scope` e `--theme-primary/-accent/-tertiary` (+ `-hover`) com a mesma regra de cores do hover: 1 cor = a cor; 2–3 = papéis em ordem; 4 = prata; 5 = ouro; incolor = neutro. Anel, halo, botão primário, foco e glows seguem.

**Painel esquerdo** (`background: var(--wash-header)`, `border-right: 1px solid var(--color-border)`, padding `--space-6 --space-5`, gap `--space-3`):
1. Imagem da impressão selecionada, 5:7, raio 6px, largura total.
2. Campo `Buscar set` — placeholder "Nome ou código do set"; **filtra** as opções do seletor abaixo (por nome ou código do set).
3. Seletor `Impressão` (nativo/`field__input`). A lista aberta mostra cada impressão com miniatura 28px 5:7 + `{Nome do set} · {CÓDIGO} · {nº}` e, embaixo, o **artista** (`--font-size-xs`, muted); item atual com fundo `--color-surface-raised`; lista com borda `--role-primary` e `--glow-plate-hover`.

**Painel direito:** linha do ✕ (44×44); depois, com padding `0 --space-6 --space-6`:
1. Eyebrow `Adicionar carta` / `Editar carta`; nome da carta (Grenze 600 xl, glow); linha com **tipo à esquerda** e **artista à direita** (`--font-size-sm`, muted).
2. Divisor de **1px** (`--color-border`). *(Não usar `.divider` do DS: ele desenha duas linhas com vão.)*
3. Grade 2 colunas (gap `--space-4`): `Acabamento` (Normal/Foil/Etched), `Idioma` (inglês primeiro), `Condição` (NM/LP/MP/HP/DMG), `Quantidade` (inteiro ≥ 1; erro `field__error`: "Use um número inteiro de 1 ou mais.", `aria-invalid`).
4. `Notas` — textarea 2 linhas, placeholder "Opcional".
5. **Rodapé fixo no fundo do modal** (`margin-top:auto`, `border-top: 1px solid var(--color-border)`, `padding-top: --space-4`):
   - **À esquerda:** caixa `À venda` (quadrado 18px, borda 1px, raio 4px; marcado = quadrado interno 10px `--role-primary`; sem glifo ✓), `margin-right:auto`.
   - **À direita:** `Cancelar` (`btn--ghost`), `Salvar e adicionar outra` (`btn--secondary`, **só ao adicionar**), `Salvar` (`btn--primary`).

**Comportamento:**
- O modal **abre já com uma impressão inicial** selecionada; não existe estado "nenhuma impressão escolhida". Salvar só fica bloqueado por erro de validação.
- Padrões: Normal, Inglês, NM, 1, não à venda, sem notas.
- Quantidade inválida: Salvar e Salvar-e-adicionar-outra desativados, erro visível.
- **Editar:** mesmo layout; seletor lista as **outras impressões da mesma carta**; sem "Salvar e adicionar outra"; coleção não editável.
- `Salvar e adicionar outra` → fecha este modal, volta à busca com texto/resultados intactos + toast. `Salvar` → fecha os dois modais.
- *Sem tela de "catálogo indisponível" neste modal* (removida). Trocar a impressão exige internet; tratar a falha fora deste layout (ver "Em aberto").

---

## D. Avisos e confirmações (`Cards Notices.dc.html`)
**Duplicata (somente em coleções; decks não entram na regra)** — modal compacto (480px, anel + halo na identidade da carta; padding do corpo `0 --space-6 --space-6`, gap `--space-4`):
- Título `Você já tem esta carta`; subtítulo: "Mesma impressão, acabamento, idioma e condição. Está em “{coleção}”." (ao editar: "Com essa mudança, a carta fica igual a outra que você já tem em “{coleção}”.")
- `plate` da linha existente: miniatura 36px (marcador, sem rótulo), nome (700), meta `SET · nº · acabamento · idioma · condição`, `×qtd` à direita e coleção em `.micro-label`.
- Escolhas em rádio (padrão do diálogo de excluir do app: bloco com gradiente, raio 8px, indicador 18px, selecionado = borda e preenchimento `--role-primary` + `--glow-plate-hover`; sub em `--font-size-xs` muted):
  - **Adicionar:** `Somar à quantidade existente` ("A linha existente passa de 2 para 3 cópias e fica onde está.") · `Adicionar como linha separada` ("Cria uma nova linha em “{coleção}”.")
  - **Editar:** `Somar à quantidade existente` ("A quantidade desta carta é somada à outra linha, e esta linha deixa de existir.") · `Manter as duas linhas`
- Ações: `Cancelar` (ghost) + `Continuar` (primary).

**Coleção ganhou subcoleções durante a adição (FR-017)** — modal compacto na **cor da coleção de destino**: título `Carta adicionada em outra coleção`; "Enquanto você adicionava, “{coleção}” ganhou subcoleções. A carta foi para “{subcoleção}”, a primeira em ordem alfabética."; linha da carta (como acima, com a subcoleção em `.micro-label`); botão único **Ok** (primary). Fechar só pelo Ok.

**Confirmações (toast do app, canto superior direito)** — `380px`, `inset: calc(44px + --space-4) --space-4 auto auto`, borda `--role-primary`, fundo `--color-surface-raised`, glow `0 0 18px -4px rgb(from var(--role-primary) r g b / 55%)`; ponto 8px `--role-accent`, `.micro-label` + mensagem, ✕ 44×44. Cor da coleção.
- `Carta adicionada` — "{Nome} ×{qtd} em “{coleção}”."
- `Carta atualizada` — "{Nome} foi atualizada."
- `Nada foi salvo` — "A coleção “{coleção}” não existe mais. Você voltou para as coleções." (coleção excluída com modal aberto; cor padrão do perfil)

---

## Interactions & Behavior (resumo)
- "Adicionar cartas" só na coleção folha (sem subcoleções) e nunca na caixa de espera (FR-004).
- Busca: mínimo 3 caracteres, 100 por página, rolagem infinita, ignora caixa/acentos.
- Duplicata: verificar no perfil inteiro (coleções); salvar nada até a escolha.
- Salvar local primeiro; nunca dispara sync (FR-023). Contagens da coleção atualizam na hora (FR-016).
- Tamanho mínimo de alvo de toque: 44px.

## State Management
- Lista: `viewMode: 'images' | 'details'` (persistido); cartas da coleção; cartão em hover (para efeitos); rolagem.
- Busca: texto, página, resultados, estado (`idle | short | loading | ok | empty | offline`), `loadingMore`, `moreFailed`.
- Adicionar/editar: carta escolhida, lista de impressões, impressão atual, filtro de set, finish/language/condition/quantity/forSale/notes, erros.
- Duplicata: linha correspondente, escolha.

## Design Tokens (Grimorio)
Neutros: `--color-bg #14110f`, `--color-surface #1e1a17`, `--color-surface-raised #292320`, `--color-border #3a332e`, `--color-text #f2ede8`, `--color-text-muted #a89e96`, perigo `--color-danger`/`-bg`. Papéis: `--role-primary/-accent/-tertiary`. Tipografia: Grenze 600/700 (títulos), Karla (funcional); tamanhos 0.75/0.875/1/1.25/1.5/2rem. Espaços: `--space-1..6` (≤ 2rem). Raios: 4px controles, 8px containers, `--radius-ring` anel, 50% swatches. Movimento: easing `cubic-bezier(0.4,0,0.2,1)`; 0.18s hover de controles, 0.24s hover de cartão/fade, 0.32s alternância de detalhes, keyframes `spark`, `flicker`, `--spin-angle`. Elevação = luz: `--glow-*`, `--ring-gradient`, `--halo-gradient`.

## Em aberto
1. **Nome e tipo nos resultados da busca (FR-008):** o design mostra só a imagem. Garantir `aria-label`; confirmar se o hover deve ter tooltip.
2. **Colunas no modo "Só imagens":** 6 na lista estática; o teste de hover usou 4. Definir o número final.
3. **Artista (FR-027/028):** aparece no seletor de impressão e no cabeçalho do modal; **não** aparece na lista. Para editar offline, o artista precisa estar no registro da carta ou ser omitido sem rede.
4. **Falha de rede ao trocar a impressão** (FR-024/025): sem layout definido; sugerir erro no próprio seletor.
5. **Cores prata/ouro/neutro** vêm das decisões do hover; o design system não as define.
6. **Estado vazio (FR-003):** textos são rascunhos.

## Assets
Nenhum. Sem ícones, sem imagens reais; glifos de texto só ✕ e +. Imagens de carta vêm do catálogo.

## Files
- `Cards List Details.dc.html` — A (rodada 1: estados A1–A4; rodadas 2–6: posição do botão, resumo, rolagem, detalhes 5b, teste de hover)
- `Cards Search Modal.dc.html` — B
- `Cards Add Modal.dc.html` — C (rodada 2 = posição do "À venda"; a escolhida é 2a)
- `Cards Notices.dc.html` — D
- `Cards Wireframes.dc.html` — wireframes iniciais (baixa fidelidade), referência de escopo
