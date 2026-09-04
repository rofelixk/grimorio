import { TestBed } from '@angular/core/testing';
import { CartasService, TAMANHO_PAGINA_BUSCA } from './cartas.service';
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

  it('requests the range for the given page, defaulting to the first page', async () => {
    const { servico, range } = configurarServico({ data: [], error: null, count: 0 });

    await servico.buscarCartas('dragon', 'name');
    expect(range).toHaveBeenLastCalledWith(0, TAMANHO_PAGINA_BUSCA - 1);

    await servico.buscarCartas('dragon', 'name', 3);
    expect(range).toHaveBeenLastCalledWith(
      2 * TAMANHO_PAGINA_BUSCA,
      3 * TAMANHO_PAGINA_BUSCA - 1,
    );
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
});
