import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { colorOf, type Collection, type CollectionTotals } from '@models/collection.model';
import { COLLECTION } from '@utils/collection-copy';

// One collection in a list (DESIGN.md "Collections" → "Collection row"): an action row whose lead
// is the collection's 20px swatch. Its accessible name is "{nome}, cor {Cor}. {meta}.", so the
// color is always named in text; the swatch and the visible text are hidden in favor of it.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-row',
  template: `
    <button type="button" class="row" [attr.aria-label]="label()" (click)="open.emit()">
      <span
        class="swatch"
        aria-hidden="true"
        [style.background]="color().hex"
        [style.border-color]="color().outline ?? 'transparent'"
      ></span>
      <span class="text" aria-hidden="true">
        <span class="name">{{ collection().name }}</span>
        <span class="meta">{{ meta() }}</span>
      </span>
      <span class="micro-label verb" aria-hidden="true">{{ copy.open }}</span>
    </button>
  `,
  styleUrl: './collection-row.scss',
})
export class CollectionRow {
  readonly collection = input.required<Collection>();
  readonly totals = input.required<CollectionTotals>();
  readonly open = output<void>();

  protected readonly copy = COLLECTION;
  protected readonly color = computed(() => colorOf(this.collection().color));
  protected readonly meta = computed(() => COLLECTION.meta(this.totals()));
  protected readonly label = computed(() =>
    COLLECTION.rowLabel(this.collection().name, this.color().name, this.meta()),
  );
}
