import { Component, input, output } from '@angular/core';
import { CardEntry } from '../../core/models/card.model';

@Component({
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
