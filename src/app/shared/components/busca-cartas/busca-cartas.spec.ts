import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BuscaCartas } from './busca-cartas';
import { CartasService, PaginaDeCartas, TAMANHO_PAGINA_BUSCA } from '@shared/services';
import { ICarta } from '@shared/interfaces';

type InstanciaTestavel = {
  estado: { termo: { set(v: string): void } };
  buscar(): Promise<void>;
  adicionarCarta: { subscribe(fn: (carta: ICarta.Detalhes) => void): void };
};

describe('BuscaCartas', () => {
  let cartasServiceMock: { buscarCartas: jest.Mock };

  beforeEach(async () => {
    cartasServiceMock = { buscarCartas: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [BuscaCartas],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
      ],
    }).compileComponents();
  });

  function criarFixture(chave = 'teste') {
    const fixture = TestBed.createComponent(BuscaCartas);
    fixture.componentRef.setInput('chave', chave);
    return fixture;
  }

  function instanciaDe(fixture: ReturnType<typeof criarFixture>): InstanciaTestavel {
    return fixture.componentInstance as unknown as InstanciaTestavel;
  }

  it('should create', () => {
    const fixture = criarFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows no validation message before the first search attempt', () => {
    const fixture = criarFixture();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.erro-validacao')).toBeNull();
  });

  it('shows a validation message when searching with fewer than 3 characters, and does not call the service', () => {
    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);

    instancia.estado.termo.set('as');
    instancia.buscar();
    fixture.detectChanges();

    const mensagem = fixture.nativeElement.querySelector('.erro-validacao');
    expect(mensagem?.textContent).toContain('at least 3 characters');
    expect(cartasServiceMock.buscarCartas).not.toHaveBeenCalled();
  });

  it('disables the search button while loading and calls the service with the typed term, field and first page', async () => {
    let resolverPromessa!: (valor: PaginaDeCartas) => void;
    cartasServiceMock.buscarCartas.mockReturnValue(
      new Promise<PaginaDeCartas>((resolve) => (resolverPromessa = resolve)),
    );

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');

    const promessaBusca = instancia.buscar();
    fixture.detectChanges();

    const botaoBuscar = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Search',
    ) as HTMLButtonElement;
    expect(botaoBuscar.disabled).toBe(true);
    expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name', 1, 25);

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

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-cartao').length).toBe(2);
  });

  it('shows "No results." when the search returns an empty array', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('zzz');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No results.');
  });

  it('shows the error message when the search fails', async () => {
    cartasServiceMock.buscarCartas.mockRejectedValue(
      new Error('permission denied for table cards'),
    );

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
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

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
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

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
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

    expect(cartasServiceMock.buscarCartas).toHaveBeenLastCalledWith('ash', 'name', 2, 25);
    expect(botoes()[0].disabled).toBe(false);
  });

  it('keeps the previous search results when the component is recreated with the same chave (returning from a card page)', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total: 1,
    });

    const primeiraFixture = criarFixture('pagina-a');
    primeiraFixture.detectChanges();
    const primeiraInstancia = instanciaDe(primeiraFixture);
    primeiraInstancia.estado.termo.set('ash');
    await primeiraInstancia.buscar();
    primeiraFixture.destroy();

    const segundaFixture = criarFixture('pagina-a');
    segundaFixture.detectChanges();

    expect(segundaFixture.nativeElement.querySelectorAll('app-cartao').length).toBe(1);
  });

  it('does not share search state between two different chave values', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total: 1,
    });

    const fixtureA = criarFixture('pagina-a');
    fixtureA.detectChanges();
    const instanciaA = instanciaDe(fixtureA);
    instanciaA.estado.termo.set('ash');
    await instanciaA.buscar();

    const fixtureB = criarFixture('pagina-b');
    fixtureB.detectChanges();

    expect(fixtureB.nativeElement.querySelectorAll('app-cartao').length).toBe(0);
  });

  it('does not show an add button per card by default', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total: 1,
    });

    const fixture = criarFixture();
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.botao-adicionar')).toBeNull();
  });

  it('shows an add button per card when mostrarBotaoAdicionar is set, and emits adicionarCarta on click', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1')],
      total: 1,
    });

    const fixture = criarFixture();
    fixture.componentRef.setInput('mostrarBotaoAdicionar', true);
    fixture.componentRef.setInput('rotuloBotaoAdicionar', 'Add to collection');
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    const emitido = jest.fn();
    instancia.adicionarCarta.subscribe(emitido);

    const botao = fixture.nativeElement.querySelector('.botao-adicionar') as HTMLButtonElement;
    expect(botao.textContent).toContain('Add to collection');
    botao.click();

    expect(emitido).toHaveBeenCalledWith(cartaExemplo('1'));
  });

  describe('page size', () => {
    afterEach(() => {
      // @ts-expect-error -- limpa o mock de matchMedia entre testes
      delete window.matchMedia;
    });

    function simularMatchMedia(coincideComMobile: boolean): void {
      window.matchMedia = jest.fn().mockReturnValue({ matches: coincideComMobile }) as unknown as (
        query: string,
      ) => MediaQueryList;
    }

    it('fetches a page size matching the desktop `colunas` input (default 5 -> 25)', async () => {
      cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });
      simularMatchMedia(false);

      const fixture = criarFixture();
      fixture.detectChanges();
      const instancia = instanciaDe(fixture);
      instancia.estado.termo.set('ash');
      await instancia.buscar();

      expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name', 1, 25);
    });

    it('fetches a page size matching a custom `colunas` input (4 -> 24)', async () => {
      cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });
      simularMatchMedia(false);

      const fixture = criarFixture();
      fixture.componentRef.setInput('colunas', 4);
      fixture.detectChanges();
      const instancia = instanciaDe(fixture);
      instancia.estado.termo.set('ash');
      await instancia.buscar();

      expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name', 1, 24);
    });

    it('fetches a page size matching `colunasMobile` when the mobile breakpoint is active (2 -> 20)', async () => {
      cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });
      simularMatchMedia(true);

      const fixture = criarFixture();
      fixture.detectChanges();
      const instancia = instanciaDe(fixture);
      instancia.estado.termo.set('ash');
      await instancia.buscar();

      expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name', 1, 20);
    });

    it('computes totalPaginas from the page size actually used in the last search', async () => {
      cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [cartaExemplo('1')], total: 41 });
      simularMatchMedia(true);

      const fixture = criarFixture();
      fixture.detectChanges();
      const instancia = instanciaDe(fixture);
      instancia.estado.termo.set('ash');
      await instancia.buscar();
      fixture.detectChanges();

      // 41 resultados / 20 por página (mobile) = 3 páginas
      expect(fixture.nativeElement.textContent).toContain('Page 1 of 3');
    });
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
