import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Color } from '@models/card.model';
import { MAX_THEME_COLORS, THEME_COLOR_ORDER, THEME_COLOR_PALETTE, ThemeService } from '@services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-color-theme-picker',
  styleUrl: './color-theme-picker.scss',
  templateUrl: './color-theme-picker.html',
})
export class ColorThemePicker {
  protected readonly themeService = inject(ThemeService);
  protected readonly colorOrder = THEME_COLOR_ORDER;
  protected readonly palette = THEME_COLOR_PALETTE;
  protected readonly maxColors = MAX_THEME_COLORS;

  isSelected(color: Color): boolean {
    return this.themeService.colors().includes(color);
  }

  toggle(color: Color): void {
    this.themeService.toggle(color);
  }
}
