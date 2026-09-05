import { TestBed } from '@angular/core/testing';
import { ModalBaralho } from './modal-baralho';
import { BaralhosService } from '@shared/services';
import { IBaralho } from '@shared/interfaces';

function baralhoExemplo(): IBaralho.Detalhes {
  return { id: '1', user_id: 'u1', name: 'Reanimator', commander_oracle_id: null, format: 'commander', created_at: '2026-01-01' };
}

describe('ModalBaralho', () => {
  let baralhosServiceMock: { criarBaralho: jest.Mock; atualizarBaralho: jest.Mock };

  beforeEach(async () => {
    baralhosServiceMock = {
      criarBaralho: jest.fn(),
      atualizarBaralho: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ModalBaralho],
      providers: [{ provide: BaralhosService, useValue: baralhosServiceMock }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ModalBaralho);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts with an empty name in create mode', () => {
    const fixture = TestBed.createComponent(ModalBaralho);
    fixture.detectChanges();

    const instancia = fixture.componentInstance as unknown as { nome: { (): string } };
    expect(instancia.nome()).toBe('');
  });

  it('prefills the name when editing an existing deck', () => {
    const fixture = TestBed.createComponent(ModalBaralho);
    fixture.componentRef.setInput('baralho', baralhoExemplo());
    fixture.detectChanges();

    const instancia = fixture.componentInstance as unknown as { nome: { (): string } };
    expect(instancia.nome()).toBe('Reanimator');
  });

  it('calls criarBaralho and emits the created deck when there is no baralho input', async () => {
    baralhosServiceMock.criarBaralho.mockResolvedValue(baralhoExemplo());

    const fixture = TestBed.createComponent(ModalBaralho);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      nome: { set(v: string): void };
      salvar(): Promise<void>;
      salvo: { subscribe(fn: (d: IBaralho.Detalhes) => void): void };
    };

    const emitido = jest.fn();
    instancia.salvo.subscribe(emitido);

    instancia.nome.set('Reanimator');
    await instancia.salvar();

    expect(baralhosServiceMock.criarBaralho).toHaveBeenCalledWith('Reanimator');
    expect(emitido).toHaveBeenCalledWith(baralhoExemplo());
  });

  it('calls atualizarBaralho and emits the updated deck when editing', async () => {
    const atualizado = { ...baralhoExemplo(), name: 'Aristocrats' };
    baralhosServiceMock.atualizarBaralho.mockResolvedValue(atualizado);

    const fixture = TestBed.createComponent(ModalBaralho);
    fixture.componentRef.setInput('baralho', baralhoExemplo());
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as {
      nome: { set(v: string): void };
      salvar(): Promise<void>;
      salvo: { subscribe(fn: (d: IBaralho.Detalhes) => void): void };
    };

    const emitido = jest.fn();
    instancia.salvo.subscribe(emitido);

    instancia.nome.set('Aristocrats');
    await instancia.salvar();

    expect(baralhosServiceMock.atualizarBaralho).toHaveBeenCalledWith('1', 'Aristocrats');
    expect(emitido).toHaveBeenCalledWith(atualizado);
  });

  it('shows the error message when saving fails', async () => {
    baralhosServiceMock.criarBaralho.mockRejectedValue(new Error('permission denied'));

    const fixture = TestBed.createComponent(ModalBaralho);
    fixture.detectChanges();
    const instancia = fixture.componentInstance as unknown as { salvar(): Promise<void> };
    await instancia.salvar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain('permission denied');
  });
});
