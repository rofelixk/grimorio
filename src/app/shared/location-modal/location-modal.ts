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
import { Color } from '@models/card.model';
import { StorageLocation } from '@models/storage-location.model';
import { StorageLocationService } from '@services/storage-location.service';
import { DEFAULT_THEME_COLORS, ThemeService } from '@services/theme.service';
import { LocationColorPicker } from '@shared/location-color-picker/location-color-picker';
import { SparkRerollDirective } from '@shared/spark-reroll/spark-reroll.directive';
import { MTG_PRINT_COLORS } from '../../core/utils/card-color.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocationColorPicker, SparkRerollDirective],
  selector: 'app-location-modal',
  styleUrl: './location-modal.scss',
  templateUrl: './location-modal.html',
  host: {
    '[style.--modal-primary]': 'pickerColor()',
  },
})
export class LocationModal {
  private readonly locationsService = inject(StorageLocationService);
  private readonly themeService = inject(ThemeService);

  readonly open = input(false);
  readonly parentId = input<string | null>(null);
  readonly location = input<StorageLocation | null>(null);
  readonly parentName = input<string | null>(null);

  readonly saved = output<StorageLocation>();
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  // One per spark in the ring (see location-modal.html) — same idiom as
  // auth-modal's sparkIndices, fewer of them since this modal opens far
  // more often and a full 20-spark ring read as too busy for a quick
  // "name a folder" action.
  protected readonly sparkIndices = Array.from({ length: 14 }, (_, i) => i);

  readonly name = signal('');
  readonly color = signal<Color>('R');
  private readonly submitted = signal(false);

  protected readonly pickerColor = computed(() => MTG_PRINT_COLORS[this.color()]);

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
        this.color.set(
          this.location()?.color ?? this.themeService.colors()[0] ?? DEFAULT_THEME_COLORS[0],
        );
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
    const color = this.color();
    const editing = this.location();
    const entry = editing
      ? { ...editing, name: trimmed, color }
      : this.locationsService.add({ name: trimmed, parentId: this.parentId(), color });
    if (editing) {
      this.locationsService.update(editing.id, { name: trimmed, color });
    }

    // Reset submitted so `error` stops re-evaluating the duplicate-name
    // check against the entry submit() just created — for a new location,
    // `editing` is null, so that check's `loc.id !== editing?.id` matches
    // the just-added entry itself once locationsService.locations() updates,
    // flagging it as a "duplicate" of itself. Harmless while the dialog
    // closed instantly, but the fade-out transition now holds it on screen
    // long enough for that flash to actually be visible.
    this.submitted.set(false);
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
