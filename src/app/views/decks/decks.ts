import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DeckList } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeckList],
  selector: 'app-decks',
  styleUrl: './decks.scss',
  templateUrl: './decks.html',
})
export class Decks {}
