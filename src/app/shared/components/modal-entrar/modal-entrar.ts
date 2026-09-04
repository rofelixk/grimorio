import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutenticacaoService } from '@shared/services';

@Component({
  selector: 'app-modal-entrar',
  imports: [FormsModule],
  templateUrl: './modal-entrar.html',
  styleUrl: './modal-entrar.css',
})
export class ModalEntrar {
  @Output() fechar = new EventEmitter<void>();

  private readonly autenticacaoService = inject(AutenticacaoService);

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  async entrar(): Promise<void> {
    this.enviando.set(true);
    this.erro.set(null);

    try {
      await this.autenticacaoService.entrar(this.email(), this.senha());
      this.fechar.emit();
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.enviando.set(false);
    }
  }
}
