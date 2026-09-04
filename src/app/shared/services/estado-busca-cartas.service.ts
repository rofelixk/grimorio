import { Injectable, signal } from '@angular/core';
import { ICarta } from '@shared/interfaces';
import { CampoDeBusca } from './cartas.service';

// Estado da última busca, mantido fora do componente Inicio (que é
// destruído/recriado ao navegar para a página de carta e voltar).
@Injectable({ providedIn: 'root' })
export class EstadoBuscaCartasService {
  readonly termo = signal('');
  readonly campo = signal<CampoDeBusca>('name');
  readonly pagina = signal(1);
  readonly total = signal(0);
  readonly resultados = signal<ICarta.Detalhes[] | null>(null);
  readonly tentouBuscar = signal(false);
}
