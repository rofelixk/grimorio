import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Colecao } from './colecao';
import { ColecoesService } from '@shared/services';
import { IColecao } from '@shared/interfaces';

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
    excluirColecao: jest.Mock;
    buscarCartasEmColecoes: jest.Mock;
  };

  beforeEach(async () => {
    colecoesServiceMock = {
      listarColecoes: jest.fn().mockResolvedValue([]),
      excluirColecao: jest.fn().mockResolvedValue(undefined),
      buscarCartasEmColecoes: jest.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [Colecao],
      providers: [
        provideRouter([]),
        { provide: ColecoesService, useValue: colecoesServiceMock },
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

    expect(fixture.nativeElement.textContent).toContain("don't have any collections");
  });

  it('opens the create modal when "Add collection" is clicked', () => {
    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();

    const botao = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Add collection',
    ) as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-modal-colecao')).not.toBeNull();
  });

  it('deletes a collection after confirmation and refreshes the list', async () => {
    colecoesServiceMock.listarColecoes.mockResolvedValue([colecaoExemplo()]);
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    colecoesServiceMock.listarColecoes.mockResolvedValue([]);
    await fixture.componentInstance.excluir(colecaoExemplo());
    fixture.detectChanges();

    expect(colecoesServiceMock.excluirColecao).toHaveBeenCalledWith('1');
    expect(fixture.nativeElement.textContent).toContain("don't have any collections");
  });

  it('does not delete when the confirmation is dismissed', async () => {
    colecoesServiceMock.listarColecoes.mockResolvedValue([colecaoExemplo()]);
    jest.spyOn(window, 'confirm').mockReturnValue(false);

    const fixture = TestBed.createComponent(Colecao);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const botaoExcluir = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Delete',
    ) as HTMLButtonElement;
    botaoExcluir.click();

    expect(colecoesServiceMock.excluirColecao).not.toHaveBeenCalled();
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
        'at least 3 characters',
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

      expect(fixture.nativeElement.textContent).toContain('No matches.');
    });
  });
});
