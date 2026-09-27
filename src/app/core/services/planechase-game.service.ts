import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import type { PlanechaseGame } from '@models/planechase-game.model';
import { RandomInt, randomInt } from '@utils/crypto-random.util';
import {
  PlanechaseActions,
  availableActions,
  confirmPhenomenon,
  planeswalk,
  repairGame,
  reshuffle,
  resetCost,
  roll,
  startGame,
  undo,
} from '@utils/planechase-game.util';
import { getDeviceDb } from '../db/device-db';
import { PlanechaseCatalogService } from './planechase-catalog.service';

/** The game's randomness (FR-008a); specs script it. */
export const PLANECHASE_RANDOM = new InjectionToken<RandomInt>('PLANECHASE_RANDOM', {
  providedIn: 'root',
  factory: () => randomInt,
});

/** The device `meta` key holding the game in progress (R5). */
const GAME_KEY = 'planechaseGame';

// The Planechase game in progress (FR-015): device-scoped, never tied to a profile and never
// synced, so profile switches and sign-outs don't touch it (FR-022). Every action applies a pure
// transition and persists the whole game, undo slot included, to the device DB.
@Injectable({ providedIn: 'root' })
export class PlanechaseGameService {
  private readonly catalog = inject(PlanechaseCatalogService);
  private readonly random = inject(PLANECHASE_RANDOM);

  private readonly gameSignal = signal<PlanechaseGame | null>(null);
  readonly game = this.gameSignal.asReadonly();
  readonly inProgress = computed(() => this.game() !== null);
  readonly actions = computed<PlanechaseActions | null>(() => {
    const game = this.game();
    return game ? availableActions(game) : null;
  });

  private readyPromise: Promise<void> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private repaired = false;
  private readonly kindOf = (id: string) => this.catalog.kindOf(id);

  /** Hydrates the saved game once; awaited by the app initializer. */
  whenReady(): Promise<void> {
    this.readyPromise ??= (async () => {
      const db = await getDeviceDb();
      const record = await db.get('meta', GAME_KEY);
      this.gameSignal.set((record?.value as PlanechaseGame | undefined) ?? null);
    })();
    return this.readyPromise;
  }

  /** Resolves once every write enqueued so far has landed. */
  flush(): Promise<void> {
    return this.writeQueue.then(() => undefined);
  }

  /** Starts a new game with these cards, replacing any game in progress (FR-007, FR-022). */
  start(enabledIds: string[]): void {
    this.commit(startGame(enabledIds, this.kindOf, this.random));
  }

  roll(): void {
    this.apply('roll', (game) => roll(game, this.kindOf, this.random));
  }

  planeswalk(): void {
    this.apply('planeswalk', (game) => planeswalk(game, this.kindOf));
  }

  confirmPhenomenon(): void {
    this.apply('confirm', (game) => confirmPhenomenon(game, this.kindOf));
  }

  resetCost(): void {
    this.apply('resetCost', (game) => resetCost(game));
  }

  reshuffle(): void {
    this.apply('reshuffle', (game) => reshuffle(game, this.kindOf, this.random));
  }

  undo(): void {
    this.apply('undo', (game) => undo(game));
  }

  end(): void {
    this.commit(null);
  }

  /** Drops cards a data update removed (R11); runs once, after the catalog first loads. */
  repairIfNeeded(): void {
    if (this.repaired) {
      return;
    }
    this.repaired = true;
    const game = this.game();
    if (!game) {
      return;
    }
    const known = new Set(this.catalog.cards().map((card) => card.id));
    const repaired = repairGame(game, known, this.kindOf);
    if (repaired !== game) {
      this.commit(repaired);
    }
  }

  private apply(action: keyof PlanechaseActions, transition: (game: PlanechaseGame) => PlanechaseGame): void {
    const game = this.game();
    if (game && availableActions(game)[action]) {
      this.commit(transition(game));
    }
  }

  private commit(game: PlanechaseGame | null): void {
    this.gameSignal.set(game);
    this.writeQueue = this.writeQueue
      .then(async () => {
        const db = await getDeviceDb();
        await (game ? db.put('meta', { key: GAME_KEY, value: game }) : db.delete('meta', GAME_KEY));
      })
      .catch((e) => console.error('Grimorio: failed to persist the Planechase game.', e));
  }
}
