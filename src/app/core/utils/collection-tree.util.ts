// Pure helpers for the collection tree (spec 008): naming/validation, sorting, subtree
// traversal and the derived per-collection stats. No storage, no Angular — see
// specs/008-collections-foundation/contracts/services.md.

import type { CardEntry } from '@models/card.model';
import {
  COLLECTION_COLORS,
  MAX_NAME,
  type Collection,
  type CollectionColorHex,
  type CollectionStats,
  type CollectionTotals,
  type NameError,
} from '@models/collection.model';

/** Trims and lowercases with PT-BR collation, for name-equality checks. */
export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

/** PT-BR, case/accent-insensitive name order; ties break on id for a stable sort. */
export function compareByName(a: Collection, b: Collection): number {
  return (
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/** Validates a candidate name against its siblings (`selfId` exempts itself on rename). */
export function validateCollectionName(
  name: string,
  siblings: Collection[],
  selfId?: string,
): NameError | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'empty';
  if (trimmed.length > MAX_NAME) return 'too-long';

  const normalized = normalizeName(trimmed);
  const taken = siblings.some(
    (sibling) => sibling.id !== selfId && normalizeName(sibling.name) === normalized,
  );
  return taken ? 'taken' : null;
}

/** The first palette color no sibling uses, else the first palette color (Branco). */
export function defaultColor(siblings: Collection[]): CollectionColorHex {
  const used = new Set<string>(siblings.map((sibling) => sibling.color));
  const unused = COLLECTION_COLORS.find((color) => !used.has(color.hex));
  return (unused ?? COLLECTION_COLORS[0]).hex;
}

/** Groups collections by `parentId`, each list sorted with {@link compareByName}. */
export function buildChildrenOf(collections: Collection[]): Map<string | null, Collection[]> {
  const childrenOf = new Map<string | null, Collection[]>();
  for (const collection of collections) {
    const siblings = childrenOf.get(collection.parentId);
    if (siblings) {
      siblings.push(collection);
    } else {
      childrenOf.set(collection.parentId, [collection]);
    }
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort(compareByName);
  }
  return childrenOf;
}

/** `id` plus every descendant id, depth-first over `childrenOf`. */
export function subtreeIds(id: string, childrenOf: Map<string | null, Collection[]>): string[] {
  const ids: string[] = [id];
  for (const child of childrenOf.get(id) ?? []) {
    ids.push(...subtreeIds(child.id, childrenOf));
  }
  return ids;
}

/** Descends through each first child (alphabetical) until a collection with none; `id` itself when it has none. */
export function firstLeaf(id: string, childrenOf: Map<string | null, Collection[]>): string {
  let current = id;
  for (let first = childrenOf.get(current)?.[0]; first; first = childrenOf.get(current)?.[0]) {
    current = first.id;
  }
  return current;
}

/** 1 + the number of ancestors of `id`, or 0 when `id` isn't in `byId`. */
export function depthOf(id: string, byId: Map<string, Collection>): number {
  let current = byId.get(id);
  if (!current) return 0;

  let depth = 1;
  while (current.parentId !== null) {
    const parent: Collection | undefined = byId.get(current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

/**
 * One linear pass over `cards` (research R3): direct totals per collection roll up to every
 * ancestor (cards/sale quantities), `directEntries` stays own-collection-only (used for `kind`),
 * and `subs` counts all descendants regardless of card counts. Cards with an unknown
 * `locationId` go to `holding`.
 */
export function computeStats(
  collections: Collection[],
  cards: Pick<CardEntry, 'locationId' | 'quantity' | 'forSale'>[],
  deckIds: ReadonlySet<string> = new Set(),
): CollectionStats {
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const childrenOf = buildChildrenOf(collections);

  const byIdTotals = new Map<string, CollectionTotals>();
  for (const collection of collections) {
    byIdTotals.set(collection.id, { cards: 0, sale: 0, subs: 0, directEntries: 0 });
  }

  const holding = { cards: 0, sale: 0 };

  for (const entry of cards) {
    // A card in a deck is neither in a collection nor in the holding box (spec 009, research R1).
    if (deckIds.has(entry.locationId)) continue;
    const target = byId.get(entry.locationId);
    if (!target) {
      holding.cards += entry.quantity;
      if (entry.forSale) holding.sale += entry.quantity;
      continue;
    }

    byIdTotals.get(entry.locationId)!.directEntries += 1;

    let current: Collection | undefined = target;
    while (current) {
      const totals = byIdTotals.get(current.id)!;
      totals.cards += entry.quantity;
      if (entry.forSale) totals.sale += entry.quantity;
      current = current.parentId !== null ? byId.get(current.parentId) : undefined;
    }
  }

  for (const collection of collections) {
    byIdTotals.get(collection.id)!.subs = subtreeIds(collection.id, childrenOf).length - 1;
  }

  return { byId: byIdTotals, holding };
}

/** `"{base} (n)"`, `base` trimmed then cut so the result stays at most `MAX_NAME` characters. */
export function suffixedName(base: string, n: number): string {
  const trimmed = base.trim();
  const suffix = ` (${n})`;
  const maxBaseLength = Math.max(0, MAX_NAME - suffix.length);
  const cutBase = trimmed.length > maxBaseLength ? trimmed.slice(0, maxBaseLength) : trimmed;
  return `${cutBase}${suffix}`;
}

function byIdAscending(a: Collection, b: Collection): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Repairs a just-reconciled tree (research R6), run before upload so the cloud never keeps an
 * orphan or a duplicate sibling name this device can see:
 * 1. Orphans: repeatedly drops any collection whose `parentId` isn't null and isn't in the
 *    remaining set, until stable (at most 2 rounds at depth 3).
 * 2. Duplicate sibling names: groups the survivors by `(parentId, normalizeName(name))`. In each
 *    group of 2+, the member already on the remote survives unchanged (ties, or none, go to the
 *    lowest id); every other member is renamed to the lowest free `"{base} (k)"`, `k` starting at
 *    2, stamped with `now`.
 */
export function repairCollectionTree(
  merged: Collection[],
  remoteIds: ReadonlySet<string>,
  now: string,
): { collections: Collection[]; removedIds: string[]; renamed: Collection[] } {
  let collections = merged;
  const removedIds: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    const ids = new Set(collections.map((collection) => collection.id));
    const survivors: Collection[] = [];
    for (const collection of collections) {
      if (collection.parentId !== null && !ids.has(collection.parentId)) {
        removedIds.push(collection.id);
        changed = true;
      } else {
        survivors.push(collection);
      }
    }
    collections = survivors;
  }

  const usedNamesByParent = new Map<string | null, Set<string>>();
  const groups = new Map<string, Collection[]>();
  for (const collection of collections) {
    const normalized = normalizeName(collection.name);
    const usedNames = usedNamesByParent.get(collection.parentId);
    if (usedNames) usedNames.add(normalized);
    else usedNamesByParent.set(collection.parentId, new Set([normalized]));

    const key = `${collection.parentId ?? ''}\u0000${normalized}`;
    const group = groups.get(key);
    if (group) group.push(collection);
    else groups.set(key, [collection]);
  }

  const renamed: Collection[] = [];
  const renamedById = new Map<string, Collection>();

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const remoteMembers = group.filter((collection) => remoteIds.has(collection.id));
    const survivor =
      remoteMembers.length === 1
        ? remoteMembers[0]
        : [...group].sort(byIdAscending)[0];

    const usedNames = usedNamesByParent.get(survivor.parentId)!;
    const others = group.filter((collection) => collection.id !== survivor.id).sort(byIdAscending);
    for (const other of others) {
      const base = other.name.trim();
      let k = 2;
      let candidate = suffixedName(base, k);
      while (usedNames.has(normalizeName(candidate))) {
        k += 1;
        candidate = suffixedName(base, k);
      }
      usedNames.add(normalizeName(candidate));
      const updated: Collection = { ...other, name: candidate, updatedAt: now };
      renamed.push(updated);
      renamedById.set(other.id, updated);
    }
  }

  const result = collections.map((collection) => renamedById.get(collection.id) ?? collection);
  return { collections: result, removedIds, renamed };
}
