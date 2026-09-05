import { TestBed } from '@angular/core/testing';
import { BaralhosService } from './baralhos.service';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';
import { ICarta } from '@shared/interfaces';

function servicoCom(clienteMock: unknown): BaralhosService {
  TestBed.configureTestingModule({
    providers: [BaralhosService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });
  return TestBed.inject(BaralhosService);
}

function criarCarta(sobrescritas: Partial<ICarta.Detalhes> = {}): ICarta.Detalhes {
  return {
    oracle_id: 'o1',
    name: 'Karador, Ghost Chieftain',
    mana_cost: '{3}{B}{G}{W}',
    mana_value: 6,
    type_line: 'Legendary Creature — Human Shaman',
    oracle_text: null,
    color_identity: ['B', 'G', 'W'],
    power: '5',
    toughness: '5',
    loyalty: null,
    layout: 'normal',
    commander_legality: 'legal',
    image_url: null,
    card_faces: null,
    ...sobrescritas,
  };
}

describe('BaralhosService', () => {
  describe('listarBaralhos', () => {
    it('queries the `decks` table ordered by creation date', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [{ id: '1', user_id: 'u1', name: 'Reanimator', commander_oracle_id: null, format: 'commander', created_at: '2026-01-01' }],
        error: null,
      });
      const select = jest.fn().mockReturnValue({ order });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).listarBaralhos();

      expect(from).toHaveBeenCalledWith('decks');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(resultado[0].name).toBe('Reanimator');
    });

    it('throws with the Postgres error message when the query fails', async () => {
      const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
      const select = jest.fn().mockReturnValue({ order });
      const from = jest.fn().mockReturnValue({ select });

      await expect(servicoCom({ from }).listarBaralhos()).rejects.toThrow('boom');
    });
  });

  describe('criarBaralho', () => {
    it('inserts a row scoped to the current user and returns it', async () => {
      const single = jest.fn().mockResolvedValue({
        data: { id: '1', user_id: 'u1', name: 'Reanimator', commander_oracle_id: null, format: 'commander', created_at: '2026-01-01' },
        error: null,
      });
      const select = jest.fn().mockReturnValue({ single });
      const insert = jest.fn().mockReturnValue({ select });
      const from = jest.fn().mockReturnValue({ insert });
      const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) };

      const resultado = await servicoCom({ from, auth }).criarBaralho('Reanimator');

      expect(insert).toHaveBeenCalledWith({ name: 'Reanimator', user_id: 'u1' });
      expect(resultado.id).toBe('1');
    });

    it('throws when there is no authenticated user', async () => {
      const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) };

      await expect(servicoCom({ from: jest.fn(), auth }).criarBaralho('Reanimator')).rejects.toThrow(
        'Não autenticado.',
      );
    });
  });

  describe('excluirBaralho', () => {
    it('deletes the deck by id', async () => {
      const eq = jest.fn().mockResolvedValue({ error: null });
      const del = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ delete: del });

      await servicoCom({ from }).excluirBaralho('1');

      expect(from).toHaveBeenCalledWith('decks');
      expect(eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('listarCartas', () => {
    it('queries deck_cards joined with card and printing info, ordered by last update', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'i1',
            oracle_id: 'o1',
            printing_id: 'p1',
            quantity: 2,
            is_commander: false,
            updated_at: '2026-01-02',
            cards: {
              name: 'Lightning Bolt',
              mana_cost: '{R}',
              card_faces: null,
              type_line: 'Instant',
              color_identity: ['R'],
              image_url: 'https://img/bolt-representante.jpg',
            },
            printings: { set_code: 'lea', image_url: 'https://img/bolt-lea.jpg' },
          },
        ],
        error: null,
      });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).listarCartas('d1');

      expect(from).toHaveBeenCalledWith('deck_cards');
      expect(eq).toHaveBeenCalledWith('deck_id', 'd1');
      expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(resultado).toEqual([
        {
          id: 'i1',
          oracle_id: 'o1',
          printing_id: 'p1',
          quantity: 2,
          is_commander: false,
          updated_at: '2026-01-02',
          nome: 'Lightning Bolt',
          mana_cost: '{R}',
          type_line: 'Instant',
          color_identity: ['R'],
          set_code: 'lea',
          image_url: 'https://img/bolt-lea.jpg',
        },
      ]);
    });

    it('has a null set_code and falls back to the card image when no printing is chosen', async () => {
      const order = jest.fn().mockResolvedValue({
        data: [
          {
            id: 'i1',
            oracle_id: 'o1',
            printing_id: null,
            quantity: 1,
            is_commander: false,
            updated_at: '2026-01-02',
            cards: {
              name: 'Forest',
              mana_cost: null,
              card_faces: null,
              type_line: 'Basic Land — Forest',
              color_identity: [],
              image_url: 'https://img/forest.jpg',
            },
            printings: null,
          },
        ],
        error: null,
      });
      const eq = jest.fn().mockReturnValue({ order });
      const select = jest.fn().mockReturnValue({ eq });
      const from = jest.fn().mockReturnValue({ select });

      const resultado = await servicoCom({ from }).listarCartas('d1');

      expect(resultado[0].set_code).toBeNull();
      expect(resultado[0].image_url).toBe('https://img/forest.jpg');
    });
  });

  describe('definirComandante', () => {
    it('rejects a card that is not commander-eligible without writing anything', async () => {
      const from = jest.fn();

      await expect(
        servicoCom({ from }).definirComandante('d1', criarCarta({ type_line: 'Creature — Bear' }), null),
      ).rejects.toThrow('Esta carta não pode ser comandante.');
      expect(from).not.toHaveBeenCalled();
    });

    it('replaces any existing commander row, inserts the new one, and updates the deck', async () => {
      const eqIsCommander = jest.fn().mockResolvedValue({ error: null });
      const eqDeckDelete = jest.fn().mockReturnValue({ eq: eqIsCommander });
      const del = jest.fn().mockReturnValue({ eq: eqDeckDelete });

      const insert = jest.fn().mockResolvedValue({ error: null });

      const eqUpdateDeck = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn().mockReturnValue({ eq: eqUpdateDeck });

      const from = jest.fn((tabela: string) =>
        tabela === 'deck_cards' ? { delete: del, insert } : { update },
      );

      await servicoCom({ from }).definirComandante('d1', criarCarta(), 'p1');

      expect(eqDeckDelete).toHaveBeenCalledWith('deck_id', 'd1');
      expect(eqIsCommander).toHaveBeenCalledWith('is_commander', true);
      expect(insert).toHaveBeenCalledWith({
        deck_id: 'd1',
        oracle_id: 'o1',
        printing_id: 'p1',
        quantity: 1,
        is_commander: true,
      });
      expect(update).toHaveBeenCalledWith({ commander_oracle_id: 'o1' });
      expect(eqUpdateDeck).toHaveBeenCalledWith('id', 'd1');
    });
  });

  describe('adicionarCarta', () => {
    function configurarBaralho({
      linhasExistentes = [] as { id: string; printing_id: string | null; quantity: number; is_commander: boolean }[],
      quantidadesAtuais = [] as { quantity: number }[],
    }) {
      const eqOracle = jest.fn().mockResolvedValue({ data: linhasExistentes, error: null });
      const eqDeckBusca = jest.fn().mockReturnValue({ eq: eqOracle });
      const selectBusca = jest.fn().mockReturnValue({ eq: eqDeckBusca });

      const eqIsCommander = jest.fn().mockResolvedValue({ data: quantidadesAtuais, error: null });
      const eqDeckQuantidades = jest.fn().mockReturnValue({ eq: eqIsCommander });
      const selectQuantidades = jest.fn().mockReturnValue({ eq: eqDeckQuantidades });

      let chamadaSelect = 0;
      const select = jest.fn(() => (chamadaSelect++ === 0 ? selectBusca() : selectQuantidades()));

      const eqUpdate = jest.fn().mockResolvedValue({ error: null });
      const update = jest.fn().mockReturnValue({ eq: eqUpdate });

      const insert = jest.fn().mockResolvedValue({ error: null });

      const from = jest.fn().mockReturnValue({ select, update, insert });

      return { from, select, eqDeckBusca, eqOracle, update, eqUpdate, insert, eqDeckQuantidades, eqIsCommander };
    }

    it('blocks adding a card outside the commander color identity', async () => {
      const { from } = configurarBaralho({});

      await expect(
        servicoCom({ from }).adicionarCarta('d1', criarCarta({ color_identity: ['R'] }), null, ['G', 'W']),
      ).rejects.toThrow('fora da identidade de cor');
      expect(from).not.toHaveBeenCalled();
    });

    it('blocks adding a card that is already the commander', async () => {
      const { from } = configurarBaralho({
        linhasExistentes: [{ id: 'i0', printing_id: null, quantity: 1, is_commander: true }],
      });

      await expect(
        servicoCom({ from }).adicionarCarta('d1', criarCarta(), null, null),
      ).rejects.toThrow('já é o comandante');
    });

    it('blocks a second copy of a non-basic, non-unlimited card', async () => {
      const { from } = configurarBaralho({
        linhasExistentes: [{ id: 'i1', printing_id: null, quantity: 1, is_commander: false }],
      });

      await expect(
        servicoCom({ from }).adicionarCarta('d1', criarCarta({ type_line: 'Creature — Bear' }), null, null),
      ).rejects.toThrow('apenas 1 cópia');
    });

    it('allows stacking a second copy of a basic land under a different printing as a new row', async () => {
      const terra = criarCarta({ name: 'Forest', type_line: 'Basic Land — Forest', color_identity: [] });
      const { from, insert } = configurarBaralho({
        linhasExistentes: [{ id: 'i1', printing_id: 'p1', quantity: 10, is_commander: false }],
        quantidadesAtuais: [{ quantity: 10 }],
      });

      await servicoCom({ from }).adicionarCarta('d1', terra, 'p2', null);

      expect(insert).toHaveBeenCalledWith({
        deck_id: 'd1',
        oracle_id: 'o1',
        printing_id: 'p2',
        quantity: 1,
        is_commander: false,
      });
    });

    it('increments quantity when re-adding the same printing of a basic land', async () => {
      const terra = criarCarta({ name: 'Forest', type_line: 'Basic Land — Forest', color_identity: [] });
      const { from, update, eqUpdate } = configurarBaralho({
        linhasExistentes: [{ id: 'i1', printing_id: 'p1', quantity: 10, is_commander: false }],
      });

      await servicoCom({ from }).adicionarCarta('d1', terra, 'p1', null);

      expect(update).toHaveBeenCalledWith({ quantity: 11 });
      expect(eqUpdate).toHaveBeenCalledWith('id', 'i1');
    });

    it('blocks adding a new card once the deck already has 99 cards', async () => {
      const carta = criarCarta({ oracle_id: 'o2', name: 'Another Card', type_line: 'Creature — Bear' });
      const { from } = configurarBaralho({
        linhasExistentes: [],
        quantidadesAtuais: [{ quantity: 99 }],
      });

      await expect(servicoCom({ from }).adicionarCarta('d1', carta, null, null)).rejects.toThrow(
        'já tem 99 cartas',
      );
    });

    it('inserts a brand-new card when under the cap', async () => {
      const carta = criarCarta({ oracle_id: 'o2', name: 'Another Card', type_line: 'Creature — Bear' });
      const { from, insert } = configurarBaralho({
        linhasExistentes: [],
        quantidadesAtuais: [{ quantity: 50 }],
      });

      await servicoCom({ from }).adicionarCarta('d1', carta, null, null);

      expect(insert).toHaveBeenCalledWith({
        deck_id: 'd1',
        oracle_id: 'o2',
        printing_id: null,
        quantity: 1,
        is_commander: false,
      });
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
