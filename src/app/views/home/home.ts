import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CollectionChildren, DashboardPanel, DeckList } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardPanel, CollectionChildren, DeckList],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
