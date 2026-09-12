import { Component } from '@angular/core';
import { DashboardPanel } from '../../shared/dashboard-panel/dashboard-panel';
import { DeckList } from '../../shared/deck-list/deck-list';
import { LocationChildren } from '../../shared/location-children/location-children';

@Component({
  imports: [DashboardPanel, LocationChildren, DeckList],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
