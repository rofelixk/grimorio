import { TestBed } from '@angular/core/testing';
import { CartasService, TAMANHO_PAGINA_BUSCA, calcularTamanhoPagina } from './cartas.service';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';

function configurarServico(respostaRange: { data: unknown; error: unknown; count?: number | null }) {
  const range = jest.fn().mockResolvedValue(respostaRange);
  const ilike = jest.fn().mockReturnValue({ range });
  const select = jest.fn().mockReturnValue({ ilike });
  const from = jest.fn().mockReturnValue({ select });
  const clienteMock = { from };

  TestBed.configureTestingModule({
    providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });

  return { servico: TestBed.inject(CartasService), from, select, ilike, range };
}

function configurarServicoComIdentidade(respostaRange: { data: unknown; error: unknown; count?: number | null }) {
  const range = jest.fn().mockResolvedValue(respostaRange);
  const containedBy = jest.fn().mockReturnValue({ range });
  const ilike = jest.fn().mockReturnValue({ containedBy, range });
  const select = jest.fn().mockReturnValue({ ilike });
  const from = jest.fn().mockReturnValue({ select });
  const clienteMock = { from };

  TestBed.configureTestingModule({
    providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });

  return { servico: TestBed.inject(CartasService), from, select, ilike, containedBy, range };
}

function configurarServicoParaPossuidas(
  respostaItens: { data: unknown; error: unknown },
  respostaRange: { data: unknown; error: unknown; count?: number | null },
) {
  const range = jest.fn().mockResolvedValue(respostaRange);
  const ilike = jest.fn().mockReturnValue({ range });
  const in_ = jest.fn().mockReturnValue({ ilike });
  const selectCards = jest.fn().mockReturnValue({ in: in_ });
  const selectItens = jest.fn().mockResolvedValue(respostaItens);
  const from = jest.fn((tabela: string) =>
    tabela === 'collection_items' ? { select: selectItens } : { select: selectCards },
  );
  const clienteMock = { from };

  TestBed.configureTestingModule({
    providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });

  return { servico: TestBed.inject(CartasService), from, selectItens, selectCards, in: in_, ilike, range };
}

function configurarServicoParaBuscaPorId(respostaMaybeSingle: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(respostaMaybeSingle);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  const clienteMock = { from };

  TestBed.configureTestingModule({
    providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });

  return { servico: TestBed.inject(CartasService), from, select, eq, maybeSingle };
}

function configurarServicoParaBuscaPorImpressao(
  respostasMaybeSingle: Array<{ data: unknown; error: unknown }>,
) {
  let chamada = 0;
  const maybeSingle = jest.fn(() =>
    Promise.resolve(respostasMaybeSingle[chamada++] ?? respostasMaybeSingle.at(-1)),
  );
  const encadeavel = { eq: jest.fn(), maybeSingle };
  encadeavel.eq.mockReturnValue(encadeavel);
  const ilike = jest.fn().mockReturnValue(encadeavel);
  const select = jest.fn().mockReturnValue({ ilike });
  const from = jest.fn().mockReturnValue({ select });
  const clienteMock = { from };

  TestBed.configureTestingModule({
    providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });

  return { servico: TestBed.inject(CartasService), from, select, ilike, eq: encadeavel.eq, maybeSingle };
}

describe('CartasService', () => {
  it('queries the `cards` table, filtering the chosen column with a case-insensitive substring pattern', async () => {
    const { servico, from, select, ilike } = configurarServico({
      data: [{ oracle_id: '1', name: 'Ashling' }],
      error: null,
      count: 1,
    });

    const resultado = await servico.buscarCartas('ash', 'name');

    expect(from).toHaveBeenCalledWith('cards');
    expect(select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(ilike).toHaveBeenCalledWith('name', '%ash%');
    expect(resultado).toEqual({ cartas: [{ oracle_id: '1', name: 'Ashling' }], total: 1 });
  });

  it('respects the chosen search field', async () => {
    const { servico, ilike } = configurarServico({ data: [], error: null, count: 0 });

    await servico.buscarCartas('dragon', 'type_line');

    expect(ilike).toHaveBeenCalledWith('type_line', '%dragon%');
  });

  it('requests the range for the given page, defaulting to the first page and the default page size', async () => {
    const { servico, range } = configurarServico({ data: [], error: null, count: 0 });

    await servico.buscarCartas('dragon', 'name');
    expect(range).toHaveBeenLastCalledWith(0, TAMANHO_PAGINA_BUSCA - 1);

    await servico.buscarCartas('dragon', 'name', 3);
    expect(range).toHaveBeenLastCalledWith(
      2 * TAMANHO_PAGINA_BUSCA,
      3 * TAMANHO_PAGINA_BUSCA - 1,
    );
  });

  it('requests the range using a custom page size when given one', async () => {
    const { servico, range } = configurarServico({ data: [], error: null, count: 0 });

    await servico.buscarCartas('dragon', 'name', 1, 24);
    expect(range).toHaveBeenLastCalledWith(0, 23);

    await servico.buscarCartas('dragon', 'name', 3, 24);
    expect(range).toHaveBeenLastCalledWith(48, 71);
  });

  it('throws with the Postgres error message when the query fails', async () => {
    const { servico } = configurarServico({
      data: null,
      error: { message: 'permission denied for table cards' },
    });

    await expect(servico.buscarCartas('ash', 'name')).rejects.toThrow(
      'permission denied for table cards',
    );
  });

  it('does not filter by color identity when none is given', async () => {
    const { servico, ilike } = configurarServicoComIdentidade({ data: [], error: null, count: 0 });

    await servico.buscarCartas('dragon', 'name');

    expect(ilike).toHaveBeenCalledWith('name', '%dragon%');
  });

  it('filters by color identity containment when given one', async () => {
    const { servico, containedBy, range } = configurarServicoComIdentidade({
      data: [{ oracle_id: '1', color_identity: ['G'] }],
      error: null,
      count: 1,
    });

    const resultado = await servico.buscarCartas('dragon', 'name', 1, 25, ['G', 'U']);

    expect(containedBy).toHaveBeenCalledWith('color_identity', ['G', 'U']);
    expect(range).toHaveBeenCalledWith(0, 24);
    expect(resultado).toEqual({ cartas: [{ oracle_id: '1', color_identity: ['G'] }], total: 1 });
  });

  it('restricts the search to owned cards when using buscarCartasPossuidas', async () => {
    const { servico, from, in: in_, ilike } = configurarServicoParaPossuidas(
      { data: [{ oracle_id: '1' }, { oracle_id: '2' }, { oracle_id: '1' }], error: null },
      { data: [{ oracle_id: '1', name: 'Ashling' }], error: null, count: 1 },
    );

    const resultado = await servico.buscarCartasPossuidas('ash', 'name');

    expect(from).toHaveBeenCalledWith('collection_items');
    expect(from).toHaveBeenCalledWith('cards');
    expect(in_).toHaveBeenCalledWith('oracle_id', ['1', '2']);
    expect(ilike).toHaveBeenCalledWith('name', '%ash%');
    expect(resultado).toEqual({ cartas: [{ oracle_id: '1', name: 'Ashling' }], total: 1 });
  });

  it('short-circuits to an empty result when the user owns no cards', async () => {
    const { servico, selectCards } = configurarServicoParaPossuidas(
      { data: [], error: null },
      { data: [], error: null, count: 0 },
    );

    const resultado = await servico.buscarCartasPossuidas('ash', 'name');

    expect(selectCards).not.toHaveBeenCalled();
    expect(resultado).toEqual({ cartas: [], total: 0 });
  });

  it('throws with the Postgres error message when the owned-cards lookup fails', async () => {
    const { servico } = configurarServicoParaPossuidas(
      { data: null, error: { message: 'permission denied for table collection_items' } },
      { data: [], error: null, count: 0 },
    );

    await expect(servico.buscarCartasPossuidas('ash', 'name')).rejects.toThrow(
      'permission denied for table collection_items',
    );
  });

  it('queries the `cards` table by oracle_id for a single card', async () => {
    const { servico, from, select, eq } = configurarServicoParaBuscaPorId({
      data: { oracle_id: '1', name: 'Ashling' },
      error: null,
    });

    const resultado = await servico.buscarCartaPorId('1');

    expect(from).toHaveBeenCalledWith('cards');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('oracle_id', '1');
    expect(resultado).toEqual({ oracle_id: '1', name: 'Ashling' });
  });

  it('returns null when no card matches the given oracle_id', async () => {
    const { servico } = configurarServicoParaBuscaPorId({ data: null, error: null });

    const resultado = await servico.buscarCartaPorId('inexistente');

    expect(resultado).toBeNull();
  });

  it('throws with the Postgres error message when the lookup by id fails', async () => {
    const { servico } = configurarServicoParaBuscaPorId({
      data: null,
      error: { message: 'permission denied for table cards' },
    });

    await expect(servico.buscarCartaPorId('1')).rejects.toThrow(
      'permission denied for table cards',
    );
  });

  it('resolves a card by set code + collector number via the `printings` table, along with the printing id', async () => {
    const { servico, from, select, ilike, eq } = configurarServicoParaBuscaPorImpressao([
      { data: { scryfall_id: 'p1', cards: { oracle_id: '1', name: 'Ashling' } }, error: null },
    ]);

    const resultado = await servico.buscarCartaPorImpressao('SLX', '042');

    expect(from).toHaveBeenCalledWith('printings');
    expect(select).toHaveBeenCalledWith('scryfall_id, cards(*)');
    expect(ilike).toHaveBeenCalledWith('set_code', 'SLX');
    expect(eq).toHaveBeenCalledWith('collector_number', '042');
    expect(eq).toHaveBeenCalledWith('lang', 'en');
    expect(resultado).toEqual({ carta: { oracle_id: '1', name: 'Ashling' }, printingId: 'p1' });
  });

  it('retries without leading zeros when the exact collector number does not match', async () => {
    const { servico, eq } = configurarServicoParaBuscaPorImpressao([
      { data: null, error: null },
      { data: { scryfall_id: 'p1', cards: { oracle_id: '1', name: 'Ashling' } }, error: null },
    ]);

    const resultado = await servico.buscarCartaPorImpressao('SLX', '007');

    expect(eq).toHaveBeenCalledWith('collector_number', '007');
    expect(eq).toHaveBeenCalledWith('collector_number', '7');
    expect(resultado).toEqual({ carta: { oracle_id: '1', name: 'Ashling' }, printingId: 'p1' });
  });

  it('returns null when no printing matches either form of the collector number', async () => {
    const { servico } = configurarServicoParaBuscaPorImpressao([
      { data: null, error: null },
      { data: null, error: null },
    ]);

    const resultado = await servico.buscarCartaPorImpressao('SLX', '007');

    expect(resultado).toBeNull();
  });

  it('throws with the Postgres error message when the printing lookup fails', async () => {
    const { servico } = configurarServicoParaBuscaPorImpressao([
      { data: null, error: { message: 'permission denied for table printings' } },
    ]);

    await expect(servico.buscarCartaPorImpressao('SLX', '042')).rejects.toThrow(
      'permission denied for table printings',
    );
  });

  it('fetches a specific printing\'s image by scryfall_id', async () => {
    const { servico, from, select, eq } = configurarServicoParaBuscaPorId({
      data: { image_url: 'https://cards.scryfall.io/normal/p1.jpg' },
      error: null,
    });

    const resultado = await servico.buscarImagemDaImpressao('p1');

    expect(from).toHaveBeenCalledWith('printings');
    expect(select).toHaveBeenCalledWith('image_url');
    expect(eq).toHaveBeenCalledWith('scryfall_id', 'p1');
    expect(resultado).toBe('https://cards.scryfall.io/normal/p1.jpg');
  });

  it('returns null when the printing has no image or does not exist', async () => {
    const { servico } = configurarServicoParaBuscaPorId({ data: null, error: null });

    const resultado = await servico.buscarImagemDaImpressao('inexistente');

    expect(resultado).toBeNull();
  });

  it('throws with the Postgres error message when the printing image lookup fails', async () => {
    const { servico } = configurarServicoParaBuscaPorId({
      data: null,
      error: { message: 'permission denied for table printings' },
    });

    await expect(servico.buscarImagemDaImpressao('p1')).rejects.toThrow(
      'permission denied for table printings',
    );
  });

  it('lists every known printing of a card, ordered by set code', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ scryfall_id: 'p1', oracle_id: '1', set_code: 'lea', collector_number: '1', lang: 'en', image_url: null }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    TestBed.configureTestingModule({
      providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: { from } }],
    });
    const servico = TestBed.inject(CartasService);

    const resultado = await servico.buscarImpressoesPorCarta('1');

    expect(from).toHaveBeenCalledWith('printings');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('oracle_id', '1');
    expect(order).toHaveBeenCalledWith('set_code');
    expect(resultado).toEqual([
      { scryfall_id: 'p1', oracle_id: '1', set_code: 'lea', collector_number: '1', lang: 'en', image_url: null },
    ]);
  });

  it('throws with the Postgres error message when listing printings fails', async () => {
    const order = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table printings' },
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    TestBed.configureTestingModule({
      providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: { from } }],
    });
    const servico = TestBed.inject(CartasService);

    await expect(servico.buscarImpressoesPorCarta('1')).rejects.toThrow(
      'permission denied for table printings',
    );
  });
});

describe('calcularTamanhoPagina', () => {
  it('returns a full-rows page size for each column count already used in the app', () => {
    expect(calcularTamanhoPagina(5)).toBe(25);
    expect(calcularTamanhoPagina(4)).toBe(24);
    expect(calcularTamanhoPagina(2)).toBe(20);
  });

  it('falls back to the row count closest to the default page size for any other column count', () => {
    // 25 / 3 = 8.33 -> rounds to 8 rows -> 24
    expect(calcularTamanhoPagina(3)).toBe(24);
  });
});
