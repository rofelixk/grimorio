import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BuscaCartas } from './busca-cartas';
import {
  ATRASO_ENTRE_ETAPAS_LEITURA_MS,
  CartasService,
  PaginaDeCartas,
  TAMANHO_PAGINA_BUSCA,
} from '@shared/services';
import { ICarta } from '@shared/interfaces';

jest.mock('tesseract.js', () => ({ recognize: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { recognize } = jest.requireMock('tesseract.js') as { recognize: jest.Mock };

type InstanciaTestavel = {
  estado: { termo: { set(v: string): void } };
  buscar(): Promise<void>;
  adicionarCarta: {
    subscribe(fn: (evento: { carta: ICarta.Detalhes; printingId: string | null }) => void): void;
  };
  abrirCamera(): void;
  aoSelecionarFoto(evento: Event): Promise<void>;
};

function eventoComArquivo(foto: Blob | null): Event {
  const input = document.createElement('input');
  input.type = 'file';
  if (foto) {
    Object.defineProperty(input, 'files', { value: [foto], configurable: true });
  }
  return { target: input } as unknown as Event;
}

describe('BuscaCartas', () => {
  let cartasServiceMock: {
    buscarCartas: jest.Mock;
    buscarCartasPossuidas: jest.Mock;
    buscarCartaPorImpressao: jest.Mock;
    buscarImpressoesPorCarta: jest.Mock;
  };

  beforeEach(async () => {
    cartasServiceMock = {
      buscarCartas: jest.fn(),
      buscarCartasPossuidas: jest.fn(),
      buscarCartaPorImpressao: jest.fn(),
      buscarImpressoesPorCarta: jest.fn(),
    };
    recognize.mockReset();

    await TestBed.configureTestingModule({
      imports: [BuscaCartas],
      providers: [
        provideRouter([]),
        { provide: CartasService, useValue: cartasServiceMock },
        // Sem isso, cada scan bem-sucedido perde ~800ms reais de teste (ver
        // aguardarRespiro em leitor-de-carta.service.ts).
        { provide: ATRASO_ENTRE_ETAPAS_LEITURA_MS, useValue: 0 },
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
    expect(mensagem?.textContent).toContain('pelo menos 3 caracteres');
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
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Buscar',
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

    expect(fixture.nativeElement.textContent).toContain('Nenhum resultado.');
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
      'Página 1 de 3',
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
    fixture.componentRef.setInput('rotuloBotaoAdicionar', 'Adicionar à coleção');
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    const emitido = jest.fn();
    instancia.adicionarCarta.subscribe(emitido);

    const botao = fixture.nativeElement.querySelector('.botao-adicionar') as HTMLButtonElement;
    expect(botao.textContent).toContain('Adicionar à coleção');
    botao.click();

    expect(emitido).toHaveBeenCalledWith({ carta: cartaExemplo('1'), printingId: null });
  });

  it('passes identidadeCor through to buscarCartas when given', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });

    const fixture = criarFixture();
    fixture.componentRef.setInput('identidadeCor', ['G', 'W']);
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();

    expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('ash', 'name', 1, 25, ['G', 'W']);
  });

  it('hides results that fail filtroElegibilidade', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({
      cartas: [cartaExemplo('1'), cartaExemplo('2')],
      total: 2,
    });

    const fixture = criarFixture();
    fixture.componentRef.setInput('filtroElegibilidade', (carta: ICarta.Detalhes) => carta.oracle_id === '1');
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-cartao').length).toBe(1);
  });

  it('calls buscarCartasPossuidas instead of buscarCartas when the "somente minha coleção" toggle is checked', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });
    cartasServiceMock.buscarCartasPossuidas.mockResolvedValue({ cartas: [], total: 0 });

    const fixture = criarFixture();
    fixture.componentRef.setInput('permitirFiltroPossuidas', true);
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    expect(cartasServiceMock.buscarCartas).toHaveBeenCalled();
    expect(cartasServiceMock.buscarCartasPossuidas).not.toHaveBeenCalled();

    const toggle = fixture.nativeElement.querySelector(
      '.filtro-possuidas input[type="checkbox"]',
    ) as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(cartasServiceMock.buscarCartasPossuidas).toHaveBeenCalledWith('ash', 'name', 1, 25);
  });

  it('does not show the "somente minha coleção" toggle unless permitirFiltroPossuidas is set', () => {
    const fixture = criarFixture();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.filtro-possuidas')).toBeNull();
  });

  it('opens the printing picker instead of emitting immediately when pedirImpressao is set, then emits with the chosen printing', async () => {
    cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [cartaExemplo('1')], total: 1 });
    cartasServiceMock.buscarImpressoesPorCarta.mockResolvedValue([
      { scryfall_id: 'p1', oracle_id: '1', set_code: 'lea', collector_number: '1', lang: 'en', image_url: null },
    ]);

    const fixture = criarFixture();
    fixture.componentRef.setInput('mostrarBotaoAdicionar', true);
    fixture.componentRef.setInput('pedirImpressao', true);
    fixture.detectChanges();
    const instancia = instanciaDe(fixture);
    instancia.estado.termo.set('ash');
    await instancia.buscar();
    fixture.detectChanges();

    const emitido = jest.fn();
    instancia.adicionarCarta.subscribe(emitido);

    const botaoAdicionar = fixture.nativeElement.querySelector('.botao-adicionar') as HTMLButtonElement;
    botaoAdicionar.click();
    fixture.detectChanges();
    expect(emitido).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-seletor-impressao')).not.toBeNull();

    await fixture.whenStable();
    fixture.detectChanges();

    const botoesImpressao = fixture.nativeElement.querySelectorAll(
      '.lista-impressoes button',
    ) as NodeListOf<HTMLButtonElement>;
    botoesImpressao[1].click();

    expect(emitido).toHaveBeenCalledWith({ carta: cartaExemplo('1'), printingId: 'p1' });
  });

  describe('scan button', () => {
    const CHAVE_ESCANEAMENTO_PENDENTE = 'grimorio:escaneamento-pendente';

    beforeEach(() => {
      // jsdom não implementa createImageBitmap/canvas 2D; reduzirFotoParaOcr
      // só usa isso pra reamostrar a imagem, o que os testes não verificam.
      (global as unknown as { createImageBitmap: jest.Mock }).createImageBitmap = jest
        .fn()
        .mockResolvedValue({ width: 100, height: 100, close: jest.fn() });
      HTMLCanvasElement.prototype.getContext = jest
        .fn()
        .mockReturnValue({ drawImage: jest.fn() }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it('shows the camera button by default, and clicking it opens the native camera picker', () => {
      const fixture = criarFixture();
      fixture.detectChanges();

      const botaoCamera = fixture.nativeElement.querySelector(
        '[aria-label="Escanear carta com a câmera"]',
      ) as HTMLButtonElement;
      expect(botaoCamera).not.toBeNull();

      const inputArquivo = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
      expect(inputArquivo.accept).toBe('image/*');
      expect(inputArquivo.getAttribute('capture')).toBe('environment');
      const cliqueSpy = jest.spyOn(inputArquivo, 'click');

      botaoCamera.click();

      expect(cliqueSpy).toHaveBeenCalled();
    });

    it('hides the camera button when mostrarBotaoCamera is set to false', () => {
      const fixture = criarFixture();
      fixture.componentRef.setInput('mostrarBotaoCamera', false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[aria-label="Escanear carta com a câmera"]')).toBeNull();
    });

    describe('recovering from a browser reload while the camera app is open', () => {
      it('marks a scan as pending in sessionStorage when the camera opens, and clears it if the tab regains focus (photo taken or cancelled)', () => {
        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        instancia.abrirCamera();
        expect(sessionStorage.getItem(CHAVE_ESCANEAMENTO_PENDENTE)).toBe('1');

        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(sessionStorage.getItem(CHAVE_ESCANEAMENTO_PENDENTE)).toBeNull();
      });

      it('shows an explanatory error on init when a scan was left pending from a previous (reloaded) session', () => {
        sessionStorage.setItem(CHAVE_ESCANEAMENTO_PENDENTE, '1');

        const fixture = criarFixture();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
          'A leitura foi interrompida',
        );
        expect(sessionStorage.getItem(CHAVE_ESCANEAMENTO_PENDENTE)).toBeNull();
      });

      it('does not show the interrupted-scan error when nothing was pending', () => {
        const fixture = criarFixture();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.erro')).toBeNull();
      });
    });

    describe('aoSelecionarFoto', () => {
      it('clears the pending-scan marker, since the tab clearly survived to run this', async () => {
        sessionStorage.setItem(CHAVE_ESCANEAMENTO_PENDENTE, '1');
        recognize.mockResolvedValue({ data: { text: 'Lightning Bolt' } });

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));

        expect(sessionStorage.getItem(CHAVE_ESCANEAMENTO_PENDENTE)).toBeNull();
      });

      it('reads the printing off the OCR text, fills the name field and searches — showing the same grid as a normal search', async () => {
        recognize.mockResolvedValue({ data: { text: '042/264 SLX' } });
        cartasServiceMock.buscarCartaPorImpressao.mockResolvedValue({
          carta: { oracle_id: 'abc', name: 'Lightning Bolt' },
          printingId: 'p1',
        });
        cartasServiceMock.buscarCartas.mockResolvedValue({
          cartas: [cartaExemplo('abc')],
          total: 1,
        });

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'], { type: 'image/jpeg' })));
        fixture.detectChanges();

        expect(recognize).toHaveBeenCalledWith(expect.anything(), 'eng');
        expect(cartasServiceMock.buscarCartaPorImpressao).toHaveBeenCalledWith('SLX', '042');
        expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('Lightning Bolt', 'name', 1, 25);
        expect(fixture.nativeElement.querySelectorAll('app-cartao').length).toBe(1);
      });

      it('tries combinations of scattered candidates until one matches, even when number and code are not adjacent', async () => {
        recognize.mockResolvedValue({
          data: { text: 'R 0423 FFXIV\n4 FIC «EN & DaviD' },
        });
        cartasServiceMock.buscarCartaPorImpressao.mockImplementation(
          async (codigo: string, numero: string) =>
            codigo === 'FIC' && numero === '0423'
              ? { carta: { oracle_id: 'abc', name: 'Card' }, printingId: 'p1' }
              : null,
        );
        cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
        fixture.detectChanges();

        expect(cartasServiceMock.buscarCartaPorImpressao).toHaveBeenCalledWith('FIC', '0423');
        expect(cartasServiceMock.buscarCartas).toHaveBeenCalledWith('Card', 'name', 1, 25);
      });

      it('shows a debug panel on screen with the raw OCR text, the parsed printing and the Supabase result', async () => {
        recognize.mockResolvedValue({ data: { text: '042/264 SLX' } });
        cartasServiceMock.buscarCartaPorImpressao.mockResolvedValue({
          carta: { oracle_id: 'abc', name: 'Card' },
          printingId: 'p1',
        });
        cartasServiceMock.buscarCartas.mockResolvedValue({ cartas: [], total: 0 });

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
        fixture.detectChanges();

        const debug = fixture.nativeElement.querySelector('.debug-scan')?.textContent;
        expect(debug).toContain('OCR bruto: "042/264 SLX"');
        expect(debug).toContain('Candidatos: números [042, 264], códigos [SLX]');
        expect(debug).toContain(
          'combinação "042/SLX" -> {"carta":{"oracle_id":"abc","name":"Card"},"printingId":"p1"}',
        );
      });

      it('does nothing when no photo was picked (e.g. the user cancelled)', async () => {
        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(null));

        expect(recognize).not.toHaveBeenCalled();
      });

      it('shows an error and does not search when the OCR text has no recognizable printing', async () => {
        recognize.mockResolvedValue({ data: { text: 'Lightning Bolt' } });

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
        fixture.detectChanges();

        expect(cartasServiceMock.buscarCartaPorImpressao).not.toHaveBeenCalled();
        expect(cartasServiceMock.buscarCartas).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('Não consegui ler');
      });

      it('shows an error and does not search when no printing matches', async () => {
        recognize.mockResolvedValue({ data: { text: '042/264 SLX' } });
        cartasServiceMock.buscarCartaPorImpressao.mockResolvedValue(null);

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
        fixture.detectChanges();

        expect(cartasServiceMock.buscarCartas).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
          'não encontrei nenhuma impressão',
        );
      });

      it('shows an error when OCR itself fails', async () => {
        recognize.mockRejectedValue(new Error('boom'));

        const fixture = criarFixture();
        fixture.detectChanges();
        const instancia = instanciaDe(fixture);

        await instancia.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
          'Falha ao processar a imagem.',
        );
        expect(fixture.nativeElement.querySelector('.debug-scan')?.textContent).toContain('Erro: boom');
      });
    });
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
      expect(fixture.nativeElement.textContent).toContain('Página 1 de 3');
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
