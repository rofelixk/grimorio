import { TestBed } from '@angular/core/testing';
import { ColecoesService } from './colecoes.service';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';

function servicoCom(clienteMock: unknown): ColecoesService {
  TestBed.configureTestingModule({
    providers: [ColecoesService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });
  return TestBed.inject(ColecoesService);
}

describe('ColecoesService', () => {
  describe('listarColecoes', () => {
    it('queries the `collections` table ordered by creation date', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [{ id: '1', user_id: 'u1', name: 'Binder', color: 'azul', created_at: '2026-01-01' }],
        error: null,
      });
      const select = jest.fn().mockReturnValue({ order });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).listarColecoes();

      expect(from).toHaveBeenCalledWith('collections');
      expect(select).toHaveBeenCalledWith('*');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(resultado).toEqual([
        { id: '1', user_id: 'u1', name: 'Binder', color: 'azul', created_at: '2026-01-01' },
      ]);
    });

    it('throws with the Postgres error message when the query fails', async () => {
      const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
      const select = jest.fn().mockReturnValue({ order });
      const from = jest.fn().mockReturnValue({ select });

      await expect(servicoCom({ from }).listarColecoes()).rejects.toThrow('boom');
    });
  });

  describe('criarColecao', () => {
    it('inserts a row scoped to the current user and returns it', async () => {
      const single = jest.fn().mockResolvedValue({
        data: { id: '1', user_id: 'u1', name: 'Binder', color: 'azul', created_at: '2026-01-01' },
        error: null,
      });
      const select = jest.fn().mockReturnValue({ single });
      const insert = jest.fn().mockReturnValue({ select });
      const from = jest.fn().mockReturnValue({ insert });
      const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) };

      const resultado = await servicoCom({ from, auth }).criarColecao('Binder', 'azul');

      expect(insert).toHaveBeenCalledWith({ name: 'Binder', color: 'azul', user_id: 'u1' });
      expect(resultado.id).toBe('1');
    });

    it('throws when there is no authenticated user', async () => {
      const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) };

      await expect(servicoCom({ from: jest.fn(), auth }).criarColecao('Binder', 'azul')).rejects.toThrow(
        'Não autenticado.',
      );
    });
  });

  describe('excluirColecao', () => {
    it('deletes the collection by id', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      const del = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ delete: del });

      await servicoCom({ from }).excluirColecao('1');

      expect(from).toHaveBeenCalledWith('collections');
      expect(eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('listarItens', () => {
    it('queries collection_items joined with the card name and mana cost, ordered by last update', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'i1',
            oracle_id: 'o1',
            quantity: 3,
            date_added: '2026-01-01',
            updated_at: '2026-01-02',
            cards: { name: 'Lightning Bolt', mana_cost: '{R}', card_faces: null },
          },
        ],
        error: null,
      });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).listarItens('c1');

      expect(from).toHaveBeenCalledWith('collection_items');
      expect(eq).toHaveBeenCalledWith('collection_id', 'c1');
      expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(resultado).toEqual([
        {
          id: 'i1',
          oracle_id: 'o1',
          quantity: 3,
          date_added: '2026-01-01',
          updated_at: '2026-01-02',
          nome: 'Lightning Bolt',
          mana_cost: '{R}',
        },
      ]);
    });

    it('falls back to the first face mana cost for multi-face cards', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'i1',
            oracle_id: 'o1',
            quantity: 1,
            date_added: '2026-01-01',
            updated_at: '2026-01-02',
            cards: { name: 'Aang', mana_cost: null, card_faces: [{ mana_cost: '{2}{G}' }] },
          },
        ],
        error: null,
      });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).listarItens('c1');

      expect(resultado[0].mana_cost).toBe('{2}{G}');
    });
  });

  describe('buscarCartasEmColecoes', () => {
    it('queries collection_items filtered by card name by default, joined with card and collection info', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'i1',
            oracle_id: 'o1',
            updated_at: '2026-01-02',
            cards: { name: 'Lightning Bolt', image_url: 'https://img/bolt.jpg', type_line: 'Instant' },
            collections: { id: 'c1', name: 'Binder', color: 'azul' },
          },
        ],
        error: null,
      });
      const ilike = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ ilike });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).buscarCartasEmColecoes('bolt');

      expect(from).toHaveBeenCalledWith('collection_items');
      expect(ilike).toHaveBeenCalledWith('cards.name', '%bolt%');
      expect(resultado).toEqual([
        {
          id: 'i1',
          oracle_id: 'o1',
          updated_at: '2026-01-02',
          nome: 'Lightning Bolt',
          tipo: 'Instant',
          imagem_url: 'https://img/bolt.jpg',
          colecao_id: 'c1',
          colecao_nome: 'Binder',
          colecao_cor: 'azul',
        },
      ]);
    });

    it('filters by type_line when that field is chosen', async () => {
      const order = jest.fn().mockResolvedValue({ data: [], error: null });
      const ilike = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ ilike });
      const from = jest.fn().mockReturnValue({ select });

      await servicoCom({ from }).buscarCartasEmColecoes('instant', 'type_line');

      expect(ilike).toHaveBeenCalledWith('cards.type_line', '%instant%');
    });
  });

  describe('adicionarCarta', () => {
    it('increments the quantity when the card is already in the collection (no set_code yet)', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({
        data: { id: 'i1', quantity: 2 },
        error: null,
      });
      const isFn = jest.fn().mockReturnValue({ maybeSingle });
      const eqOracle = jest.fn().mockReturnValue({ is: isFn });
      const eqColecao = jest.fn().mockReturnValue({ eq: eqOracle });
      const selectBusca = jest.fn().mockReturnValue({ eq: eqColecao });

      const eqUpdate = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn().mockReturnValue({ eq: eqUpdate });

      const from = jest.fn().mockReturnValue({ select: selectBusca, update });

      await servicoCom({ from }).adicionarCarta('c1', 'o1');

      expect(eqColecao).toHaveBeenCalledWith('collection_id', 'c1');
      expect(eqOracle).toHaveBeenCalledWith('oracle_id', 'o1');
      expect(isFn).toHaveBeenCalledWith('set_code', null);
      expect(update).toHaveBeenCalledWith({ quantity: 3 });
      expect(eqUpdate).toHaveBeenCalledWith('id', 'i1');
    });

    it('inserts a new row with quantity 1 when the card is not yet in the collection', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const isFn = jest.fn().mockReturnValue({ maybeSingle });
      const eqOracle = jest.fn().mockReturnValue({ is: isFn });
      const eqColecao = jest.fn().mockReturnValue({ eq: eqOracle });
      const selectBusca = jest.fn().mockReturnValue({ eq: eqColecao });

      const insert = jest.fn().mockResolvedValue({ error: null });

      const from = jest.fn().mockReturnValue({ select: selectBusca, insert });

      await servicoCom({ from }).adicionarCarta('c1', 'o1');

      expect(insert).toHaveBeenCalledWith({ collection_id: 'c1', oracle_id: 'o1', quantity: 1 });
    });
  });

  describe('removerUmaCopia', () => {
    it('decrements the quantity when more than one copy is present', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: { quantity: 3 }, error: null });
      const eqBusca = jest.fn().mockReturnValue({ maybeSingle });
      const selectBusca = jest.fn().mockReturnValue({ eq: eqBusca });

      const eqUpdate = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn().mockReturnValue({ eq: eqUpdate });

      const from = jest.fn().mockReturnValue({ select: selectBusca, update });

      await servicoCom({ from }).removerUmaCopia('i1');

      expect(update).toHaveBeenCalledWith({ quantity: 2 });
    });

    it('deletes the row when the last copy is removed', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: { quantity: 1 }, error: null });
      const eqBusca = jest.fn().mockReturnValue({ maybeSingle });
      const selectBusca = jest.fn().mockReturnValue({ eq: eqBusca });

      const eqDelete = jest.fn().mockResolvedValue({ error: null });
      const del = jest.fn().mockReturnValue({ eq: eqDelete });

      const from = jest.fn().mockReturnValue({ select: selectBusca, delete: del });

      await servicoCom({ from }).removerUmaCopia('i1');

      expect(del).toHaveBeenCalled();
      expect(eqDelete).toHaveBeenCalledWith('id', 'i1');
    });
  });
});
