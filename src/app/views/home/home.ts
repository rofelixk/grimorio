import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DashboardPanel, DeckList, LocationChildren } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardPanel, LocationChildren, DeckList],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
