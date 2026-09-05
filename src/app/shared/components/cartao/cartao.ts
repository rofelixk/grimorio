import { Component, Input, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ICarta } from '@shared/interfaces';
import { ehCartaMultiface } from '@shared/utils';

export const ATRASO_PARA_VIRAR_MS = 1000;

@Component({
  selector: 'app-cartao',
  imports: [RouterLink],
  templateUrl: './cartao.html',
  styleUrl: './cartao.css',
})
export class Cartao implements OnDestroy {
  @Input({ required: true }) carta!: ICarta.Detalhes;

  protected readonly virada = signal(false);
  protected readonly progresso = signal(0);

  private inicioHover: number | null = null;
  private quadroAnimacao: number | null = null;
  private timeoutVirar: ReturnType<typeof setTimeout> | null = null;

  get ehMultiface(): boolean {
    return ehCartaMultiface(this.carta);
  }

  get imagemFrente(): string | null {
    return this.carta.card_faces?.[0]?.image_url ?? this.carta.image_url;
  }

  get imagemVerso(): string | null {
    return this.carta.card_faces?.[1]?.image_url ?? null;
  }

  get podeVirar(): boolean {
    return this.ehMultiface && this.imagemVerso !== null;
  }

  ngOnDestroy(): void {
    this.pararHover();
  }

  iniciarHover(): void {
    if (!this.podeVirar) {
      return;
    }

    // Começa a decodificar o verso já ao entrar no hover — bem antes do
    // atraso pra virar (ATRASO_PARA_VIRAR_MS), então a virada não pisca
    // esperando a imagem carregar. A frente não precisa disso (já está
    // sendo carregada pelo próprio <img> da tela). Só faz isso aqui, sob
    // demanda, em vez de pré-carregar o verso de toda carta da grade no
    // ngOnInit — a maioria nunca chega a ser hovertada, e isso somava
    // memória à toa numa grade grande de resultados.
    if (this.imagemVerso) {
      new Image().src = this.imagemVerso;
    }

    this.inicioHover = performance.now();
    this.animarProgresso();
    this.timeoutVirar = setTimeout(() => this.virada.set(true), ATRASO_PARA_VIRAR_MS);
  }

  pararHover(): void {
    if (this.timeoutVirar !== null) {
      clearTimeout(this.timeoutVirar);
      this.timeoutVirar = null;
    }
    if (this.quadroAnimacao !== null) {
      cancelAnimationFrame(this.quadroAnimacao);
      this.quadroAnimacao = null;
    }
    this.inicioHover = null;
    this.progresso.set(0);
    this.virada.set(false);
  }

  private animarProgresso(): void {
    const passo = (agora: number): void => {
      if (this.inicioHover === null) {
        return;
      }

      const decorrido = agora - this.inicioHover;
      this.progresso.set(Math.min(decorrido / ATRASO_PARA_VIRAR_MS, 1));

      if (decorrido < ATRASO_PARA_VIRAR_MS) {
        this.quadroAnimacao = requestAnimationFrame(passo);
      }
    };

    this.quadroAnimacao = requestAnimationFrame(passo);
  }
}
