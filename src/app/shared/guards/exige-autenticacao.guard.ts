import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AutenticacaoService } from '@shared/services';

export const exigeAutenticacaoGuard: CanActivateFn = async () => {
  const autenticacaoService = inject(AutenticacaoService);
  const router = inject(Router);

  await autenticacaoService.sessaoPronta;

  return autenticacaoService.estaAutenticado() ? true : router.parseUrl('');
};
