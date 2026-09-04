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

  // Para cartas multiface, mana_cost/oracle_text ficam null no nível da carta —
  // ver docs/data-model.md. Escopo atual conta só a 1a face (card_faces[0]).
  get custoDeManaExibido(): string {
    return this.carta.mana_cost ?? this.carta.card_faces?.[0]?.mana_cost ?? '';
  }

  get textoOracleExibido(): string | null {
    return this.carta.oracle_text ?? this.carta.card_faces?.[0]?.oracle_text ?? null;
  }
}
