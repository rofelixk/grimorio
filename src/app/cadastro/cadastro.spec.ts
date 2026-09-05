import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { Cadastro } from './cadastro';
import { AutenticacaoService } from '@shared/services';

describe('Cadastro', () => {
  let autenticacaoServiceMock: { cadastrar: jest.Mock };

  beforeEach(async () => {
    autenticacaoServiceMock = { cadastrar: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [
        provideRouter([]),
        { provide: AutenticacaoService, useValue: autenticacaoServiceMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Cadastro);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('links the back button to /', () => {
    const fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    const alvo = fixture.debugElement
      .query(By.directive(RouterLink))
      .injector.get(RouterLink).urlTree?.toString();
    expect(alvo).toBe('/');
  });

  it('shows a signed-in confirmation when signup returns a session immediately', async () => {
    autenticacaoServiceMock.cadastrar.mockResolvedValue({ sessaoImediata: true });

    const fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as { cadastrar(): Promise<void> }
    ).cadastrar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Você está conectado');
  });

  it('shows an email-confirmation message when no session comes back immediately', async () => {
    autenticacaoServiceMock.cadastrar.mockResolvedValue({ sessaoImediata: false });

    const fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as { cadastrar(): Promise<void> }
    ).cadastrar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Verifique seu e-mail');
  });

  it('shows the error message on failure', async () => {
    autenticacaoServiceMock.cadastrar.mockRejectedValue(new Error('User already registered'));

    const fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    await (
      fixture.componentInstance as unknown as { cadastrar(): Promise<void> }
    ).cadastrar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro')?.textContent).toContain(
      'User already registered',
    );
  });
});
