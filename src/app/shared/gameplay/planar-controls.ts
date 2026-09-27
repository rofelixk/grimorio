import { Directive, ElementRef, afterRenderEffect, computed, input, output, viewChild } from '@angular/core';
import type { PlanechaseActions } from '@utils/planechase-game.util';
import { PLANECHASE, PlanarDisplay } from '@utils/planechase-copy';

export type PlanarConfirm = 'reset' | 'end' | null;

let nextId = 0;

// What the wide console and the phone dock share: the game's display lines, the enabled actions,
// the inline confirm (FR-013, US4-4) and one output per action. Each renders its own layout.
@Directive()
export abstract class PlanarControls {
  readonly display = input.required<PlanarDisplay>();
  readonly actions = input.required<PlanechaseActions>();
  readonly confirm = input<PlanarConfirm>(null);

  readonly roll = output<void>();
  readonly planeswalk = output<void>();
  readonly resetCost = output<void>();
  readonly undo = output<void>();
  readonly confirmPhenomenon = output<void>();
  readonly reshuffle = output<void>();
  readonly confirmAccept = output<void>();
  readonly confirmCancel = output<void>();

  protected readonly copy = PLANECHASE;
  protected readonly titleId = `grm-planar-confirm-title-${nextId}`;
  protected readonly bodyId = `grm-planar-confirm-body-${nextId++}`;
  protected readonly confirmCopy = computed(() => {
    const confirm = this.confirm();
    return confirm === 'reset' ? PLANECHASE.confirmReset : confirm === 'end' ? PLANECHASE.confirmEnd : null;
  });

  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancel');

  constructor() {
    // Cancelar takes focus when the confirm opens (ui.md §4).
    afterRenderEffect(() => this.cancelButton()?.nativeElement.focus());
  }

  /** The main button: roll, confirm the encounter, or (all used) reshuffle. */
  protected primary(): void {
    switch (this.display().mode) {
      case 'phenomenon':
        this.confirmPhenomenon.emit();
        return;
      case 'allUsed':
        this.reshuffle.emit();
        return;
      case 'normal':
        this.roll.emit();
    }
  }

  protected readonly primaryLabel = computed(() => {
    switch (this.display().mode) {
      case 'phenomenon':
        return PLANECHASE.confirmPhenomenon;
      case 'allUsed':
        return PLANECHASE.reshuffle;
      case 'normal':
        return PLANECHASE.roll;
    }
  });

  protected readonly primaryEnabled = computed(() => {
    const actions = this.actions();
    switch (this.display().mode) {
      case 'phenomenon':
        return actions.confirm;
      case 'allUsed':
        return actions.reshuffle;
      case 'normal':
        return actions.roll;
    }
  });
}
