import { Component, inject, signal } from '@angular/core';
import { CartasService, EstadoBuscaCartasService, TAMANHO_PAGINA_BUSCA } from '@shared/services';
import { Cartao } from '@shared/components';

const TAMANHO_MINIMO_TERMO = 3;

@Component({
  selector: 'app-inicio',
  imports: [Cartao],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private readonly cartasService = inject(CartasService);
  protected readonly estado = inject(EstadoBuscaCartasService);

  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected get termoInvalido(): boolean {
    return this.estado.tentouBuscar() && this.estado.termo().trim().length < TAMANHO_MINIMO_TERMO;
  }

  protected get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.estado.total() / TAMANHO_PAGINA_BUSCA));
  }

  async buscar(): Promise<void> {
    this.estado.tentouBuscar.set(true);

    if (this.estado.termo().trim().length < TAMANHO_MINIMO_TERMO) {
      return;
    }

    await this.executarBusca(1);
  }

  async irParaPagina(pagina: number): Promise<void> {
    if (pagina < 1 || pagina > this.totalPaginas) {
      return;
    }

    await this.executarBusca(pagina);
  }

  private async executarBusca(pagina: number): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      const resultado = await this.cartasService.buscarCartas(
        this.estado.termo().trim(),
        this.estado.campo(),
        pagina,
      );
      this.estado.resultados.set(resultado.cartas);
      this.estado.total.set(resultado.total);
      this.estado.pagina.set(pagina);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }
}
