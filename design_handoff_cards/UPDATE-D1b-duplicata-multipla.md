# Handoff update — D1b: duplicata em mais de uma coleção

Complementa a seção D do `README.md`. Referência visual: quadro **1b** de `Cards Notices.dc.html`.

## Quando aparece
Ao **adicionar** uma carta cuja correspondência (mesma impressão, acabamento, idioma e condição) já existe em **2 ou mais coleções** do perfil. Com 1 correspondência, continua valendo o aviso D1a. Decks não entram na regra.

> Nota de numeração: neste arquivo de design, o antigo D1 "ao editar" virou 1c, a subcoleção 1d e as confirmações 1e. O README ainda usa a numeração antiga (1a, 1b = editar, 1c, 1d).

## Layout
Modal compacto: 480px, anel + halo na **identidade da carta**, padding do corpo `0 --space-6 --space-6`, gap `--space-4`, ✕ no topo (44×44).

1. **Título:** `Você já tem esta carta em {n} lugares` (Grenze 600 `--font-size-xl`, `--glow-title`).
2. **Subtítulo:** `Mesma impressão, acabamento, idioma e condição.` (`--font-size-sm`, muted).
3. **Campo "Onde ela está"** (`field`, label `.field__label`) com **dropdown próprio** (ver abaixo). Sem texto de ajuda abaixo.
4. **Duas opções em rádio** (mesmo padrão do D1a):
   - `Somar à quantidade existente` — sub: `A linha existente passa de {N} para {N+1} cópias e fica onde está.` ({N} = quantidade da linha escolhida no dropdown; muda quando a escolha muda). Marcada por padrão.
   - `Adicionar como linha separada` — sub: `Cria uma nova linha em “{coleção atual}”, a coleção que você está usando.`
5. **Ações:** `Cancelar` (`btn--ghost`) + `Continuar` (`btn--primary`).

Não há linha de resumo da carta (`plate` com miniatura) neste aviso: os lugares ficam no dropdown.

## Dropdown "Onde ela está"
**Gatilho** (`<button class="field__input">`, `width: 100%`, `min-height: 44px`, `display:flex`, gap `--space-3`):
- nome da coleção (flex 1, uma linha, reticências) · `×{qtd}` (peso 700) · seta.
- Seta: quadrado 7×7px com bordas direita e inferior de 1px `--color-text-muted`, `rotate(45deg)` fechado, `rotate(225deg)` aberto, `transition .18s cubic-bezier(0.4,0,0.2,1)`. (Sem glifo de ícone: o DS só usa ✕ e +.)
- Aberto: borda `--role-primary`. Atributos `aria-haspopup="listbox"`, `aria-expanded`.

**Lista** (`role="listbox"`, `position:absolute; left:0; right:0; top:calc(100% + 4px); z-index:6`):
- Borda `1px solid var(--role-primary)`, raio `--radius-sm`, fundo `--color-surface`, `box-shadow: var(--glow-plate-hover)`, `overflow:hidden`. Abre **por cima** das opções de rádio.
- Item (`role="option"`): altura mínima 44px, padding `0 --space-3`, gap `--space-3`, `border-bottom: 1px solid var(--color-border)`:
  - miniatura 22px, 5:7, raio 3px (marcador de imagem, sem rótulo)
  - nome da coleção (flex 1, reticências)
  - `×{qtd}` (700)
- Item selecionado: fundo `--color-surface-raised`.
- Mais de ~5 itens: altura máxima com rolagem interna (`scrollbar-width: thin`).

## Comportamento
- Padrão: primeiro lugar da lista selecionado (sugestão: ordenar por quantidade ou coleção mais recente; definir na implementação).
- Clicar no gatilho abre/fecha; escolher um item fecha e atualiza o gatilho e a descrição de "Somar".
- Esc fecha a lista (se aberta) antes de fechar o modal. Teclado: setas navegam, Enter escolhe.
- **Somar:** incrementa a quantidade da **linha escolhida no dropdown**; nada é criado.
- **Adicionar como linha separada:** cria nova linha na coleção atual; o dropdown é ignorado.
- Cancelar não salva nada. Nada dispara sync (FR-023).

## Cores
Anel, halo, foco, rádio selecionado e borda do dropdown aberto seguem a identidade da carta (mesma regra do modal C: 1 cor = a cor; 2–3 em ordem; 4 = prata `#b6b8c2`; 5 = ouro `#c49a3c`; incolor = neutro `#a89e96`).

## Em aberto
- Seleção padrão do dropdown e ordenação dos lugares.
- Se o dropdown deve ficar visível quando "Adicionar como linha separada" está marcada (hoje fica, mas não tem efeito).
- Textos são rascunhos no tom do app.
