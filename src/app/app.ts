import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AutenticacaoService } from '@shared/services';
import { ModalEntrar } from '@shared/components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ModalEntrar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly autenticacaoService = inject(AutenticacaoService);
  protected readonly modalEntrarAberta = signal(false);

  abrirModalEntrar(): void {
    this.modalEntrarAberta.set(true);
  }

  fecharModalEntrar(): void {
    this.modalEntrarAberta.set(false);
  }

  sair(): void {
    this.autenticacaoService.sair();
  }
}
