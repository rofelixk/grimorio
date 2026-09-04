import { Component, Input } from '@angular/core';
import { ICarta } from '@shared/interfaces';

@Component({
  selector: 'app-cartao',
  imports: [],
  templateUrl: './cartao.html',
  styleUrl: './cartao.css',
})
export class Cartao {
  @Input({ required: true }) carta!: ICarta.Detalhes;

  private indiceFaceExibida = 0;

  get ehMultiface(): boolean {
    return (this.carta.card_faces?.length ?? 0) > 1;
  }

  private get faceExibida(): ICarta.Face | null {
    return this.carta.card_faces?.[this.indiceFaceExibida] ?? null;
  }

  get nomeExibido(): string {
    return this.faceExibida?.name ?? this.carta.name;
  }

  get custoDeManaExibido(): string {
    return this.faceExibida?.mana_cost ?? this.carta.mana_cost ?? '';
  }

  get tipoExibido(): string {
    return this.faceExibida?.type_line ?? this.carta.type_line;
  }

  get textoOracleExibido(): string | null {
    return this.faceExibida?.oracle_text ?? this.carta.oracle_text ?? null;
  }

  get imagemExibida(): string | null {
    return this.faceExibida?.image_url ?? this.carta.image_url;
  }

  alternarFace(): void {
    if (!this.ehMultiface) {
      return;
    }
    this.indiceFaceExibida = this.indiceFaceExibida === 0 ? 1 : 0;
  }
}
