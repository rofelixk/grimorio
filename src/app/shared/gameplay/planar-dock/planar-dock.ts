import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { PlanarControls } from '@shared/gameplay/planar-controls';

/** The height a fixed bottom bar covers; the view area pads its end by it (app.scss). */
const BOTTOM_BAR_VAR = '--bottom-bar-height';

// The phone dock (DESIGN.md "Phone dock", R16): the console's controls, fixed to the bottom of the
// screen, outside the page flow, so the result and the actions stay on screen without scrolling
// (FR-012a). While mounted it publishes its height, so the view area can scroll its last content
// (the legal notice) clear of it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-dock',
  templateUrl: './planar-dock.html',
  styleUrl: './planar-dock.scss',
})
export class PlanarDock extends PlanarControls {
  constructor() {
    super();
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const root = document.documentElement.style;
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => root.removeProperty(BOTTOM_BAR_VAR));
    afterNextRender(() => {
      const publish = () => root.setProperty(BOTTOM_BAR_VAR, `${host.offsetHeight}px`);
      publish();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(publish);
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
