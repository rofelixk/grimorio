import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ColecaoDetalhe } from './colecao-detalhe';
import { CartasService, ColecoesService } from '@shared/services';
import { IColecao } from '@shared/interfaces';

function colecaoExemplo(): IColecao.Detalhes {
  return { id: 'c1', user_id: 'u1', name: 'Binder', color: 'azul', created_at: '2026-01-01' };
}

function itemExemplo(sobrescritas: Partial<IColecao.ItemListado> = {}): IColecao.ItemListado {
  return {
    id: 'i1',
    oracle_id: 'o1',
    quantity: 1,
    date_added: '2026-01-01',
    updated_at: '2026-01-01',
    nome: 'Lightning Bolt',
    mana_cost: '{R}',
    ...sobrescritas,
  };
}

describe('ColecaoDetalhe', () => {
  let colecoesServiceMock: {
    buscarColecaoPorId: jest.Mock;
    listarItens: jest.Mock;
    adicionarCarta: jest.Mock;
    removerUmaCopia: jest.Mock;
  };

  async function criarFixture(id: string | null = 'c1') {
    await TestBed.configureTestingModule({
      imports: [ColecaoDetalhe],
      providers: [
        provideRouter([]),
        { provide: ColecoesService, useValue: colecoesServiceMock },
        { provide: CartasService, useValue: { buscarCartas: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();

    return TestBed.createComponent(ColecaoDetalhe);
  }

  beforeEach(() => {
    colecoesServiceMock = {
      buscarColecaoPorId: jest.fn().mockResolvedValue(colecaoExemplo()),
      listarItens: jest.fn().mockResolvedValue([]),
      adicionarCarta: jest.fn().mockResolvedValue(undefined),
      removerUmaCopia: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should create', async () => {
    const fixture = await criarFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an error when there is no id in the route', async () => {
    const fixture = await criarFixture(null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('Collection not found');
  });

  it('shows an error when the collection does not exist', async () => {
    colecoesServiceMock.buscarColecaoPorId.mockResolvedValue(null);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('Collection not found');
  });

  it('loads the collection and its items on init', async () => {
    colecoesServiceMock.listarItens.mockResolvedValue([itemExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(colecoesServiceMock.listarItens).toHaveBeenCalledWith('c1');
    expect(fixture.nativeElement.textContent).toContain('Binder');
    expect(fixture.nativeElement.textContent).toContain('Lightning Bolt');
    expect(fixture.nativeElement.textContent).toContain('×1');
  });

  it('shows a message when the collection has no cards yet', async () => {
    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No cards added yet.');
  });

  it('calls removerUmaCopia and reloads the item list when Remove is clicked', async () => {
    colecoesServiceMock.listarItens.mockResolvedValueOnce([itemExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    colecoesServiceMock.listarItens.mockResolvedValueOnce([]);
    const botaoRemover = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Remove',
    ) as HTMLButtonElement;
    botaoRemover.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(colecoesServiceMock.removerUmaCopia).toHaveBeenCalledWith('i1');
    expect(colecoesServiceMock.listarItens).toHaveBeenCalledTimes(2);
  });
});
