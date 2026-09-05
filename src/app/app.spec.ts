import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AutenticacaoService } from '@shared/services';

describe('App', () => {
  let autenticacaoServiceMock: {
    estaAutenticado: jest.Mock;
    usuarioAtual: jest.Mock;
    sair: jest.Mock;
  };

  beforeEach(async () => {
    autenticacaoServiceMock = {
      estaAutenticado: jest.fn().mockReturnValue(false),
      usuarioAtual: jest.fn().mockReturnValue(null),
      sair: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: AutenticacaoService, useValue: autenticacaoServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows Sign in and Sign up when logged out', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Entrar');
    expect(texto).toContain('Cadastre-se');
  });

  it('hides the Decks and Collection buttons when logged out', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).not.toContain('Baralhos');
    expect(labels).not.toContain('Coleção');
  });

  it('always shows a Home button linking to /, even when logged out', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).toContain('Início');

    const target = fixture.debugElement
      .query(By.css('.navegacao'))
      .query(By.directive(RouterLink))
      .injector.get(RouterLink).urlTree?.toString();
    expect(target).toBe('/');
  });

  it('shows Decks and Collection buttons linking to /baralhos and /colecao when logged in', () => {
    autenticacaoServiceMock.estaAutenticado.mockReturnValue(true);
    autenticacaoServiceMock.usuarioAtual.mockReturnValue({ email: 'ash@example.com' });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).textContent?.trim(),
    );
    expect(labels).toContain('Baralhos');
    expect(labels).toContain('Coleção');

    const targets = fixture.debugElement
      .query(By.css('.navegacao'))
      .queryAll(By.directive(RouterLink))
      .map((el) => el.injector.get(RouterLink).urlTree?.toString());
    expect(targets).toEqual(['/', '/baralhos', '/colecao']);
  });

  it('opens the sign-in modal when Sign in is clicked', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const botaoEntrar = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).textContent?.trim() === 'Entrar',
    ) as HTMLButtonElement;
    botaoEntrar.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-modal-entrar')).not.toBeNull();
  });

  it('shows the email and Sign out when logged in', () => {
    autenticacaoServiceMock.estaAutenticado.mockReturnValue(true);
    autenticacaoServiceMock.usuarioAtual.mockReturnValue({ email: 'ash@example.com' });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('ash@example.com');
    expect(texto).toContain('Sair');
  });
});
