import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { StorageLocation } from '@models/storage-location.model';
import { StorageLocationService } from '@services/storage-location.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-location-modal',
  styleUrl: './location-modal.scss',
  templateUrl: './location-modal.html',
})
export class LocationModal {
  private readonly locationsService = inject(StorageLocationService);

  readonly open = input(false);
  readonly parentId = input<string | null>(null);
  readonly location = input<StorageLocation | null>(null);
  readonly parentName = input<string | null>(null);

  readonly saved = output<StorageLocation>();
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly name = signal('');
  private readonly submitted = signal(false);

  readonly isRename = computed(() => this.location() !== null);

  readonly error = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    const trimmed = this.name().trim();
    if (trimmed === '') {
      return 'Dê um nome ao local.';
    }
    const editing = this.location();
    const siblings = this.locationsService
      .locations()
      .filter((loc) => loc.parentId === (editing ? editing.parentId : this.parentId()));
    const duplicate = siblings.some(
      (loc) => loc.id !== editing?.id && loc.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      return 'Já existe um local com esse nome aqui.';
    }
    return null;
  });

  constructor() {
    effect(() => {
      const el = this.dialog()?.nativeElement;
      if (!el) {
        return;
      }
      if (this.open()) {
        this.name.set(this.location()?.name ?? '');
        this.submitted.set(false);
        showDialogModal(el);
      } else {
        closeDialog(el);
      }
    });
  }

  submit(): void {
    this.submitted.set(true);
    if (this.error() !== null) {
      return;
    }

    const trimmed = this.name().trim();
    const editing = this.location();
    const entry = editing
      ? { ...editing, name: trimmed }
      : this.locationsService.add({ name: trimmed, parentId: this.parentId() });
    if (editing) {
      this.locationsService.update(editing.id, { name: trimmed });
    }

    this.saved.emit(entry);
    this.closed.emit();
  }

  onNativeClose(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }
}

// jsdom (used by the unit test runner) doesn't implement the native <dialog>
// show/close behavior, so guard these calls rather than assume support.
function showDialogModal(el: HTMLDialogElement): void {
  if (!el.open && typeof el.showModal === 'function') {
    el.showModal();
  }
}

function closeDialog(el: HTMLDialogElement): void {
  if (el.open && typeof el.close === 'function') {
    el.close();
  }
}
