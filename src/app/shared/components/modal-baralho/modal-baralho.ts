import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaralhosService } from '@shared/services';
import { IBaralho } from '@shared/interfaces';

@Component({
  selector: 'app-modal-baralho',
  imports: [FormsModule],
  templateUrl: './modal-baralho.html',
  styleUrl: './modal-baralho.css',
})
export class ModalBaralho implements OnInit {
  // Presente = edição; ausente = criação.
  @Input() baralho: IBaralho.Detalhes | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() salvo = new EventEmitter<IBaralho.Detalhes>();

  private readonly baralhosService = inject(BaralhosService);

  protected readonly nome = signal('');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    if (this.baralho) {
      this.nome.set(this.baralho.name);
    }
  }

  async salvar(): Promise<void> {
    this.enviando.set(true);
    this.erro.set(null);

    try {
      const resultado = this.baralho
        ? await this.baralhosService.atualizarBaralho(this.baralho.id, this.nome().trim())
        : await this.baralhosService.criarBaralho(this.nome().trim());

      this.salvo.emit(resultado);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.enviando.set(false);
    }
  }
}
