import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { RULES, RULES_SECTIONS } from '@utils/planechase-copy';

// "Como jogar" (FR-016): the shared-deck rules in PT-BR, reachable with or without a game. It only
// reads whether a game is in progress, never changes it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planechase-rules',
  imports: [RouterLink],
  templateUrl: './planechase-rules.html',
  styleUrl: './planechase-rules.scss',
})
export class PlanechaseRules {
  protected readonly inProgress = inject(PlanechaseGameService).inProgress;
  protected readonly copy = RULES;
  protected readonly sections = RULES_SECTIONS;

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus({ preventScroll: true }));
  }

  /** In-page anchors scroll the view area without touching the route. */
  protected jump(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }
}
