import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { PlanarCard, PlanarSet } from '../../core/data/planechase/planar-card.model';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { PlanechaseCatalogService } from '@services/planechase-catalog.service';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { DECK } from '@utils/planechase-copy';
import { enabledCards, sameEnabledSet, validateSelection } from '@utils/planar-selection.util';
import { PlanarTile } from '@shared/gameplay/planar-tile/planar-tile';

// "Baralho planar" (FR-017–FR-022, R14): a draft of disabled ids that only "Salvar" stores. The
// draft is component state, so leaving any other way discards it silently; it follows the saved
// selection (e.g. after a profile switch) until the person touches it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planechase-deck',
  imports: [RouterLink, PlanarTile],
  templateUrl: './planechase-deck.html',
  styleUrl: './planechase-deck.scss',
})
export class PlanechaseDeck {
  private readonly catalog = inject(PlanechaseCatalogService);
  private readonly selection = inject(PlanarSelectionService);
  private readonly game = inject(PlanechaseGameService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly copy = DECK;
  protected readonly sets = this.catalog.sets;

  /** Disabled ids; unknown ids from the saved selection are kept (R11). */
  protected readonly draft = linkedSignal<ReadonlySet<string>>(
    () => new Set(this.selection.selection()?.disabledIds ?? []),
  );
  /** Set codes whose tiles are hidden; not saved (FR-017). */
  protected readonly collapsed = signal<ReadonlySet<string>>(new Set());
  protected readonly error = signal<string | null>(null);
  protected readonly confirming = signal(false);

  private readonly enabled = computed(() => {
    const draft = this.draft();
    return this.catalog.cards().filter((card) => !draft.has(card.id));
  });
  protected readonly counter = computed(() => {
    const enabled = this.enabled();
    const phenomena = enabled.filter((card) => card.kind === 'phenomenon').length;
    return DECK.count(enabled.length, this.catalog.cards().length, phenomena);
  });
  protected readonly notice = computed(() => {
    const check = validateSelection(this.enabled());
    return check.ok && check.notice;
  });

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly keepButton = viewChild<ElementRef<HTMLButtonElement>>('keepButton');
  private readonly saveButton = viewChild<ElementRef<HTMLButtonElement>>('saveButton');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus({ preventScroll: true }));
  }

  protected isOn(card: PlanarCard): boolean {
    return !this.draft().has(card.id);
  }

  protected onCount(set: PlanarSet): number {
    const draft = this.draft();
    return set.cards.filter((card) => !draft.has(card.id)).length;
  }

  protected toggle(card: PlanarCard): void {
    this.edit((draft) => (draft.has(card.id) ? draft.delete(card.id) : draft.add(card.id)));
  }

  protected setAll(set: PlanarSet, on: boolean): void {
    this.edit((draft) => set.cards.forEach((card) => (on ? draft.delete(card.id) : draft.add(card.id))));
  }

  protected toggleCollapsed(set: PlanarSet): void {
    const next = new Set(this.collapsed());
    if (!next.delete(set.code)) {
      next.add(set.code);
    }
    this.collapsed.set(next);
  }

  protected save(): void {
    const enabled = this.enabled();
    const check = validateSelection(enabled);
    if (!check.ok) {
      this.error.set(check.error === 'tooFew' ? DECK.errorTooFew(check.count) : DECK.errorNoPlane);
      return;
    }
    this.error.set(null);
    const saved = enabledCards(this.catalog.cards(), this.selection.selection()).map((card) => card.id);
    const ids = enabled.map((card) => card.id);
    if (this.game.inProgress() && !sameEnabledSet(ids, saved)) {
      this.confirming.set(true);
      afterNextRender(() => this.keepButton()?.nativeElement.focus(), { injector: this.injector });
      return;
    }
    this.store();
  }

  /** "Salvar e reiniciar": the new deck replaces the game with a fresh one (FR-022). */
  protected restart(): void {
    const ids = this.enabled().map((card) => card.id);
    this.store();
    this.game.start(ids);
  }

  /** "Manter partida": nothing is saved; the draft stays open. */
  protected keep(): void {
    this.confirming.set(false);
    afterNextRender(() => this.saveButton()?.nativeElement.focus(), { injector: this.injector });
  }

  private store(): void {
    this.selection.save([...this.draft()]);
    void this.router.navigateByUrl('/modes/planechase');
  }

  private edit(change: (draft: Set<string>) => void): void {
    const next = new Set(this.draft());
    change(next);
    this.draft.set(next);
    this.error.set(null);
  }
}
