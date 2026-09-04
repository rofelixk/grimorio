import { TestBed } from '@angular/core/testing';
import { ModalColecao } from './modal-colecao';
import { ColecoesService } from '@shared/services';
import { IColecao } from '@shared/interfaces';
import { PALETA_CORES_COLECAO } from '@shared/constants';

function colecaoExemplo(): IColecao.Detalhes {
  return { id: '1', user_id: 'u1', name: 'Binder', color: 'verde', created_at: '2026-01-01' };
}

describe('ModalColecao', () => {
  let colecoesServiceMock: { criarColecao: jest.Mock; atualizarColecao: jest.Mock };

  beforeEach(async () => {
    colecoesServiceMock = {
      criarColecao: jest.fn(),
      atualizarColecao: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ModalColecao],
      providers: [{ provide: ColecoesService, useValue: colecoesServiceMock }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ModalColecao);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts with the first palette color selected and empty name in create mode', () => {
    const fixture = TestBed.createComponent(ModalColecao);
    fixture.detectChanges();

    const instancia = fixture.componentInstance as unknown as {
      nome: { (): string };
      cor: { (): string };
    };
    expect(instancia.nome()).toBe('');
    expect(instancia.cor()).toBe(PALETA_CORES_COLECAO[0].chave);
  });

  it('prefills name and color when editing an existing collection', () => {
    const fixture = TestBed.createComponent(ModalColecao);
    fixture.componentRef.setInput('colecao', colecaoExemplo());
    fixture.detectChanges();

    const instancia = fixture.componentInstance as unknown as {
      nome: { (): string };
      cor: { (): string };
    };
    expect(instancia.nome()).toBe('Binder');
    expect(instancia.cor()).toBe('verde');
  });

  it('calls criarColecao and emits the created collection when there is no colecao input', async () => {
    colecoesServiceMock.criarColecao.mockResolvedValue(colecaoExemplo());

    const fixture = TestBed.createComponent(ModalColecao);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      nome: { set(v: string): void };
      salvar(): Promise<void>;
      salvo: { subscribe(fn: (c: IColecao.Detalhes) => void): void };
    };

    const emitido = jest.fn();
    instancia.salvo.subscribe(emitido);

    instancia.nome.set('Binder');
    await instancia.salvar();

    expect(colecoesServiceMock.criarColecao).toHaveBeenCalledWith('Binder', PALETA_CORES_COLECAO[0].chave);
    expect(emitido).toHaveBeenCalledWith(colecaoExemplo());
  });

  it('calls atualizarColecao and emits the updated collection when editing', async () => {
    const atualizada = { ...colecaoExemplo(), name: 'Vault' };
    colecoesServiceMock.atualizarColecao.mockResolvedValue(atualizada);

    const fixture = TestBed.createComponent(ModalColecao);
    fixture.componentRef.setInput('colecao', colecaoExemplo());
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      nome: { set(v: string): void };
      salvar(): Promise<void>;
      salvo: { subscribe(fn: (c: IColecao.Detalhes) => void): void };
    };

    const emitido = jest.fn();
    instancia.salvo.subscribe(emitido);

    instancia.nome.set('Vault');
    await instancia.salvar();

    expect(colecoesServiceMock.atualizarColecao).toHaveBeenCalledWith('1', 'Vault', 'verde');
    expect(emitido).toHaveBeenCalledWith(atualizada);
  });

  it('shows the error message when saving fails', async () => {
    colecoesServiceMock.criarColecao.mockRejectedValue(new Error('permission denied'));

    const fixture = TestBed.createComponent(ModalColecao);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as { salvar(): Promise<void> };
    await instancia.salvar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('permission denied');
  });
});
