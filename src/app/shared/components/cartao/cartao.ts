import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
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
export class Cartao implements OnInit, OnDestroy {
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

  ngOnInit(): void {
    for (const url of [this.imagemFrente, this.imagemVerso]) {
      if (url) {
        new Image().src = url;
      }
    }
  }

  ngOnDestroy(): void {
    this.pararHover();
  }

  iniciarHover(): void {
    if (!this.podeVirar) {
      return;
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
