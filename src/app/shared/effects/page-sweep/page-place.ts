import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { PageChange } from './page-change';

export interface PagePlaceContext<P> {
  /** The place to render. */
  $implicit: P;
  /** Whether this is the outgoing page, so the area reads that slot's retained data. */
  leaving: boolean;
}

/**
 * Marks the one page template an area projects into `<app-page-sweep>`; the sweep stamps it for
 * the shown place and, while a sweep runs, for the leaving one. Bind the area's page change
 * (`[appPagePlace]="pages"`) to type the template's place.
 */
@Directive({ selector: 'ng-template[appPagePlace]' })
export class PagePlace<P = unknown> {
  readonly appPagePlace = input<PageChange<P>>();
  readonly template = inject<TemplateRef<PagePlaceContext<P>>>(TemplateRef);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the guard needs its parameters
  static ngTemplateContextGuard<P>(dir: PagePlace<P>, ctx: unknown): ctx is PagePlaceContext<P> {
    return true;
  }
}
