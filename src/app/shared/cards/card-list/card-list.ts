import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CardEntry } from '@models/card.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-card-list',
  styleUrl: './card-list.scss',
  templateUrl: './card-list.html',
})
export class CardList {
  readonly cards = input.required<CardEntry[]>();
  readonly remove = output<string>();

  removeCard(id: string): void {
    this.remove.emit(id);
  }
}
