import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BaralhoDetalhe } from './baralho-detalhe';
import { BaralhosService, CartasService } from '@shared/services';
import { IBaralho, ICarta } from '@shared/interfaces';

function baralhoExemplo(): IBaralho.Detalhes {
  return {
    id: 'd1',
    user_id: 'u1',
    name: 'Reanimator',
    commander_oracle_id: null,
    format: 'commander',
    created_at: '2026-01-01',
  };
}

function itemExemplo(sobrescritas: Partial<IBaralho.ItemListado> = {}): IBaralho.ItemListado {
  return {
    id: 'i1',
    oracle_id: 'o1',
    printing_id: null,
    quantity: 1,
    is_commander: false,
    updated_at: '2026-01-01',
    nome: 'Lightning Bolt',
    mana_cost: '{R}',
    type_line: 'Instant',
    color_identity: ['R'],
    set_code: null,
    image_url: null,
    ...sobrescritas,
  };
}

function comandanteExemplo(sobrescritas: Partial<IBaralho.ItemListado> = {}): IBaralho.ItemListado {
  return itemExemplo({
    id: 'i0',
    oracle_id: 'oc1',
    is_commander: true,
    nome: 'Karador, Ghost Chieftain',
    type_line: 'Legendary Creature — Human Shaman',
    color_identity: ['B', 'G', 'W'],
    ...sobrescritas,
  });
}

function cartaExemplo(sobrescritas: Partial<ICarta.Detalhes> = {}): ICarta.Detalhes {
  return {
    oracle_id: 'o2',
    name: 'Another Card',
    mana_cost: '{1}',
    mana_value: 1,
    type_line: 'Creature — Bear',
    oracle_text: null,
    color_identity: ['G'],
    power: '2',
    toughness: '2',
    loyalty: null,
    layout: 'normal',
    commander_legality: 'legal',
    image_url: null,
    card_faces: null,
    ...sobrescritas,
  };
}

describe('BaralhoDetalhe', () => {
  let baralhosServiceMock: {
    buscarBaralhoPorId: jest.Mock;
    listarCartas: jest.Mock;
    definirComandante: jest.Mock;
    removerComandante: jest.Mock;
    adicionarCarta: jest.Mock;
    removerUmaCopia: jest.Mock;
    atualizarBaralho: jest.Mock;
    excluirBaralho: jest.Mock;
  };
  let cartasServiceMock: {
    buscarCartas: jest.Mock;
    buscarCartasPossuidas: jest.Mock;
    buscarImpressoesPorCarta: jest.Mock;
  };

  async function criarFixture(id: string | null = 'd1') {
    await TestBed.configureTestingModule({
      imports: [BaralhoDetalhe],
      providers: [
        provideRouter([]),
        { provide: BaralhosService, useValue: baralhosServiceMock },
        { provide: CartasService, useValue: cartasServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();

    return TestBed.createComponent(BaralhoDetalhe);
  }

  beforeEach(() => {
    baralhosServiceMock = {
      buscarBaralhoPorId: jest.fn().mockResolvedValue(baralhoExemplo()),
      listarCartas: jest.fn().mockResolvedValue([]),
      definirComandante: jest.fn().mockResolvedValue(undefined),
      removerComandante: jest.fn().mockResolvedValue(undefined),
      adicionarCarta: jest.fn().mockResolvedValue(undefined),
      removerUmaCopia: jest.fn().mockResolvedValue(undefined),
      atualizarBaralho: jest.fn().mockResolvedValue(baralhoExemplo()),
      excluirBaralho: jest.fn().mockResolvedValue(undefined),
    };
    cartasServiceMock = {
      buscarCartas: jest.fn().mockResolvedValue({ cartas: [], total: 0 }),
      buscarCartasPossuidas: jest.fn().mockResolvedValue({ cartas: [], total: 0 }),
      buscarImpressoesPorCarta: jest.fn().mockResolvedValue([]),
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

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('Baralho não encontrado');
  });

  it('shows an error when the deck does not exist', async () => {
    baralhosServiceMock.buscarBaralhoPorId.mockResolvedValue(null);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('Baralho não encontrado');
  });

  it('shows the commander picker instead of the deck list when there is no commander yet', async () => {
    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Escolha o comandante');
    expect(fixture.nativeElement.querySelector('.coluna-itens')).toBeNull();
  });

  it('calls definirComandante and reloads when a commander is chosen', async () => {
    baralhosServiceMock.listarCartas.mockResolvedValueOnce([]).mockResolvedValueOnce([comandanteExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();

    const instancia = fixture.componentInstance;
    const carta = cartaExemplo({ oracle_id: 'oc1', type_line: 'Legendary Creature — Human Shaman' });
    await instancia.aoDefinirComandante({ carta, printingId: 'p1' });
    fixture.detectChanges();

    expect(baralhosServiceMock.definirComandante).toHaveBeenCalledWith('d1', carta, 'p1');
    expect(fixture.nativeElement.textContent).toContain('Karador');
  });

  it('shows the commander panel and deck-building search once a commander is set', async () => {
    baralhosServiceMock.listarCartas.mockResolvedValue([comandanteExemplo(), itemExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Karador');
    expect(fixture.nativeElement.textContent).toContain('Lightning Bolt');
    expect(fixture.nativeElement.textContent).toContain('1/99');
  });

  it('calls adicionarCarta with the commander color identity and reloads', async () => {
    baralhosServiceMock.listarCartas.mockResolvedValue([comandanteExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const instancia = fixture.componentInstance;
    const carta = cartaExemplo();
    await instancia.aoAdicionarCarta({ carta, printingId: null });

    expect(baralhosServiceMock.adicionarCarta).toHaveBeenCalledWith('d1', carta, null, ['B', 'G', 'W']);
  });

  it('shows the error message when adding a card fails (e.g. color identity or singleton violation)', async () => {
    baralhosServiceMock.listarCartas.mockResolvedValue([comandanteExemplo()]);
    baralhosServiceMock.adicionarCarta.mockRejectedValue(
      new Error('Esta carta está fora da identidade de cor do comandante.'),
    );

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const instancia = fixture.componentInstance;
    await instancia.aoAdicionarCarta({ carta: cartaExemplo(), printingId: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('fora da identidade de cor');
  });

  it('calls removerComandante after confirmation when "Trocar comandante" is clicked', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    baralhosServiceMock.listarCartas.mockResolvedValue([comandanteExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const botao = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Trocar comandante',
    ) as HTMLButtonElement;
    botao.click();
    await fixture.whenStable();

    expect(baralhosServiceMock.removerComandante).toHaveBeenCalledWith('d1');
  });

  it('calls removerUmaCopia and reloads the item list when Remove is clicked', async () => {
    baralhosServiceMock.listarCartas.mockResolvedValueOnce([comandanteExemplo(), itemExemplo()]);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    baralhosServiceMock.listarCartas.mockResolvedValueOnce([comandanteExemplo()]);
    const botaoRemover = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Remover',
    ) as HTMLButtonElement;
    botaoRemover.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(baralhosServiceMock.removerUmaCopia).toHaveBeenCalledWith('i1');
  });

  it('opens the edit modal when Edit is clicked', async () => {
    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const botaoEditar = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Editar',
    ) as HTMLButtonElement;
    botaoEditar.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-modal-baralho')).not.toBeNull();
  });

  it('deletes the deck after confirmation and navigates back to the list', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');

    const botaoExcluir = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Excluir',
    ) as HTMLButtonElement;
    botaoExcluir.click();
    await fixture.whenStable();

    expect(baralhosServiceMock.excluirBaralho).toHaveBeenCalledWith('d1');
    expect(navigateSpy).toHaveBeenCalledWith(['/baralhos']);
  });

  it('does not delete when the confirmation is dismissed', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    const fixture = await criarFixture();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const botaoExcluir = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Excluir',
    ) as HTMLButtonElement;
    botaoExcluir.click();

    expect(baralhosServiceMock.excluirBaralho).not.toHaveBeenCalled();
  });
});
