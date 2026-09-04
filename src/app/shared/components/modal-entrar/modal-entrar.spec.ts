import { TestBed } from '@angular/core/testing';
import { ModalEntrar } from './modal-entrar';
import { AutenticacaoService } from '@shared/services';

describe('ModalEntrar', () => {
  let autenticacaoServiceMock: { entrar: jest.Mock };

  beforeEach(async () => {
    autenticacaoServiceMock = { entrar: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ModalEntrar],
      providers: [{ provide: AutenticacaoService, useValue: autenticacaoServiceMock }],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ModalEntrar);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls the service and emits fechar on successful sign-in', async () => {
    autenticacaoServiceMock.entrar.mockResolvedValue(undefined);

    const fixture = TestBed.createComponent(ModalEntrar);
    fixture.detectChanges();
    const instancia = fixture.componentInstance;
    const emitido = jest.fn();
    instancia.fechar.subscribe(emitido);

    (instancia as unknown as { email: { set(v: string): void } }).email.set('ash@example.com');
    (instancia as unknown as { senha: { set(v: string): void } }).senha.set('senha123');
    await instancia.entrar();

    expect(autenticacaoServiceMock.entrar).toHaveBeenCalledWith('ash@example.com', 'senha123');
    expect(emitido).toHaveBeenCalled();
  });

  it('shows the error message and does not emit fechar on failure', async () => {
    autenticacaoServiceMock.entrar.mockRejectedValue(new Error('Invalid login credentials'));

    const fixture = TestBed.createComponent(ModalEntrar);
    fixture.detectChanges();
    const instancia = fixture.componentInstance;
    const emitido = jest.fn();
    instancia.fechar.subscribe(emitido);

    await instancia.entrar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
      'Invalid login credentials',
    );
    expect(emitido).not.toHaveBeenCalled();
  });
});
