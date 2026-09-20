import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  selector: 'app-dashboard-panel',
  styleUrl: './dashboard-panel.scss',
  templateUrl: './dashboard-panel.html',
})
export class DashboardPanel {
  readonly title = input.required<string>();
  readonly viewAllLink = input.required<string>();
}
