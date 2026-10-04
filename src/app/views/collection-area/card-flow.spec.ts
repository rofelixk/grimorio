import { TestBed } from '@angular/core/testing';
import type { CardEntry } from '@models/card.model';
import type { CatalogCard } from '@models/catalog.model';
import type { Collection } from '@models/collection.model';
import { CardService } from '@services/card.service';
import { CollectionService } from '@services/collection.service';
import { SyncService } from '@services/sync.service';
import { ToastService } from '@services/toast.service';
import { mockCardEntryWithoutId } from '@testing/card.mocks';
import type { CardDraft } from '@shared/cards/card-modal/card-modal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardFlow } from './card-flow';

const picked: CatalogCard = {
  oracleId: 'o1',
  name: 'Sol Ring',
  typeLine: 'Artifact',
  colorIdentity: [],
  imageUrl: null,
};

function draft(over: Partial<CardDraft> = {}): CardDraft {
  const { id: _id, ...entry } = { id: '', ...mockCardEntryWithoutId({ name: 'Sol Ring', quantity: 2 }) };
  void _id;
  const { locationId: _l, addedAt: _a, updatedAt: _u, ...rest } = entry as Record<string, unknown>;
  void _l;
  void _a;
  void _u;
  return { ...(rest as unknown as CardDraft), canBeCommander: false, ...over };
}

describe('CardFlow', () => {
  let flow: CardFlow;
  let cards: CardService;
  let collections: CollectionService;
  let toasts: ToastService;
  let sync: SyncService;

  function make(name: string, parentId: string | null = null): Collection {
    const result = collections.create({ parentId, name, color: '#d8cdb0' });
    if (!result.ok) throw new Error(result.error);
    return result.collection;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [CardFlow] });
    flow = TestBed.inject(CardFlow);
    cards = TestBed.inject(CardService);
    collections = TestBed.inject(CollectionService);
    toasts = TestBed.inject(ToastService);
    sync = TestBed.inject(SyncService);
    await cards.load('p1');
    await collections.load('p1');
  });

  afterEach(async () => {
    await collections.flush();
    await cards.flush();
    TestBed.resetTestingModule();
  });

  function toBeDraftingIn(collectionId: string) {
    flow.openSearch(collectionId);
    flow.pick(picked);
  }

  it('starts idle and walks search → add', () => {
    const a = make('Fichário');
    expect(flow.step()).toEqual({ kind: 'idle' });
    flow.openSearch(a.id);
    expect(flow.step()).toEqual({ kind: 'search', collectionId: a.id });
    flow.pick(picked);
    expect(flow.step()).toEqual({ kind: 'add', collectionId: a.id, card: picked });
  });

  it('closing the search returns to idle', () => {
    const a = make('Fichário');
    flow.openSearch(a.id);
    flow.close();
    expect(flow.step()).toEqual({ kind: 'idle' });
  });

  it('cancelling the card modal goes back to the search and writes nothing', () => {
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    flow.cancel();
    expect(flow.step()).toEqual({ kind: 'search', collectionId: a.id });
    expect(cards.cards()).toEqual([]);
  });

  it('save adds the card to the collection, toasts and closes both modals', () => {
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    flow.save(draft(), false);

    expect(cards.cards().length).toBe(1);
    expect(cards.cards()[0]).toMatchObject({ name: 'Sol Ring', quantity: 2, locationId: a.id });
    expect(toasts.toast()).toMatchObject({ label: 'Carta adicionada', text: 'Sol Ring ×2 em “Fichário”.' });
    expect(flow.step()).toEqual({ kind: 'idle' });
  });

  it('save and add another keeps the search open on the same collection', () => {
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    flow.save(draft(), true);

    expect(cards.cards().length).toBe(1);
    expect(toasts.toast()?.label).toBe('Carta adicionada');
    expect(flow.step()).toEqual({ kind: 'search', collectionId: a.id });
  });

  it('writes to the first leaf and shows the moved notice when subcollections appeared', () => {
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    make('Beta', a.id);
    const alpha = make('Alfa', a.id);
    flow.save(draft(), false);

    expect(cards.cards()[0].locationId).toBe(alpha.id);
    const step = flow.step();
    expect(step.kind).toBe('moved');
    if (step.kind === 'moved') {
      expect(step.from.id).toBe(a.id);
      expect(step.to.id).toBe(alpha.id);
      expect(step.card.id).toBe(cards.cards()[0].id);
    }

    flow.dismissMoved();
    expect(flow.step()).toEqual({ kind: 'idle' });
  });

  it('after the moved notice, save-and-add-another continues in the search of the opened collection', () => {
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    make('Alfa', a.id);
    flow.save(draft(), true);
    expect(flow.step().kind).toBe('moved');

    flow.dismissMoved();
    expect(flow.step()).toEqual({ kind: 'search', collectionId: a.id });
  });

  it('closes everything and saves nothing when the collection is deleted mid-flow', async () => {
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    await collections.remove(a.id, 'delete');
    TestBed.tick();

    expect(flow.step()).toEqual({ kind: 'idle' });
    expect(cards.cards()).toEqual([]);
    expect(toasts.toast()).toMatchObject({
      label: 'Nada foi salvo',
      text: 'A coleção “Fichário” não existe mais. Você voltou para as coleções.',
    });
    // A late save from the card modal does nothing.
    flow.save(draft(), false);
    expect(cards.cards()).toEqual([]);
  });

  describe('duplicates', () => {
    function own(locationId: string, quantity = 3) {
      const { canBeCommander, ...rest } = draft({ quantity });
      return cards.add({ ...rest, canBeCommander: canBeCommander ?? false, locationId });
    }

    function duplicateStep() {
      const step = flow.step();
      if (step.kind !== 'duplicate') throw new Error(`expected duplicate, got ${step.kind}`);
      return step;
    }

    it('opens the notice with nothing saved when the card matches an owned row', () => {
      const a = make('Fichário');
      const existing = own(a.id);
      toBeDraftingIn(a.id);
      flow.save(draft(), false);

      const step = duplicateStep();
      expect(step.matches.map((m) => m.card.id)).toEqual([existing.id]);
      expect(step.destination.id).toBe(a.id);
      expect(cards.cards().length).toBe(1);
    });

    it('merge grows the existing row and adds none', () => {
      const a = make('Fichário');
      const existing = own(a.id);
      toBeDraftingIn(a.id);
      flow.save(draft(), false);
      flow.decide('merge', duplicateStep().matches[0]);

      expect(cards.cards().length).toBe(1);
      expect(cards.cards()[0]).toMatchObject({ id: existing.id, quantity: 5, addedAt: existing.addedAt });
      expect(toasts.toast()).toMatchObject({ label: 'Carta adicionada', text: 'Sol Ring ×2 em “Fichário”.' });
      expect(flow.step()).toEqual({ kind: 'idle' });
    });

    it('separate adds a second row; with save-again the search stays open', () => {
      const a = make('Fichário');
      own(a.id);
      toBeDraftingIn(a.id);
      flow.save(draft(), true);
      flow.decide('separate', duplicateStep().matches[0]);

      expect(cards.cards().length).toBe(2);
      expect(cards.cards().every((c) => c.locationId === a.id)).toBe(true);
      expect(flow.step()).toEqual({ kind: 'search', collectionId: a.id });
    });

    it('cancel goes back to the card modal and saves nothing', () => {
      const a = make('Fichário');
      own(a.id);
      toBeDraftingIn(a.id);
      flow.save(draft(), false);
      flow.cancel();

      expect(flow.step()).toEqual({ kind: 'add', collectionId: a.id, card: picked });
      expect(cards.cards().length).toBe(1);
    });

    it('a match outside collections (a deck, the holding box) saves without a notice', () => {
      const a = make('Fichário');
      own('deck-1');
      toBeDraftingIn(a.id);
      flow.save(draft(), false);

      expect(flow.step()).toEqual({ kind: 'idle' });
      expect(cards.cards().length).toBe(2);
    });

    it('a card saved twice in a row warns the second time', () => {
      const a = make('Fichário');
      toBeDraftingIn(a.id);
      flow.save(draft(), true);
      flow.pick(picked);
      flow.save(draft(), true);
      expect(duplicateStep().matches.length).toBe(1);
    });

    it('with matches in two collections, the destination comes first and merge grows only the chosen row', () => {
      const a = make('Fichário');
      const b = make('Arquivo');
      const inB = own(b.id, 7);
      const inA = own(a.id, 3);
      toBeDraftingIn(a.id);
      flow.save(draft(), false);

      const step = duplicateStep();
      expect(step.matches.map((m) => m.card.id)).toEqual([inA.id, inB.id]);
      flow.decide('merge', step.matches[1]);

      const byId = new Map(cards.cards().map((c) => [c.id, c.quantity]));
      expect(byId.get(inA.id)).toBe(3);
      expect(byId.get(inB.id)).toBe(9);
      expect(toasts.toast()?.text).toBe('Sol Ring ×2 em “Arquivo”.');
    });

    it('closes the notice when the collection is deleted meanwhile', async () => {
      const a = make('Fichário');
      own(a.id);
      toBeDraftingIn(a.id);
      flow.save(draft(), false);
      await collections.remove(a.id, 'delete');
      TestBed.tick();

      expect(flow.step()).toEqual({ kind: 'idle' });
      expect(toasts.toast()?.label).toBe('Nada foi salvo');
    });
  });

  describe('edit', () => {
    function own(locationId: string, over: Partial<CardDraft> = {}) {
      const { canBeCommander, ...rest } = draft(over);
      return cards.add({ ...rest, canBeCommander: canBeCommander ?? false, locationId });
    }

    /** What the edit modal emits: the card's fields with the changes, no canBeCommander. */
    function editDraft(card: CardEntry, over: Partial<CardDraft> = {}): CardDraft {
      const { id: _i, locationId: _l, addedAt: _a, updatedAt: _u, canBeCommander: _c, ...rest } = card;
      void [_i, _l, _a, _u, _c];
      return { ...rest, ...over };
    }

    it('opens the edit step on the card where it is', () => {
      const a = make('Fichário');
      const card = own(a.id);
      flow.openEdit(card.id);
      expect(flow.step()).toEqual({ kind: 'edit', collectionId: a.id, cardId: card.id });
      expect(flow.editedCard()).toEqual(card);
    });

    it('a plain edit updates in place, keeps addedAt and the order, and toasts', async () => {
      const a = make('Fichário');
      const first = own(a.id, { scryfallId: 's-first' });
      await new Promise((r) => setTimeout(r, 2));
      const card = own(a.id);
      await new Promise((r) => setTimeout(r, 2));
      flow.openEdit(card.id);
      flow.save(editDraft(card, { condition: 'HP', quantity: 4, forSale: true, notes: 'troca' }), false);

      const updated = cards.cards().find((c) => c.id === card.id)!;
      expect(updated).toMatchObject({ condition: 'HP', quantity: 4, forSale: true, notes: 'troca', locationId: a.id });
      expect(updated.addedAt).toBe(card.addedAt);
      expect(updated.updatedAt > card.updatedAt).toBe(true);
      expect(cards.byLocation().get(a.id)!.map((c) => c.id)).toEqual([card.id, first.id]);
      expect(cards.cards().length).toBe(2);
      expect(toasts.toast()).toMatchObject({ label: 'Carta atualizada', text: 'Sol Ring foi atualizada.' });
      expect(flow.step()).toEqual({ kind: 'idle' });
    });

    it('a printing change replaces the identity fields', () => {
      const a = make('Fichário');
      const card = own(a.id, { artist: 'Old' });
      flow.openEdit(card.id);
      flow.save(editDraft(card, { scryfallId: 's2', setCode: 'LEA', collectorNumber: '9', artist: undefined }), false);
      const updated = cards.cards().find((c) => c.id === card.id)!;
      expect(updated).toMatchObject({ scryfallId: 's2', setCode: 'LEA', collectorNumber: '9' });
      expect(updated.artist).toBeUndefined();
    });

    it('an edit into a match opens the edit notice; merge removes the edited row and grows the other', async () => {
      const a = make('Fichário');
      const other = own(a.id, { condition: 'NM', quantity: 5 });
      const card = own(a.id, { condition: 'LP', quantity: 2 });
      flow.openEdit(card.id);
      flow.save(editDraft(card, { condition: 'NM' }), false);

      const step = flow.step();
      if (step.kind !== 'duplicate' || step.mode !== 'edit') throw new Error('expected the edit notice');
      expect(step.matches.map((m) => m.card.id)).toEqual([other.id]);
      flow.decide('merge', step.matches[0]);

      expect(cards.cards().map((c) => [c.id, c.quantity])).toEqual([[other.id, 7]]);
      await cards.flush();
      expect((await cards.getTombstones()).map((t) => t.id)).toEqual([card.id]);
      expect(toasts.toast()?.label).toBe('Carta atualizada');
      expect(flow.step()).toEqual({ kind: 'idle' });
    });

    it('keep updates the edited row and leaves both', () => {
      const a = make('Fichário');
      const other = own(a.id, { condition: 'NM', quantity: 5 });
      const card = own(a.id, { condition: 'LP', quantity: 2 });
      flow.openEdit(card.id);
      flow.save(editDraft(card, { condition: 'NM' }), false);
      const step = flow.step();
      if (step.kind !== 'duplicate') throw new Error('expected the notice');
      flow.decide('keep', step.matches[0]);

      const byId = new Map(cards.cards().map((c) => [c.id, c]));
      expect(byId.get(other.id)?.quantity).toBe(5);
      expect(byId.get(card.id)).toMatchObject({ condition: 'NM', quantity: 2 });
    });

    it('cancel on the notice returns to the edit; cancel on the edit closes with nothing saved', () => {
      const a = make('Fichário');
      own(a.id, { condition: 'NM' });
      const card = own(a.id, { condition: 'LP' });
      flow.openEdit(card.id);
      flow.save(editDraft(card, { condition: 'NM' }), false);
      flow.cancel();
      expect(flow.step()).toEqual({ kind: 'edit', collectionId: a.id, cardId: card.id });
      flow.cancel();
      expect(flow.step()).toEqual({ kind: 'idle' });
      expect(cards.cards().find((c) => c.id === card.id)?.condition).toBe('LP');
    });

    it('closes with "Nada foi salvo" when the card leaves the collection mid-edit', async () => {
      const a = make('Fichário');
      const card = own(a.id);
      flow.openEdit(card.id);
      await collections.remove(a.id, 'delete');
      TestBed.tick();
      expect(flow.step()).toEqual({ kind: 'idle' });
      expect(toasts.toast()?.label).toBe('Nada foi salvo');

      const b = make('Arquivo');
      const moved = own(b.id);
      flow.openEdit(moved.id);
      cards.applyMoved(new Set([moved.id]), 'elsewhere', new Date().toISOString());
      TestBed.tick();
      expect(flow.step()).toEqual({ kind: 'idle' });
      expect(toasts.toast()).toMatchObject({ label: 'Nada foi salvo', text: 'Esta carta não está mais nesta coleção.' });
    });
  });

  it('never starts a sync', () => {
    const syncNow = vi.spyOn(sync, 'syncNow');
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    flow.save(draft(), false);
    expect(syncNow).not.toHaveBeenCalled();
  });
});
