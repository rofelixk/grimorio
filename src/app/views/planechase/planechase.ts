import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanarImageService } from '@services/planar-image.service';
import { PlanarSelectionService } from '@services/planar-selection.service';
import { PlanechaseCatalogService } from '@services/planechase-catalog.service';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { PLANECHASE, planarDisplay } from '@utils/planechase-copy';
import { abilityLit, tunnelReveal } from '@utils/planechase-game.util';
import { enabledCards, validateSelection } from '@utils/planar-selection.util';
import { MOBILE_QUERY, mediaQuerySignal } from '@shared/ds/media-query';
import { ChaosFlair } from '@shared/gameplay/flairs/chaos-flair';
import { PlaneswalkFlair } from '@shared/gameplay/flairs/planeswalk-flair';
import { PlanarCard } from '@shared/gameplay/planar-card/planar-card';
import { PlanarConsole } from '@shared/gameplay/planar-console/planar-console';
import { PlanarConfirm } from '@shared/gameplay/planar-controls';
import { PlanarDock } from '@shared/gameplay/planar-dock/planar-dock';
import { TunnelChoice } from '@shared/gameplay/tunnel-choice/tunnel-choice';
import type { PlanarCard as PlanarCardData } from '../../core/data/planechase/planar-card.model';

// Planechase (FR-001–FR-015): the no-game intro, or the game — the console above the card on wide
// screens, the card above the sticky dock on phones. Nothing here shows how many cards are used or
// left (FR-012). Flairs play from the handlers, never from an effect, so a reload or an undo
// never replays one (R15).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planechase',
  imports: [RouterLink, PlanarCard, PlanarConsole, PlanarDock, TunnelChoice],
  templateUrl: './planechase.html',
  styleUrl: './planechase.scss',
})
export class Planechase {
  private readonly catalog = inject(PlanechaseCatalogService);
  private readonly selection = inject(PlanarSelectionService);
  private readonly images = inject(PlanarImageService);
  private readonly injector = inject(Injector);
  protected readonly service = inject(PlanechaseGameService);

  protected readonly copy = PLANECHASE;
  protected readonly mobile = mediaQuerySignal(MOBILE_QUERY);
  protected readonly game = this.service.game;
  protected readonly current = computed(() => {
    const game = this.game();
    return game ? this.catalog.byId(game.current) ?? null : null;
  });
  /** The planes Interplanar Tunnel revealed while it waits, else `null`. */
  protected readonly tunnelPlanes = computed(() => {
    const game = this.game();
    const revealed = game ? tunnelReveal(game, this.catalog.kindOf) : null;
    return revealed
      ? revealed
          .map((id) => this.catalog.byId(id))
          .filter((card): card is PlanarCardData => card !== undefined && card.kind === 'plane')
      : null;
  });
  /** The table's pick among them; a new reveal (or none) clears it. */
  protected readonly tunnelChoice = linkedSignal({
    source: this.tunnelPlanes,
    computation: (): string | null => null,
  });
  /** "Concluir encontro" waits for the tunnel's pick. */
  protected readonly actions = computed(() => {
    const actions = this.service.actions();
    return actions && this.tunnelPlanes() && !this.tunnelChoice() ? { ...actions, confirm: false } : actions;
  });
  protected readonly display = computed(() => {
    const game = this.game();
    const card = this.current();
    if (!game) {
      return null;
    }
    const noChaos = card?.kind === 'plane' && card.ability === null;
    return planarDisplay(game, (id) => this.catalog.byId(id)?.name ?? id, noChaos, this.tunnelPlanes() !== null);
  });
  protected readonly lit = computed(() => {
    const game = this.game();
    return !!game && abilityLit(game);
  });

  private readonly enabled = computed(() => enabledCards(this.catalog.cards(), this.selection.selection()));
  protected readonly enabledCount = computed(() => this.enabled().length);
  /** Why "Iniciar partida" refused the saved selection (FR-007), until the next try. */
  protected readonly refusal = signal<string | null>(null);

  protected readonly confirm = signal<PlanarConfirm>(null);
  private confirmOpener: HTMLElement | null = null;

  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly card = viewChild(PlanarCard);
  private readonly cardElement = viewChild(PlanarCard, { read: ElementRef });
  /** The view is the flairs' stage (planechase.scss): they paint over its UI, under the card image. */
  private readonly stage = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly walkFlair = new PlaneswalkFlair();
  private readonly chaosFlair = new ChaosFlair();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopFlairs());
    this.focusHeading();
    // The next card's image loads ahead, so a planeswalk shows it at once, offline included.
    effect(() => {
      const next = this.game()?.drawOrder[0];
      const card = next ? this.catalog.byId(next) : undefined;
      if (card) {
        void this.images.url(card.images.large);
      }
    });
  }

  protected start(): void {
    const enabled = this.enabled();
    const check = validateSelection(enabled);
    if (!check.ok) {
      this.refusal.set(check.error === 'tooFew' ? PLANECHASE.refusedTooFew(check.count) : PLANECHASE.refusedNoPlane);
      return;
    }
    this.refusal.set(null);
    this.service.start(enabled.map((card) => card.id));
    this.focusHeading();
  }

  protected roll(): void {
    this.withFlairs(() => this.service.roll());
  }

  protected planeswalk(): void {
    this.withFlairs(() => this.service.planeswalk());
  }

  /** "Caos" for a physical die: the plate lights and the chaos flair plays, as on a rolled Caos. */
  protected chaos(): void {
    this.withFlairs(() => this.service.chaos());
  }

  protected confirmPhenomenon(): void {
    const choice = this.tunnelChoice();
    if (this.tunnelPlanes() && !choice) {
      return;
    }
    this.withFlairs(() => (choice ? this.service.resolveTunnel(choice) : this.service.confirmPhenomenon()));
  }

  /** The all-used prompt is its own confirmation: "Reiniciar planos" completes the planeswalk. */
  protected reshuffle(): void {
    this.withFlairs(() => this.service.reshuffle());
  }

  protected resetCost(): void {
    this.stopFlairs();
    this.service.resetCost();
  }

  protected undo(): void {
    this.stopFlairs();
    this.service.undo();
  }

  protected askReset(event: Event): void {
    if (this.game()?.pending === 'reset') {
      this.reshuffle();
      return;
    }
    this.openConfirm('reset', event);
  }

  protected askEnd(event: Event): void {
    this.openConfirm('end', event);
  }

  protected acceptConfirm(): void {
    const confirm = this.confirm();
    this.confirm.set(null);
    this.confirmOpener = null;
    this.stopFlairs();
    if (confirm === 'reset') {
      this.service.reshuffle();
    } else if (confirm === 'end') {
      this.service.end();
      this.focusHeading();
    }
  }

  protected cancelConfirm(): void {
    this.confirm.set(null);
    const opener = this.confirmOpener;
    this.confirmOpener = null;
    afterNextRender(() => opener?.focus(), { injector: this.injector });
  }

  private openConfirm(confirm: PlanarConfirm, event: Event): void {
    this.confirmOpener = event.currentTarget as HTMLElement;
    this.confirm.set(confirm);
  }

  /** Runs a game action with its flair: a light front when the card changed, a shockwave on Caos. */
  private withFlairs(action: () => void): void {
    this.stopFlairs();
    const before = this.game();
    const host = this.cardElement()?.nativeElement as HTMLElement | undefined;
    const playWalk = host ? this.walkFlair.capture(host, this.stage) : null;
    action();
    const after = this.game();
    if (!before || !after || after === before) {
      return;
    }
    if (after.current !== before.current) {
      void playWalk?.();
    } else if (after.result.kind === 'chaos') {
      const card = this.card();
      if (card) {
        void this.chaosFlair.play(card.imageFrame(), this.stage);
      }
    }
  }

  private stopFlairs(): void {
    this.walkFlair.stop();
    this.chaosFlair.stop();
  }

  private focusHeading(): void {
    afterNextRender(() => this.heading()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    });
  }
}
