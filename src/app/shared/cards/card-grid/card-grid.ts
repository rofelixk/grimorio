import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CARD_LANGUAGES, CardEntry } from '@models/card.model';
import { CARD, FINISH_NAMES } from '@utils/card-copy';
import { CardTile, TileDetails } from '../card-tile/card-tile';

interface GridTile {
  card: CardEntry;
  details: TileDetails;
  label: string;
}

const LANGUAGES = new Map(CARD_LANGUAGES.map((l) => [l.code, l]));

// The owned cards of one place as 5b tiles (DESIGN.md "Cards" → "Card grid"). Every card is
// rendered; each tile skips layout and paint while off-screen (research R16), so thousands of
// cards need no scroller. "Só imagens" shows the plate as a hover overlay, "Com detalhes" in flow.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-card-grid',
  imports: [CardTile],
  templateUrl: './card-grid.html',
  styleUrl: './card-grid.scss',
})
export class CardGrid {
  readonly cards = input.required<readonly CardEntry[]>();
  readonly mode = input.required<'images' | 'details'>();
  /** Tiles are buttons that open the edit modal; read-only (the holding box) otherwise. */
  readonly editable = input(false);
  readonly edit = output<CardEntry>();

  protected readonly tiles = computed<GridTile[]>(() =>
    this.cards().map((card) => {
      const language = LANGUAGES.get(card.language);
      const details: TileDetails = {
        set: card.setCode,
        number: card.collectorNumber,
        finish: FINISH_NAMES[card.finish],
        language: language?.label ?? card.language.toUpperCase(),
        condition: card.condition,
        quantity: card.quantity,
        forSale: card.forSale,
      };
      const description = CARD.tileLabel({
        name: card.name,
        setCode: card.setCode,
        collectorNumber: card.collectorNumber,
        finish: details.finish,
        language: language?.name ?? card.language,
        condition: card.condition,
        quantity: card.quantity,
        forSale: card.forSale,
      });
      return { card, details, label: this.editable() ? CARD.tileEdit(description) : description };
    }),
  );
}
