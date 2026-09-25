import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { CardService } from '@services/card.service';
import { DeckService } from '@services/deck.service';
import { ThemeService } from '@services/theme.service';
import { BrandMark } from '@shared/layout/brand-mark/brand-mark';
import { CollectionFilters } from '@shared/locations/collection-filters/collection-filters';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, BrandMark, CollectionFilters],
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
  private readonly router = inject(Router);

  readonly drawerOpen = signal(false);

  // The :id param of the currently active route, but only when that route
  // opts in via its `data.showCollectionFilters` (see app.routes.ts) —
  // re-derived on every NavigationEnd by walking the routerState's
  // firstChild chain down to the deepest activated route, since NavBar sits
  // outside the <router-outlet> and has no ActivatedRoute of its own to
  // inject. Reading route data instead of hardcoding the route's path
  // keeps app.routes.ts the single source of truth for the route shape.
  readonly collectionLocationId = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.readActiveCollectionId()),
    ),
    { initialValue: this.readActiveCollectionId() },
  );

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

  private readActiveCollectionId(): string | null {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data['showCollectionFilters'] ? route.snapshot.paramMap.get('id') : null;
  }
}
