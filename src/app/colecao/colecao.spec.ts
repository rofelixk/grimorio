import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Colecao } from './colecao';
import { ColecoesService, LeitorDeCartaService, ResultadoLeituraCarta } from '@shared/services';
import { IColecao } from '@shared/interfaces';

function eventoComArquivo(foto: Blob | null): Event {
  const input = document.createElement('input');
  input.type = 'file';
  if (foto) {
    Object.defineProperty(input, 'files', { value: [foto], configurable: true });
  }
  return { target: input } as unknown as Event;
}

function colecaoExemplo(sobrescritas: Partial<IColecao.Detalhes> = {}): IColecao.Detalhes {
  return {
    id: '1',
    user_id: 'u1',
    name: 'Binder',
    color: 'azul',
    created_at: '2026-01-01',
    ...sobrescritas,
  };
}

function itemBuscaExemplo(sobrescritas: Partial<IColecao.ItemEmColecao> = {}): IColecao.ItemEmColecao {
  return {
    id: 'i1',
    oracle_id: 'o1',
    updated_at: '2026-01-02',
    nome: 'Lightning Bolt',
    tipo: 'Instant',
    imagem_url: 'https://img/bolt.jpg',
    colecao_id: '1',
    colecao_nome: 'Binder',
    colecao_cor: 'azul',
    ...sobrescritas,
  };
}

describe('Colecao', () => {
  let colecoesServiceMock: {
    listarColecoes: jest.Mock;
    buscarCartasEmColecoes: jest.Mock;
  };
  let leitorDeCartaMock: {
    marcarEscaneamentoIniciado: jest.Mock;
    consumirEscaneamentoPendente: jest.Mock;
    lerFoto: jest.Mock;
  };

  beforeEach(async () => {
    colecoesServiceMock = {
      listarColecoes: jest.fn().mockResolvedValue([]),
      buscarCartasEmColecoes: jest.fn().mockResolvedValue([]),
    };
    leitorDeCartaMock = {
      marcarEscaneamentoIniciado: jest.fn(),
      consumirEscaneamentoPendente: jest.fn().mockReturnValue(false),
      lerFoto: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Colecao],
      providers: [
        provideRouter([]),
        { provide: ColecoesService, useValue: colecoesServiceMock },
        { provide: LeitorDeCartaService, useValue: leitorDeCartaMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Colecao);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('lists the user collections on init', async () => {
    colecoesServiceMock.listarColecoes.mockResolvedValue([colecaoExemplo()]);

    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Binder');
  });

  it('shows a message when there are no collections', async () => {
    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('não tem nenhuma coleção');
  });

  it('opens the create modal when "Add collection" is clicked', () => {
    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();

    const botao = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Adicionar coleção',
    ) as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-modal-colecao')).not.toBeNull();
  });

  it('does not show Edit/Delete on the collections grid — those live on the collection detail screen', async () => {
    colecoesServiceMock.listarColecoes.mockResolvedValue([colecaoExemplo()]);

    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).not.toContain('Editar');
    expect(labels).not.toContain('Excluir');
  });

  describe('card search', () => {
    function digitarTermoBusca(fixture: ReturnType<typeof TestBed.createComponent>, valor: string): void {
      const input = fixture.nativeElement.querySelector(
        '.coluna-busca-carta input',
      ) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    it('shows a validation message and does not call the service when searching with fewer than 3 characters', async () => {
      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      digitarTermoBusca(fixture, 'bo');
      await fixture.componentInstance.buscarCarta();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.erro-validacao')?.textContent).toContain(
        'pelo menos 3 caracteres',
      );
      expect(colecoesServiceMock.buscarCartasEmColecoes).not.toHaveBeenCalled();
    });

    it('does not search just from typing, only when buscarCarta runs', () => {
      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      digitarTermoBusca(fixture, 'bolt');

      expect(colecoesServiceMock.buscarCartasEmColecoes).not.toHaveBeenCalled();
    });

    it('searches by name by default and shows the matching cards, their type, collection and update date', async () => {
      colecoesServiceMock.buscarCartasEmColecoes.mockResolvedValue([itemBuscaExemplo()]);

      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      digitarTermoBusca(fixture, 'bolt');
      await fixture.componentInstance.buscarCarta();
      fixture.detectChanges();

      expect(colecoesServiceMock.buscarCartasEmColecoes).toHaveBeenCalledWith('bolt', 'name');
      const texto = fixture.nativeElement.textContent;
      expect(texto).toContain('Lightning Bolt');
      expect(texto).toContain('Instant');
      expect(texto).toContain('Binder');
      expect(fixture.nativeElement.querySelector('.imagem')?.getAttribute('src')).toBe(
        'https://img/bolt.jpg',
      );
    });

    it('searches by the chosen field when the select is changed', async () => {
      colecoesServiceMock.buscarCartasEmColecoes.mockResolvedValue([itemBuscaExemplo()]);

      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      const select = fixture.nativeElement.querySelector('.coluna-busca-carta select') as HTMLSelectElement;
      select.value = 'type_line';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      digitarTermoBusca(fixture, 'instant');
      await fixture.componentInstance.buscarCarta();

      expect(colecoesServiceMock.buscarCartasEmColecoes).toHaveBeenCalledWith('instant', 'type_line');
    });

    it('highlights the matched text in the name', async () => {
      colecoesServiceMock.buscarCartasEmColecoes.mockResolvedValue([itemBuscaExemplo()]);

      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      digitarTermoBusca(fixture, 'bolt');
      await fixture.componentInstance.buscarCarta();
      fixture.detectChanges();

      const marcado = fixture.nativeElement.querySelector('.resultados-busca-carta .nome mark');
      expect(marcado?.textContent).toBe('Bolt');
    });

    it('shows "No matches." when nothing is found', async () => {
      colecoesServiceMock.buscarCartasEmColecoes.mockResolvedValue([]);

      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      digitarTermoBusca(fixture, 'zzz');
      await fixture.componentInstance.buscarCarta();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Nenhum resultado.');
    });
  });

  describe('scan button', () => {
    it('clicking the camera button opens the native camera picker', () => {
      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      const botaoCamera = fixture.nativeElement.querySelector(
        '[aria-label="Escanear carta com a câmera"]',
      ) as HTMLButtonElement;
      const inputArquivo = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
      const cliqueSpy = jest.spyOn(inputArquivo, 'click');

      botaoCamera.click();

      expect(leitorDeCartaMock.marcarEscaneamentoIniciado).toHaveBeenCalled();
      expect(cliqueSpy).toHaveBeenCalled();
    });

    it('on a successful scan, fills the name field with the card name and searches — showing the same list as a normal search', async () => {
      const resultadoSucesso: ResultadoLeituraCarta = {
        tipo: 'sucesso',
        resultado: { carta: { oracle_id: 'o1', name: 'Lightning Bolt' } as never, printingId: 'p1' },
        debug: [],
      };
      leitorDeCartaMock.lerFoto.mockResolvedValue(resultadoSucesso);
      colecoesServiceMock.buscarCartasEmColecoes.mockResolvedValue([itemBuscaExemplo()]);

      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      await fixture.componentInstance.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
      fixture.detectChanges();

      expect(colecoesServiceMock.buscarCartasEmColecoes).toHaveBeenCalledWith('Lightning Bolt', 'name');
      expect(fixture.nativeElement.querySelector('.coluna-busca-carta input').value).toBe(
        'Lightning Bolt',
      );
      expect(fixture.nativeElement.textContent).toContain('Lightning Bolt');
    });

    it('on a failed scan, shows the error message and does not search', async () => {
      leitorDeCartaMock.lerFoto.mockResolvedValue({
        tipo: 'erro',
        mensagem: 'Não consegui ler o número da carta e o código do set.',
        debug: [],
      } satisfies ResultadoLeituraCarta);

      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      await fixture.componentInstance.aoSelecionarFoto(eventoComArquivo(new Blob(['x'])));
      fixture.detectChanges();

      expect(colecoesServiceMock.buscarCartasEmColecoes).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
        'Não consegui ler o número da carta',
      );
    });

    it('does nothing when no photo was picked', async () => {
      const fixture = TestBed.createComponent(Colecao);
      fixture.detectChanges();

      await fixture.componentInstance.aoSelecionarFoto(eventoComArquivo(null));

      expect(leitorDeCartaMock.lerFoto).not.toHaveBeenCalled();
    });
  });
});
