import { Component } from '@angular/core';
import { DeckList } from '../../shared/deck-list/deck-list';

@Component({
  imports: [DeckList],
  selector: 'app-decks',
  styleUrl: './decks.scss',
  templateUrl: './decks.html',
})
export class Decks {}
