import { Component, input } from '@angular/core';
import { Color } from '../../core/models/card.model';

const ALL_COLORS: Color[] = ['W', 'U', 'B', 'R', 'G'];

@Component({
  imports: [],
  selector: 'app-color-identity',
  styleUrl: './color-identity.scss',
  templateUrl: './color-identity.html',
})
export class ColorIdentity {
  readonly colorIdentity = input.required<Color[]>();
  readonly allColors = ALL_COLORS;

  isPresent(color: Color): boolean {
    return this.colorIdentity().includes(color);
  }
}
