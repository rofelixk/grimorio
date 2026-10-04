import { TestBed } from '@angular/core/testing';
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

  it('never starts a sync', () => {
    const syncNow = vi.spyOn(sync, 'syncNow');
    const a = make('Fichário');
    toBeDraftingIn(a.id);
    flow.save(draft(), false);
    expect(syncNow).not.toHaveBeenCalled();
  });
});
