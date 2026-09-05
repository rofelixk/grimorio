import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CartasService } from '@shared/services';
import { ICarta, IImpressao } from '@shared/interfaces';

// Modal aberto por BuscaCartas (quando pedirImpressao é true) antes de emitir
// adicionarCarta — deixa o usuário escolher a impressão exata (ou nenhuma)
// de uma carta antes dela entrar no baralho.
@Component({
  selector: 'app-seletor-impressao',
  imports: [],
  templateUrl: './seletor-impressao.html',
  styleUrl: './seletor-impressao.css',
})
export class SeletorImpressao implements OnInit {
  @Input({ required: true }) carta!: ICarta.Detalhes;
  @Output() escolhido = new EventEmitter<string | null>();
  @Output() fechar = new EventEmitter<void>();

  private readonly cartasService = inject(CartasService);

  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly impressoes = signal<IImpressao.Detalhes[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      this.impressoes.set(await this.cartasService.buscarImpressoesPorCarta(this.carta.oracle_id));
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.carregando.set(false);
    }
  }

  escolher(printingId: string | null): void {
    this.escolhido.emit(printingId);
  }
}
