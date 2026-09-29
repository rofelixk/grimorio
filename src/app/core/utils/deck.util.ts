// Deck name rules (spec 009, research R4). Unlike collections, duplicate names are compared
// ignoring accents as well as case and surrounding spaces ("Krenko" = "krênko").

import { MAX_NAME } from '@models/collection.model';
import type { Deck, DeckNameError } from '@models/deck.model';
import { suffixedName } from './collection-tree.util';

export function normalizeDeckName(name: string): string {
  return name.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

/** PT-BR alphabetical order ignoring case and accents, ties broken by id (FR-004). */
export function compareDeckNames(a: Deck, b: Deck): number {
  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Renames duplicate names left by a sync (research R6, FR-012). In each group sharing a
 * `normalizeDeckName`, the single member already on the remote keeps its name (ties, or none, go
 * to the lowest id); every other member, in id order, takes the lowest free `"{base} (k)"` from
 * k = 2, stamped `now` so the rename is carried on the next sync.
 */
export function repairDeckNames(
  merged: Deck[],
  remoteIds: ReadonlySet<string>,
  now: string,
): { decks: Deck[]; renamed: Deck[] } {
  const used = new Set(merged.map((deck) => normalizeDeckName(deck.name)));
  const groups = new Map<string, Deck[]>();
  for (const deck of merged) {
    const key = normalizeDeckName(deck.name);
    const group = groups.get(key);
    if (group) group.push(deck);
    else groups.set(key, [deck]);
  }

  const renamedById = new Map<string, Deck>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const byId = [...group].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const remoteMembers = group.filter((deck) => remoteIds.has(deck.id));
    const survivor = remoteMembers.length === 1 ? remoteMembers[0] : byId[0];
    for (const other of byId) {
      if (other === survivor) continue;
      let k = 2;
      let candidate = suffixedName(other.name, k);
      while (used.has(normalizeDeckName(candidate))) {
        candidate = suffixedName(other.name, ++k);
      }
      used.add(normalizeDeckName(candidate));
      renamedById.set(other.id, { ...other, name: candidate, updatedAt: now });
    }
  }

  return {
    decks: merged.map((deck) => renamedById.get(deck.id) ?? deck),
    renamed: [...renamedById.values()],
  };
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
