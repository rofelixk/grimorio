import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampoDeBusca, CartasService } from '@shared/services';
import { Cartao } from '@shared/components';
import { ICarta } from '@shared/interfaces';

const TAMANHO_MINIMO_TERMO = 3;

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Cartao],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private readonly cartasService = inject(CartasService);

  protected readonly termo = signal('');
  protected readonly campo = signal<CampoDeBusca>('name');
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly resultados = signal<ICarta.Detalhes[] | null>(null);
  protected readonly tentouBuscar = signal(false);

  protected get termoInvalido(): boolean {
    return this.tentouBuscar() && this.termo().trim().length < TAMANHO_MINIMO_TERMO;
  }

  async buscar(): Promise<void> {
    this.tentouBuscar.set(true);

    if (this.termo().trim().length < TAMANHO_MINIMO_TERMO) {
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);
    this.resultados.set(null);

    try {
      const resultado = await this.cartasService.buscarCartas(this.termo().trim(), this.campo());
      this.resultados.set(resultado);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }
}
