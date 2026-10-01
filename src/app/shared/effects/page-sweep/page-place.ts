import { Directive, TemplateRef, inject } from '@angular/core';

export interface PagePlaceContext {
  /** The place to render. */
  $implicit: unknown;
  /** Whether this is the outgoing page, so the area reads that slot's retained data. */
  leaving: boolean;
}

/**
 * Marks the one page template an area projects into `<app-page-sweep>`; the sweep stamps it for
 * the shown place and, while a sweep runs, for the leaving one.
 */
@Directive({ selector: 'ng-template[appPagePlace]' })
export class PagePlace {
  readonly template = inject<TemplateRef<PagePlaceContext>>(TemplateRef);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the guard needs its parameters
  static ngTemplateContextGuard(dir: PagePlace, ctx: unknown): ctx is PagePlaceContext {
    return true;
  }
}
