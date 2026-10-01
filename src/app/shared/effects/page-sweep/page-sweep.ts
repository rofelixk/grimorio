import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  contentChild,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FRONT_BAND } from '@utils/sweep-dust.util';
import type { PageChange, SweepRun } from './page-change';
import { PagePlace } from './page-place';
import { SweepLoop } from './sweep-loop';

/**
 * The page sweep (DESIGN.md Motion "Page sweep"): renders an area's page change. The area
 * projects one `<ng-template [appPagePlace]="pages">`, stamped for the shown place and, while a sweep runs, for
 * the leaving one inside the `.sweep` layer, which dissolves behind the dust's front. It owns the
 * dust canvas, the layer's scroll offset, the band width, blocking input while a sweep runs, and
 * focusing the new page's `h1` once a change ends.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-page-sweep',
  imports: [NgTemplateOutlet],
  providers: [SweepLoop],
  templateUrl: './page-sweep.html',
  styleUrl: './page-sweep.scss',
  host: {
    '[attr.inert]': "change().run() ? '' : null",
  },
})
export class PageSweep {
  readonly change = input.required<PageChange<unknown>>();

  private readonly loop = inject(SweepLoop);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly place = contentChild.required(PagePlace);
  private readonly layer = viewChild<ElementRef<HTMLElement>>('layer');
  private readonly dust = viewChild<ElementRef<HTMLCanvasElement>>('dust');

  protected readonly band = FRONT_BAND;
  /**
   * The `<main>` scroll captured when a sweep starts, so the outgoing page (offset by it) leaves
   * from where the person was while the incoming one starts at the top.
   */
  protected readonly offset = signal(0);

  constructor() {
    // The canvas comes and goes with reduced motion; the loop draws on whichever is present.
    effect(() => this.loop.attach(this.dust()?.nativeElement ?? null, this.host));

    let current: SweepRun | null = null;
    effect(() => {
      const run = this.change().run();
      untracked(() => {
        if (run === current) return;
        current = run;
        if (run) this.start(run);
        else this.loop.settle();
      });
    });

    // Focus the new page's h1 after each swap or sweep (not the first place), so it's announced.
    let first = true;
    effect(() => {
      this.change().shown();
      if (this.change().run()) return;
      if (first) {
        first = false;
        return;
      }
      afterNextRender(() => this.host.querySelector<HTMLElement>('h1')?.focus(), { injector: this.injector });
    });
  }

  private start(run: SweepRun): void {
    const main = this.host.closest('main');
    if (main) {
      this.offset.set(main.scrollTop);
      main.scrollTop = 0;
    }
    this.loop.start(
      run.dir,
      () => this.layer()?.nativeElement ?? null,
      () => this.change().end(run),
    );
  }
}
