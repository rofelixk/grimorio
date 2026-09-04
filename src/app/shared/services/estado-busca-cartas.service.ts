import { signal } from '@angular/core';
import { ICarta } from '@shared/interfaces';
import { CampoDeBusca, TAMANHO_PAGINA_BUSCA } from './cartas.service';

// Estado de uma busca, mantido fora do componente que a exibe (que é
// destruído/recriado ao navegar para a página de carta e voltar). Instanciado
// e mantido vivo por RegistroEstadoBuscaCartasService, uma por "página" (ver
// esse serviço) — não use `new` fora dele.
export class EstadoBuscaCartasService {
  readonly termo = signal('');
  readonly campo = signal<CampoDeBusca>('name');
  readonly pagina = signal(1);
  readonly total = signal(0);
  readonly resultados = signal<ICarta.Detalhes[] | null>(null);
  readonly tentouBuscar = signal(false);
  // Tamanho de página realmente usado na última busca — guardado aqui (e não
  // como campo do componente) para que totalPaginas continue correto depois
  // de o componente ser destruído/recriado (ex.: voltar da página de carta).
  readonly tamanhoPaginaUsado = signal(TAMANHO_PAGINA_BUSCA);
}
