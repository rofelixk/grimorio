import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { MAX_NAME, type Collection, type CollectionColorId, type NameError } from '@models/collection.model';
import { CollectionService } from '@services/collection.service';
import { IdentityService } from '@services/identity.service';
import { CompactModal } from '@shared/ds/compact-modal/compact-modal';
import { ColorPicker } from '@shared/collections/color-picker/color-picker';
import { COLLECTION } from '@utils/collection-copy';

let nextId = 0;

const ERRORS: Record<NameError, string> = {
  empty: COLLECTION.errEmpty,
  'too-long': COLLECTION.errLong,
  taken: COLLECTION.errTaken,
};

// The create/edit dialog for collections and subcollections (ui.md §2, DESIGN.md "Collections"),
// inside the compact modal. Validation runs on submit through CollectionService; the error
// replaces the helper and clears on the next input. Creating inside a collection that holds
// cards moves them into the new subcollection (FR-029), announced by the move plate.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-collection-form-dialog',
  imports: [CompactModal, ColorPicker],
  templateUrl: './collection-form-dialog.html',
  styleUrl: './collection-form-dialog.scss',
})
export class CollectionFormDialog {
  readonly mode = input.required<'create' | 'edit'>();
  readonly parentId = input<string | null>(null);
  readonly collectionId = input<string>();
  readonly closed = output<void>();
  readonly saved = output<Collection>();

  private readonly collections = inject(CollectionService);
  protected readonly roles = inject(IdentityService).roles;
  protected readonly copy = COLLECTION;
  protected readonly maxName = MAX_NAME;

  private readonly uid = nextId++;
  protected readonly titleId = `grm-collection-form-title-${this.uid}`;
  protected readonly inputId = `grm-collection-form-name-${this.uid}`;
  protected readonly hintId = `grm-collection-form-hint-${this.uid}`;

  private readonly editing = computed(() => {
    const id = this.collectionId();
    return this.mode() === 'edit' && id ? this.collections.byId().get(id) : undefined;
  });
  /** The parent the collection lives (or will live) in. */
  private readonly parent = computed(() => {
    const parentId = this.mode() === 'edit' ? (this.editing()?.parentId ?? null) : this.parentId();
    return parentId !== null ? this.collections.byId().get(parentId) : undefined;
  });

  protected readonly name = linkedSignal(() => this.editing()?.name ?? '');
  protected readonly color = linkedSignal<CollectionColorId>(
    () => this.editing()?.color ?? this.collections.defaultColor(this.parentId()),
  );
  protected readonly error = signal<NameError | null>(null);
  protected readonly errorText = computed(() => {
    const error = this.error();
    return error ? ERRORS[error] : '';
  });

  protected readonly title = computed(() => {
    const sub = !!this.parent();
    const titles = COLLECTION.formTitles;
    if (this.mode() === 'edit') return sub ? titles.editSubcollection : titles.editCollection;
    return sub ? titles.newSubcollection : titles.newCollection;
  });
  protected readonly subtitle = computed(() => {
    const parent = this.parent();
    return parent ? COLLECTION.inside(parent.name) : '';
  });
  /** Creating inside a collection that holds cards: they move into the new subcollection. */
  protected readonly moveCount = computed(() => {
    const parent = this.parent();
    if (this.mode() !== 'create' || !parent || this.collections.kind(parent.id) !== 'cards') return 0;
    return this.collections.stats().byId.get(parent.id)?.cards ?? 0;
  });
  protected readonly movePlate = computed(() => {
    const parent = this.parent();
    return parent && this.moveCount() > 0 ? COLLECTION.movePlate(parent.name, this.moveCount()) : '';
  });
  protected readonly verb = computed(() => {
    const verbs = COLLECTION.verbs;
    if (this.mode() === 'edit') return verbs.save;
    if (this.movePlate()) return verbs.createAndMove;
    return this.parent() ? verbs.createSubcollection : verbs.createCollection;
  });

  protected onInput(value: string): void {
    this.name.set(value);
    this.error.set(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.mode() === 'edit') {
      const id = this.collectionId()!;
      const result = this.collections.update(id, { name: this.name(), color: this.color() });
      if (result.ok) {
        this.saved.emit(this.collections.byId().get(id)!);
      } else if (result.error !== 'not-found') {
        this.error.set(result.error);
      } else {
        this.closed.emit();
      }
      return;
    }

    const result = this.collections.create({ parentId: this.parentId(), name: this.name(), color: this.color() });
    if (result.ok) {
      this.saved.emit(result.collection);
    } else if (result.error === 'empty' || result.error === 'too-long' || result.error === 'taken') {
      this.error.set(result.error);
    } else {
      this.closed.emit();
    }
  }
}
