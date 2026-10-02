// Pure rules of the card catalog search (spec 015). No path aliases and no Angular imports:
// scripts/sync-scryfall.ts imports `searchKey` by relative path.

import type { CatalogCard } from '../models/catalog.model';

export const MIN_SEARCH = 3;
export const PAGE_SIZE = 100;

/** Accent-free, lowercase, single-spaced key; the same one the sync writes to `cards.search_name`. */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escapes the LIKE wildcards so the key matches literally. */
export function escapeLike(key: string): string {
  return key.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type SearchStatus = 'idle' | 'short' | 'loading' | 'ok' | 'empty' | 'offline' | 'failed';

export interface SearchState {
  text: string;
  key: string;
  status: SearchStatus;
  results: CatalogCard[];
  hasMore: boolean;
  loadingMore: boolean;
  moreFailed: boolean;
  generation: number;
}

export const INITIAL_SEARCH: SearchState = {
  text: '',
  key: '',
  status: 'idle',
  results: [],
  hasMore: false,
  loadingMore: false,
  moreFailed: false,
  generation: 0,
};

/** The text changed (after the debounce). Starts a new generation only when a request will be sent. */
export function typed(state: SearchState, text: string): SearchState {
  const key = searchKey(text);
  const cleared = { ...state, text, key, results: [], hasMore: false, loadingMore: false, moreFailed: false };
  if (key.length === 0) return { ...cleared, status: 'idle' };
  if (key.length < MIN_SEARCH) return { ...cleared, status: 'short' };
  return { ...cleared, status: 'loading', generation: state.generation + 1 };
}

/** A page answered. Answers for an older generation are dropped. */
export function pageLoaded(
  state: SearchState,
  generation: number,
  cards: CatalogCard[],
  hasMore: boolean,
): SearchState {
  if (generation !== state.generation) return state;
  if (state.status === 'loading') {
    return {
      ...state,
      status: cards.length > 0 ? 'ok' : 'empty',
      results: cards,
      hasMore,
      moreFailed: false,
    };
  }
  if (state.status === 'ok' && state.loadingMore) {
    return { ...state, results: [...state.results, ...cards], hasMore, loadingMore: false };
  }
  return state;
}

/** A page failed. The first page shows the error plate; a next page keeps the results. */
export function pageFailed(
  state: SearchState,
  generation: number,
  kind: 'offline' | 'failed',
): SearchState {
  if (generation !== state.generation) return state;
  if (state.status === 'loading') return { ...state, status: kind };
  if (state.status === 'ok' && state.loadingMore) {
    return { ...state, loadingMore: false, moreFailed: true };
  }
  return state;
}

export function canLoadMore(state: SearchState): boolean {
  return state.status === 'ok' && state.hasMore && !state.loadingMore && !state.moreFailed;
}

/** The sentinel became visible, or "Tentar de novo" was pressed after a failed next page. */
export function moreRequested(state: SearchState): SearchState {
  if (state.status === 'ok' && state.hasMore && !state.loadingMore) {
    return { ...state, loadingMore: true, moreFailed: false };
  }
  return state;
}

/** "Tentar de novo" after a failed first page: the same text again, as a new generation. */
export function retried(state: SearchState): SearchState {
  if (state.status !== 'offline' && state.status !== 'failed') return state;
  return { ...state, status: 'loading', generation: state.generation + 1 };
}
