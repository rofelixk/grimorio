import { SHELL } from '@utils/entry-copy';

export interface NavDestination {
  label: string;
  path: string;
}

/** The shell's destinations (FR-011). There is no Home entry: the wordmark is Home. */
export const NAV_DESTINATIONS: readonly NavDestination[] = [{ label: SHELL.collection, path: '/collection' }];
