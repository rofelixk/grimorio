import { Injectable } from '@angular/core';
import { EstadoBuscaCartasService } from './estado-busca-cartas.service';

// Guarda um EstadoBuscaCartasService por "página" (chave estável escolhida
// por quem usa app-busca-cartas, ex.: 'inicio', `colecao-${id}`). Isso evita
// que a busca de uma página vaze para outra, mas ainda deixa cada busca
// sobreviver a uma navegação até a página de carta e volta, já que este
// registro é um singleton de root.
@Injectable({ providedIn: 'root' })
export class RegistroEstadoBuscaCartasService {
  private readonly estados = new Map<string, EstadoBuscaCartasService>();

  obter(chave: string): EstadoBuscaCartasService {
    let estado = this.estados.get(chave);
    if (!estado) {
      estado = new EstadoBuscaCartasService();
      this.estados.set(chave, estado);
    }
    return estado;
  }
}
