import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LocationChildren } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocationChildren],
  selector: 'app-locations',
  styleUrl: './locations.scss',
  templateUrl: './locations.html',
})
export class Locations {}
