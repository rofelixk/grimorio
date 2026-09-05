import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartasService } from '@shared/services';
import { ICarta } from '@shared/interfaces';
import { criarVisualizacaoDeCarta, ehCartaMultiface, VisualizacaoDeCarta } from '@shared/utils';

@Component({
  selector: 'app-carta',
  imports: [RouterLink],
  templateUrl: './carta.html',
  styleUrl: './carta.css',
})
export class Carta implements OnInit {
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly cartasService = inject(CartasService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly carta = signal<ICarta.Detalhes | null>(null);
  protected readonly indiceFaceExibida = signal(0);

  async ngOnInit(): Promise<void> {
    const oracleId = this.rotaAtiva.snapshot.paramMap.get('oracleId');
    if (!oracleId) {
      this.erro.set('Carta não encontrada.');
      this.carregando.set(false);
      return;
    }

    try {
      const resultado = await this.cartasService.buscarCartaPorId(oracleId);
      if (!resultado) {
        this.erro.set('Carta não encontrada.');
      } else {
        this.carta.set(resultado);
      }
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }

  get ehMultiface(): boolean {
    const carta = this.carta();
    return carta !== null && ehCartaMultiface(carta);
  }

  get visualizacao(): VisualizacaoDeCarta | null {
    const carta = this.carta();
    return carta ? criarVisualizacaoDeCarta(carta, this.indiceFaceExibida()) : null;
  }

  alternarFace(): void {
    if (!this.ehMultiface) {
      return;
    }
    this.indiceFaceExibida.update((indice) => (indice === 0 ? 1 : 0));
  }
}
