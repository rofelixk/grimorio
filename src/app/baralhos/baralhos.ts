import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { BaralhosService } from '@shared/services';
import { IBaralho } from '@shared/interfaces';
import { ModalBaralho } from '@shared/components';

@Component({
  selector: 'app-baralhos',
  imports: [RouterLink, ModalBaralho],
  templateUrl: './baralhos.html',
  styleUrl: './baralhos.css',
})
export class Baralhos implements OnInit {
  private readonly baralhosService = inject(BaralhosService);
  private readonly router = inject(Router);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly baralhos = signal<IBaralho.Detalhes[]>([]);
  protected readonly modalAberta = signal(false);

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      this.baralhos.set(await this.baralhosService.listarBaralhos());
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }

  abrirModalCriar(): void {
    this.modalAberta.set(true);
  }

  fecharModal(): void {
    this.modalAberta.set(false);
  }

  async aoSalvar(baralho: IBaralho.Detalhes): Promise<void> {
    this.modalAberta.set(false);
    this.router.navigate(['/baralhos', baralho.id]);
  }
}
