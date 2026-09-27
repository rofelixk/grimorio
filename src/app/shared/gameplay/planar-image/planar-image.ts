import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { PlanarImageService } from '@services/planar-image.service';
import { PLANAR_CARD } from '@utils/planechase-copy';

// A card image frame (DESIGN.md "Card image frame"): the image once loaded through the on-device
// cache, the card name while it loads, and "Imagem indisponível sem conexão" once it can't load
// (FR-006). A lazy image starts loading only when it's about to scroll into view (R12).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-planar-image',
  templateUrl: './planar-image.html',
  styleUrl: './planar-image.scss',
})
export class PlanarImage {
  readonly address = input.required<string>();
  readonly name = input.required<string>();
  readonly lazy = input(false);

  private readonly images = inject(PlanarImageService);
  protected readonly copy = PLANAR_CARD;
  /** `undefined` while loading, `null` once it can't load. */
  protected readonly src = linkedSignal<string, string | null | undefined>({
    source: this.address,
    computation: () => undefined,
  });
  private readonly visible = signal(false);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.lazy() || typeof IntersectionObserver === 'undefined') {
        this.visible.set(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.visible.set(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' },
      );
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });

    effect((onCleanup) => {
      const address = this.address();
      if (!this.visible()) {
        return;
      }
      let current = true;
      onCleanup(() => (current = false));
      void this.images.url(address).then((url) => {
        if (current) {
          this.src.set(url);
        }
      });
    });
  }
}
