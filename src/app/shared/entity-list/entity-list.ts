import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface NamedEntity {
  id: string;
  name: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-entity-list',
  styleUrl: './entity-list.scss',
  templateUrl: './entity-list.html',
})
export class EntityList {
  readonly items = input.required<NamedEntity[]>();
  readonly routePrefix = input.required<string>();
  readonly emptyLabel = input('Nothing here yet.');
  readonly formLabel = input('New name');
  readonly addLabel = input('Add');
  readonly namePlaceholder = input('');

  readonly add = output<string>();
  readonly remove = output<string>();

  readonly newName = signal('');

  submitAdd(): void {
    const name = this.newName().trim();
    if (!name) {
      return;
    }
    this.add.emit(name);
    this.newName.set('');
  }
}
