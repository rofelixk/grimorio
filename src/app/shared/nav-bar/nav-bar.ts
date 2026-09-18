import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CardService } from '@services/card.service';
import { DeckService } from '@services/deck.service';
import { ThemeService } from '@services/theme.service';
import { AuthControl } from '@shared/auth-control/auth-control';
import { BrandMark } from '@shared/brand-mark/brand-mark';
import { SyncIndicator } from '@shared/sync-indicator/sync-indicator';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, AuthControl, BrandMark, SyncIndicator],
  selector: 'app-nav-bar',
  styleUrl: './nav-bar.scss',
  templateUrl: './nav-bar.html',
  host: {
    '[style.--nav-bar-primary]': 'themeService.roles().primary',
    '[style.--nav-bar-accent]': 'themeService.roles().accent',
  },
})
export class NavBar {
  protected readonly themeService = inject(ThemeService);
  private readonly deckService = inject(DeckService);
  private readonly cardService = inject(CardService);

  readonly drawerOpen = signal(false);

  readonly decksCount = computed(() => this.deckService.decks().length.toLocaleString('pt-BR'));
  readonly collectionCount = computed(() =>
    this.cardService
      .cards()
      .reduce((sum, card) => sum + card.quantity, 0)
      .toLocaleString('pt-BR'),
  );

  toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
