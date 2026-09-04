import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { exigeAutenticacaoGuard } from './exige-autenticacao.guard';
import { AutenticacaoService } from '@shared/services';

const rotaFalsa = {} as ActivatedRouteSnapshot;
const estadoFalso = {} as RouterStateSnapshot;

describe('exigeAutenticacaoGuard', () => {
  it('allows navigation when authenticated', async () => {
    const autenticacaoServiceMock = {
      sessaoPronta: Promise.resolve(),
      estaAutenticado: jest.fn().mockReturnValue(true),
    };
    const routerMock = { parseUrl: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AutenticacaoService, useValue: autenticacaoServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    const resultado = await TestBed.runInInjectionContext(() =>
      exigeAutenticacaoGuard(rotaFalsa, estadoFalso),
    );

    expect(resultado).toBe(true);
    expect(routerMock.parseUrl).not.toHaveBeenCalled();
  });

  it('redirects to / when not authenticated', async () => {
    const arvoreRedirecionamento = {} as UrlTree;
    const autenticacaoServiceMock = {
      sessaoPronta: Promise.resolve(),
      estaAutenticado: jest.fn().mockReturnValue(false),
    };
    const routerMock = { parseUrl: jest.fn().mockReturnValue(arvoreRedirecionamento) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AutenticacaoService, useValue: autenticacaoServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    const resultado = await TestBed.runInInjectionContext(() =>
      exigeAutenticacaoGuard(rotaFalsa, estadoFalso),
    );

    expect(routerMock.parseUrl).toHaveBeenCalledWith('');
    expect(resultado).toBe(arvoreRedirecionamento);
  });

  it('awaits sessaoPronta before checking authentication', async () => {
    let sessaoResolvida = false;
    const autenticacaoServiceMock = {
      sessaoPronta: new Promise<void>((resolve) =>
        setTimeout(() => {
          sessaoResolvida = true;
          resolve();
        }, 0),
      ),
      estaAutenticado: jest.fn(() => {
        expect(sessaoResolvida).toBe(true);
        return true;
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AutenticacaoService, useValue: autenticacaoServiceMock },
        { provide: Router, useValue: { parseUrl: jest.fn() } },
      ],
    });

    await TestBed.runInInjectionContext(() => exigeAutenticacaoGuard(rotaFalsa, estadoFalso));

    expect(autenticacaoServiceMock.estaAutenticado).toHaveBeenCalled();
  });
});
