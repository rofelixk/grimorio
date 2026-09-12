import { Component } from '@angular/core';
import { LocationChildren } from '../../shared/location-children/location-children';

@Component({
  imports: [LocationChildren],
  selector: 'app-locations',
  styleUrl: './locations.scss',
  templateUrl: './locations.html',
})
export class Locations {}
