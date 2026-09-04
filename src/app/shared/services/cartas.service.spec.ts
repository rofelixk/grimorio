import { TestBed } from '@angular/core/testing';
import { CartasService } from './cartas.service';
import { TOKEN_CLIENTE_SUPABASE } from '@shared/config';

function configurarServico(respostaIlike: { data: unknown; error: unknown }) {
  const ilike = jest.fn().mockResolvedValue(respostaIlike);
  const select = jest.fn().mockReturnValue({ ilike });
  const from = jest.fn().mockReturnValue({ select });
  const clienteMock = { from };

  TestBed.configureTestingModule({
    providers: [CartasService, { provide: TOKEN_CLIENTE_SUPABASE, useValue: clienteMock }],
  });

  return { servico: TestBed.inject(CartasService), from, select, ilike };
}

describe('CartasService', () => {
  it('queries the `cards` table, filtering the chosen column with a case-insensitive substring pattern', async () => {
    const { servico, from, select, ilike } = configurarServico({
      data: [{ oracle_id: '1', name: 'Ashling' }],
      error: null,
    });

    const resultado = await servico.buscarCartas('ash', 'name');

    expect(from).toHaveBeenCalledWith('cards');
    expect(select).toHaveBeenCalledWith('*');
    expect(ilike).toHaveBeenCalledWith('name', '%ash%');
    expect(resultado).toEqual([{ oracle_id: '1', name: 'Ashling' }]);
  });

  it('respects the chosen search field', async () => {
    const { servico, ilike } = configurarServico({ data: [], error: null });

    await servico.buscarCartas('dragon', 'type_line');

    expect(ilike).toHaveBeenCalledWith('type_line', '%dragon%');
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
});
