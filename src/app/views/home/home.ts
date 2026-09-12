import { Component } from '@angular/core';
import { LocationChildren } from '../../shared/location-children/location-children';

@Component({
  imports: [LocationChildren],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
