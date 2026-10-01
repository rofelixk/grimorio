import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { PlanarCard, PlanarSet } from '@data/planechase/planar-card.model';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { PlanechaseCatalogService } from '@services/planechase-catalog.service';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { DECK } from '@utils/planechase-copy';
import { enabledCards, initialDisabledIds, sameEnabledSet, validateSelection } from '@utils/planar-selection.util';
import { placePopover } from '@utils/planar-preview.util';
import { mediaQuerySignal } from '@shared/ds/media-query';
import { PlanarPreviewContent } from '@shared/gameplay/planar-preview/planar-preview';
import { PlanarPreviewDialog } from '@shared/gameplay/planar-preview-dialog/planar-preview-dialog';
import { PlanarTile } from '@shared/gameplay/planar-tile/planar-tile';
import { PlanarPreviewController } from './planar-preview.controller';

// "Baralho planar" (FR-017–FR-022, R14): a draft of disabled ids that only "Salvar" stores. The
// draft is component state, so leaving any other way discards it silently; it follows the saved
// selection (e.g. after a profile switch) until the person touches it. Spec 007 adds the card
// preview: a hover popover placed beside its tile, and a dialog (PlanarPreviewController).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planechase-deck',
  imports: [RouterLink, PlanarTile, PlanarPreviewContent, PlanarPreviewDialog],
  providers: [PlanarPreviewController],
  templateUrl: './planechase-deck.html',
  styleUrl: './planechase-deck.scss',
})
export class PlanechaseDeck {
  protected readonly preview = inject(PlanarPreviewController);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly catalog = inject(PlanechaseCatalogService);
  private readonly selection = inject(PlanarSelectionService);
  private readonly game = inject(PlanechaseGameService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly copy = DECK;
  protected readonly sets = this.catalog.sets;

  /** Disabled ids (the default list while nothing is saved); unknown ids are kept (R11). */
  protected readonly draft = linkedSignal<ReadonlySet<string>>(
    () => new Set(initialDisabledIds(this.selection.selection())),
  );
  /** Hybrid devices count as pointer devices: their main input is the mouse or trackpad (R8). */
  protected readonly hoverCapable = mediaQuerySignal('(hover: hover) and (pointer: fine)');
  protected readonly popoverId = 'planar-preview-popover';
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
  private readonly popover = viewChild<ElementRef<HTMLElement>>('popover');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus({ preventScroll: true }));
    this.preview.connect({
      sets: this.sets,
      collapsed: this.collapsed,
      confirming: this.confirming,
      tileFor: (id) => this.host.querySelector<HTMLElement>(`[data-card-id="${id}"] button`) ?? undefined,
    });

    // Keeps the popover beside its tile while it shows: on switch, scroll, resize, and whenever
    // its own size changes (image load, text length).
    afterRenderEffect((onCleanup) => {
      const popover = this.popover()?.nativeElement;
      const anchor = this.preview.anchor();
      if (!popover || !anchor) {
        return;
      }
      const place = () => this.placePopover(popover, anchor);
      place();
      const area = anchor.closest('main');
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
      observer?.observe(popover);
      area?.addEventListener('scroll', place, { passive: true });
      window.addEventListener('resize', place);
      onCleanup(() => {
        observer?.disconnect();
        area?.removeEventListener('scroll', place);
        window.removeEventListener('resize', place);
      });
    });
  }

  protected isOn(card: PlanarCard): boolean {
    return !this.draft().has(card.id);
  }

  protected isPreviewing(card: PlanarCard): boolean {
    const preview = this.preview.preview();
    return preview?.mode === 'popover' && preview.id === card.id;
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

  /** Between the view area's top and the deck footer, never over the tile (FR-006). */
  private placePopover(popover: HTMLElement, anchor: HTMLElement): void {
    const grid = anchor.closest('.tiles')?.getBoundingClientRect();
    const tile = anchor.getBoundingClientRect();
    const footer = this.host.querySelector('.footer')?.getBoundingClientRect();
    const { top, left } = placePopover(
      tile,
      { width: popover.offsetWidth, height: popover.offsetHeight },
      {
        viewportWidth: document.documentElement.clientWidth,
        top: anchor.closest('main')?.getBoundingClientRect().top ?? 0,
        bottom: footer?.top ?? window.innerHeight,
        grid: grid ?? tile,
      },
    );
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  private edit(change: (draft: Set<string>) => void): void {
    const next = new Set(this.draft());
    change(next);
    this.draft.set(next);
    this.error.set(null);
  }
}
