import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_DESTINATIONS } from './nav-destinations';

// The destination list shared by the side nav and the drawer (DESIGN.md "Side nav"): a bead on
// the thread plus a label. The current section (any page under its path) gets a lit bead,
// gradient text and aria-current (FR-012). Mirrored in the drawer; labels are visually hidden
// while the side nav is collapsed, never removed, so each link keeps its accessible name.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nav-links',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-links.html',
  styleUrl: './nav-links.scss',
  host: {
    '[class.is-mirrored]': 'mirrored()',
    '[class.is-collapsed]': '!showLabels()',
  },
})
export class NavLinks {
  readonly mirrored = input(false);
  readonly showLabels = input(true);

  protected readonly destinations = NAV_DESTINATIONS;
}
