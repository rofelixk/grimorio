import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Inicio } from './inicio';
import { CartasService, PaginaDeCartas, TAMANHO_PAGINA_BUSCA } from '@shared/services';
import { ICarta } from '@shared/interfaces';

describe('Inicio', () => {
  let cartasServiceMock: { buscarCartas: jest.Mock };

  beforeEach(async () => {
    cartasServiceMock = { buscarCartas: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Inicio);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows no validation message before the first search attempt', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).toBeNull();
  });

  it('shows a validation message when searching with fewer than 3 characters, and does not call the service', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };

    instancia.estado.termo.set('as');
    instancia.buscar();
    fixture.detectChanges();

    const mensagem = fixture.nativeElement.querySelector('.erro-validacao');
    expect(mensagem?.textContent).toContain('at least 3 characters');
    expect(cartasServiceMock.buscarCartas).not.toHaveBeenCalled();
  });

  it('updates the validation message live once a first search attempt has happened', () => {
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };

    instancia.estado.termo.set('a');
    instancia.buscar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).not.toBeNull();

    instancia.estado.termo.set('ash');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).toBeNull();
  });

  it('disables the search button while loading and calls the service with the typed term, field and first page', async () => {
    let resolverPromessa!: (valor: PaginaDeCartas) => void;
    cartasServiceMock.buscarCartas.mockReturnValue(
      new Promise<PaginaDeCartas>((resolve) => (resolverPromessa = resolve)),
    );

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    instancia.estado.termo.set('ash');

    const promessaBusca = instancia.buscar();
    fixture.detectChanges();

    const botaoBuscar = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Search',
    ) as HTMLButtonElement;
    expect(botaoBuscar.disabled).toBe(true);
    expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name', 1);

    resolverPromessa({ cartas: [], total: 0 });
    await promessaBusca;
    fixture.detectChanges();
    expect(botaoBuscar.disabled).toBe(false);
  });

  it('renders one Cartao per result on success', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1'), cartaExemplo('2')],
      total: 2,
    });

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-cartao').length).toBe(2);
  });

  it('shows "No results." when the search returns an empty array', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    instancia.estado.termo.set('zzz');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results.');
  });

  it('shows the error message when the search fails', async () => {
    cartasServiceMock.buscarCartas.mockRejectedValue(
      new Error('permission denied for table cards'),
    );

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    const erro = fixture.nativeElement.querySelector('.erro');
    expect(erro?.textContent).toContain('permission denied for table cards');
  });

  it('does not show pagination controls when everything fits on one page', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total: 1,
    });

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.paginacao')).toBeNull();
  });

  it('paginates: Previous is disabled on page 1, Next fetches the next page', async () => {
    const total = TAMANHO_PAGINA_BUSCA * 2 + 1;
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total,
    });

    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    const botoes = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.paginacao button')) as HTMLButtonElement[];
    const [anterior, proxima] = botoes();
    expect(anterior.disabled).toBe(true);
    expect(proxima.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.paginacao span').textContent).toContain(
      'Page 1 of 3',
    );

    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('2')],
      total,
    });
    proxima.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(cartasServiceMock.buscarCartas).toHaveBeenLastCalledWith('ash', 'name', 2);
    expect(botoes()[0].disabled).toBe(false);
  });

  it('keeps the previous search results when the component is recreated (returning from a card page)', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total: 1,
    });

    const primeiraFixture = TestBed.createComponent(Inicio);
    primeiraFixture.detectChanges();
    const primeiraInstancia = primeiraFixture.componentInstance as unknown as {
      estado: { termo: { set(v: string): void } };
      buscar(): Promise<void>;
    };
    primeiraInstancia.estado.termo.set('ash');
    await primeiraInstancia.buscar();
    primeiraFixture.destroy();

    const segundaFixture = TestBed.createComponent(Inicio);
    segundaFixture.detectChanges();

    expect(segundaFixture.nativeElement.querySelectorAll('app-cartao').length).toBe(1);
  });
});

function cartaExemplo(id: string): ICarta.Detalhes {
  return {
    oracle_id: id,
    name: 'Carta de teste',
    mana_cost: '{1}',
    mana_value: 1,
    type_line: 'Creature',
    oracle_text: null,
    color_identity: [],
    power: null,
    toughness: null,
    loyalty: null,
    layout: 'normal',
    commander_legality: 'legal',
    image_url: null,
    card_faces: null,
  };
}
