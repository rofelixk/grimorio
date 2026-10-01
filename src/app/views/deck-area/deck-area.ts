import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type Deck, formatOf } from '@models/deck.model';
import { DeckService } from '@services/deck.service';
import { ToastService } from '@services/toast.service';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { CreateRow } from '@shared/collections/create-row/create-row';
import { DeckDeleteDialog, type DeckDeleted } from '@shared/decks/deck-delete-dialog/deck-delete-dialog';
import { DeckFormDialog } from '@shared/decks/deck-form-dialog/deck-form-dialog';
import { DeckTile } from '@shared/decks/deck-tile/deck-tile';
import { injectPageChange, retained } from '@shared/effects/page-sweep/page-change';
import { PagePlace } from '@shared/effects/page-sweep/page-place';
import { PageSweep } from '@shared/effects/page-sweep/page-sweep';
import { DECK } from '@utils/deck-copy';
import { type DeckPlace, DECK_PAGES } from '@utils/deck-pages.util';
import { NO_SWEEP_INFO } from '@utils/page-change.util';

const deckId = (place: DeckPlace | null) => (place?.kind === 'deck' ? place.id : null);

// The deck area view (spec 009): one route/component instance for the deck list and a deck page,
// matched by `deckMatcher` (app.routes.ts) and fed `ref` via `withComponentInputBinding`. The
// routed place drives the shared page change (`DECK_PAGES`); `<app-page-sweep>` renders its shown
// place, plus — while a sweep runs — the leaving place over it, dissolving behind the dust's front.
// No wash or theme scope: a deck's colors appear only in the dust (research R13).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-area',
  imports: [RouterLink, CreateRow, DeckDeleteDialog, DeckFormDialog, DeckTile, PagePlace, PageSweep],
  styleUrl: './deck-area.scss',
  templateUrl: './deck-area.html',
})
export class DeckArea {
  readonly ref = input<string>();

  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  protected readonly decks = inject(DeckService);
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly copy = DECK;

  /** The place the address asks for (FR-005). */
  protected readonly routed = computed<DeckPlace>(
    () => {
      const ref = this.ref();
      return ref ? { kind: 'deck', id: ref } : { kind: 'list' };
    },
    { equal: DECK_PAGES.same },
  );

  /** The address names a deck that isn't there (deleted, removed by a sync, another profile's). */
  private readonly missing = computed(() => {
    const place = this.routed();
    return place.kind === 'deck' && !this.decks.byId().has(place.id);
  });

  /** A missing deck is left to the redirect below, so the page never sweeps into nothing. */
  protected readonly pages = injectPageChange<DeckPlace>({
    ...DECK_PAGES,
    target: () => (this.missing() ? null : this.routed()),
  });

  protected readonly empty = computed(() => this.decks.decks().length === 0);

  /**
   * The deck on the shown and on the leaving deck page. Each follows its deck's record, but keeps
   * its last value once the deck leaves the signal, so a delete in flight or a sync removal never
   * blanks the header, even while it dissolves.
   */
  protected readonly shownDeck = retained(() => deckId(this.pages.shown()), (id) => this.decks.byId().get(id));
  protected readonly leavingDeck = retained(() => deckId(this.pages.leaving()), (id) => this.decks.byId().get(id));

  /** The open create/edit dialog, if any; the person stays on the current place after it. */
  protected readonly form = signal<{ mode: 'create' | 'edit'; deckId?: string } | null>(null);

  /** The deck whose delete dialog is open. */
  protected readonly del = signal<string | null>(null);

  constructor() {
    // Unknown ids go back to the list with no sweep (FR-005). Skipped while a delete runs: its own
    // navigation lands on the list once it commits.
    effect(() => {
      if (!this.missing()) return;
      untracked(() => {
        if (this.del()) return;
        void this.router.navigate(['/decks'], { replaceUrl: true, info: NO_SWEEP_INFO });
      });
    });
  }

  protected formatName(deck: Deck): string {
    return DECK.formats[formatOf(deck.format)].name;
  }

  protected openCreate(): void {
    this.form.set({ mode: 'create' });
  }

  protected openEdit(deckId: string): void {
    this.form.set({ mode: 'edit', deckId });
  }

  protected openDelete(deckId: string): void {
    this.del.set(deckId);
  }

  // Lands on the list with no sweep, then closes the dialog. `del` stays set until the navigation
  // lands, so the missing-deck redirect never fires a second navigation.
  protected async onDeleted({ name, cards }: DeckDeleted): Promise<void> {
    await this.router.navigate(['/decks'], { info: NO_SWEEP_INFO });
    this.del.set(null);
    this.toasts.show(DECK.toastLabel, cards > 0 ? DECK.toastMoved(name, cards) : DECK.toastDeleted(name));
  }
}
