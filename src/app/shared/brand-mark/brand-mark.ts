import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '@services/theme.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-brand-mark',
  styleUrl: './brand-mark.scss',
  templateUrl: './brand-mark.html',
  host: {
    '[style.--brand-mark-primary]': 'themeService.roles().primary',
    '[style.--brand-mark-accent]': 'themeService.roles().accent',
  },
})
export class BrandMark {
  protected readonly themeService = inject(ThemeService);
}
