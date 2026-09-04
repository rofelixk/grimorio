import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AutenticacaoService } from '@shared/services';

@Component({
  selector: 'app-cadastro',
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css',
})
export class Cadastro {
  private readonly autenticacaoService = inject(AutenticacaoService);

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly cadastroConcluido = signal(false);
  protected readonly precisaConfirmarEmail = signal(false);

  async cadastrar(): Promise<void> {
    this.enviando.set(true);
    this.erro.set(null);

    try {
      const resultado = await this.autenticacaoService.cadastrar(this.email(), this.senha());
      this.cadastroConcluido.set(true);
      this.precisaConfirmarEmail.set(!resultado.sessaoImediata);
    } catch (erroCapturado) {
      this.erro.set(erroCapturado instanceof Error ? erroCapturado.message : 'Erro desconhecido.');
    } finally {
      this.enviando.set(false);
    }
  }
}
