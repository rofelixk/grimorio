import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CollectionChildren } from '@shared';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CollectionChildren],
  selector: 'app-collection',
  styleUrl: './collection.scss',
  templateUrl: './collection.html',
})
export class Collection {}
