// Deck name rules (spec 009, research R4). Unlike collections, duplicate names are compared
// ignoring accents as well as case and surrounding spaces ("Krenko" = "krênko").

import { MAX_NAME } from '@models/collection.model';
import type { Deck, DeckNameError } from '@models/deck.model';

export function normalizeDeckName(name: string): string {
  return name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

/** PT-BR alphabetical order ignoring case and accents, ties broken by id (FR-004). */
export function compareDeckNames(a: Deck, b: Deck): number {
  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** The first rule the trimmed name breaks, or `null`. `selfId` is excluded from the duplicate check. */
export function validateDeckName(name: string, decks: readonly Deck[], selfId?: string): DeckNameError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.length > MAX_NAME) return 'too-long';
  const normalized = normalizeDeckName(trimmed);
  if (decks.some((deck) => deck.id !== selfId && normalizeDeckName(deck.name) === normalized)) return 'taken';
  return null;
}
