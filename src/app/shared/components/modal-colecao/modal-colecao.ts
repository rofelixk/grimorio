import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColecoesService } from '@shared/services';
import { IColecao } from '@shared/interfaces';
import { PALETA_CORES_COLECAO } from '@shared/constants';

@Component({
  selector: 'app-modal-colecao',
  imports: [FormsModule],
  templateUrl: './modal-colecao.html',
  styleUrl: './modal-colecao.css',
})
export class ModalColecao implements OnInit {
  // Presente = edição; ausente = criação.
  @Input() colecao: IColecao.Detalhes | null = null;
  @Output() fechar = new EventEmitter<void>();
  @Output() salvo = new EventEmitter<IColecao.Detalhes>();

  private readonly colecoesService = inject(ColecoesService);

  protected readonly paleta = PALETA_CORES_COLECAO;
  protected readonly nome = signal('');
  protected readonly cor = signal(PALETA_CORES_COLECAO[0].chave);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    if (this.colecao) {
      this.nome.set(this.colecao.name);
      this.cor.set(this.colecao.color);
    }
  }

  async salvar(): Promise<void> {
    this.enviando.set(true);
    this.erro.set(null);

    try {
      const resultado = this.colecao
        ? await this.colecoesService.atualizarColecao(this.colecao.id, this.nome().trim(), this.cor())
        : await this.colecoesService.criarColecao(this.nome().trim(), this.cor());

      this.salvo.emit(resultado);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.enviando.set(false);
    }
  }
}
