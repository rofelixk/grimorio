import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { type Deck, formatOf } from '@models/deck.model';
import { DeckService } from '@services/deck.service';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { CreateRow } from '@shared/collections/create-row/create-row';
import { DeckTile } from '@shared/decks/deck-tile/deck-tile';
import { DECK } from '@utils/deck-copy';
import { type DeckPlace, samePlace } from '@utils/deck-turn.util';
import { DeckTurn } from './deck-turn';

// The deck area view (spec 009): one route/component instance for the deck list and a deck page,
// matched by `deckMatcher` (app.routes.ts) and fed `ref` via `withComponentInputBinding`. The
// routed place drives `DeckTurn`; the template renders its `shown()` place, plus — while a turn
// runs — the list as a page turning over the deck page. No wash or theme scope: a deck's colors
// appear only in the dust (research R13).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-deck-area',
  imports: [NgTemplateOutlet, RouterLink, CreateRow, DeckTile],
  providers: [DeckTurn],
  styleUrl: './deck-area.scss',
  templateUrl: './deck-area.html',
  host: {
    '[attr.inert]': "turn.turning() ? '' : null",
    '[class.is-turning]': 'turn.turning() !== null',
  },
})
export class DeckArea {
  readonly ref = input<string>();

  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly decks = inject(DeckService);
  protected readonly turn = inject(DeckTurn);
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);

  protected readonly copy = DECK;

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly dust = viewChild<ElementRef<HTMLCanvasElement>>('dust');

  /** The place the address asks for (FR-005). */
  protected readonly routed = computed<DeckPlace>(
    () => {
      const ref = this.ref();
      return ref ? { kind: 'deck', id: ref } : { kind: 'list' };
    },
    { equal: samePlace },
  );

  /** The address names a deck that isn't there (deleted, removed by a sync, another profile's). */
  private readonly missing = computed(() => {
    const place = this.routed();
    return place.kind === 'deck' && !this.decks.byId().has(place.id);
  });

  protected readonly empty = computed(() => this.decks.decks().length === 0);

  /**
   * The deck on the deck page. It follows the shown deck's record, but keeps its last value once
   * the deck leaves the signal, so a delete in flight or a sync removal never blanks the header.
   */
  protected readonly shownDeck = linkedSignal<{ id: string | null; deck: Deck | undefined }, Deck | undefined>({
    source: () => {
      const shown = this.turn.shown();
      const id = shown.kind === 'deck' ? shown.id : null;
      return { id, deck: id ? this.decks.byId().get(id) : undefined };
    },
    computation: (source, previous) =>
      source.deck ?? (previous?.value && previous.value.id === source.id ? previous.value : undefined),
  });

  /** The open create/edit dialog, if any; the person stays on the current place after it. */
  protected readonly form = signal<{ mode: 'create' | 'edit'; deckId?: string } | null>(null);

  /** The deck whose delete dialog is open. */
  protected readonly del = signal<string | null>(null);

  /** The `<main>` scroll captured when a turn starts, so the page lifts from where the person was. */
  protected readonly pageOffset = signal(0);

  /** The page layer's angle: it starts flat (open) or turned over (close) for the entering frames. */
  protected readonly pageTransform = computed(() => {
    const open = this.turn.turning() === 'open';
    const entering = this.turn.entering();
    return `rotateY(${open === entering ? 0 : -180}deg)`;
  });

  constructor() {
    // Drive the turn from the address, once per new place. A missing deck is left to the redirect
    // below, so the page never turns into nothing.
    let last: DeckPlace | null = null;
    effect(() => {
      const place = this.routed();
      if (this.missing()) return;
      untracked(() => {
        if (last && samePlace(last, place)) return;
        last = place;
        const main = this.host.nativeElement.closest('main');
        const scroll = main?.scrollTop ?? 0;
        this.turn.go(place);
        if (this.turn.turning() && main) {
          this.pageOffset.set(scroll);
          main.scrollTop = 0;
        }
      });
    });

    // Unknown ids go back to the list with no turn (FR-005). Skipped while a delete runs: its own
    // navigation lands on the list once it commits (T025).
    effect(() => {
      if (!this.missing()) return;
      untracked(() => {
        if (this.del()) return;
        this.router.navigate(['/decks'], { replaceUrl: true });
      });
    });

    // Focus the new place's h1 after each swap or turn (not the first render), so it's announced.
    let first = true;
    effect(() => {
      this.turn.shown();
      if (this.turn.turning()) return;
      if (first) {
        first = false;
        return;
      }
      afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
    });

    effect(() => {
      const canvas = this.dust();
      if (canvas) {
        this.turn.attachCanvas(canvas.nativeElement, this.host.nativeElement);
      }
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
}
