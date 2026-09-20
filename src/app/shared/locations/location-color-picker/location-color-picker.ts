import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Color } from '@models/card.model';
import { MTG_PRINT_COLORS } from '@utils/card-color.util';

const COLOR_ORDER: Color[] = ['W', 'U', 'B', 'R', 'G'];

const COLOR_LABELS: Record<Color, string> = {
  W: 'Branco',
  U: 'Azul',
  B: 'Preto',
  R: 'Vermelho',
  G: 'Verde',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-location-color-picker',
  styleUrl: './location-color-picker.scss',
  templateUrl: './location-color-picker.html',
})
export class LocationColorPicker {
  protected readonly colorOrder = COLOR_ORDER;
  protected readonly palette = MTG_PRINT_COLORS;
  protected readonly labels = COLOR_LABELS;

  readonly selected = input.required<Color>();
  readonly selectedChange = output<Color>();

  isSelected(color: Color): boolean {
    return this.selected() === color;
  }

  select(color: Color): void {
    this.selectedChange.emit(color);
  }
}
