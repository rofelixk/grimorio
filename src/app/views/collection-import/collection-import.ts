import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StorageLocation } from '@models/storage-location.model';
import { CardEntry } from '@models/card.model';
import { StorageLocationService } from '@services/storage-location.service';
import { CardImportService, MatchedRow, UnresolvedRow } from '@services/card-import.service';
import { ImportRow, ImportSource } from '../../core/utils/card-import.util';
import { AddCardModal } from '@shared';

interface LocationOption {
  id: string;
  label: string;
}

function buildLocationOptions(locations: StorageLocation[]): LocationOption[] {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const pathOf = (location: StorageLocation): string => {
    const path: string[] = [location.name];
    let current = location.parentId ? byId.get(location.parentId) : undefined;
    while (current) {
      path.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return path.join(' / ');
  };
  return locations
    .map((location) => ({ id: location.id, label: pathOf(location) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AddCardModal],
  selector: 'app-collection-import',
  styleUrl: './collection-import.scss',
  templateUrl: './collection-import.html',
})
export class CollectionImport {
  private readonly cardImport = inject(CardImportService);
  private readonly locationsService = inject(StorageLocationService);
  private readonly router = inject(Router);

  // Bound automatically from the ?locationId= query param (withComponentInputBinding)
  // when this view is opened from a location's "Importar CSV" button — skips
  // the location-picker step entirely.
  readonly locationId = input<string>();
  readonly presetLocation = computed(() => {
    const id = this.locationId();
    return id ? this.locationsService.byId(id)() : undefined;
  });

  readonly locationOptions = computed(() => buildLocationOptions(this.locationsService.locations()));
  readonly selectedLocationId = linkedSignal<string | null>(() => this.locationId() ?? null);

  readonly rows = signal<ImportRow[]>([]);
  readonly source = signal<ImportSource | null>(null);
  readonly parseError = signal<string | null>(null);

  readonly matching = signal(false);
  readonly matched = signal<MatchedRow[]>([]);
  readonly unresolved = signal<UnresolvedRow[]>([]);
  readonly added = signal<CardEntry[]>([]);
  readonly updated = signal<CardEntry[]>([]);
  readonly resolvingRow = signal<ImportRow | null>(null);

  private hasImported = false;

  readonly step = computed<'upload' | 'location' | 'progress' | 'results'>(() => {
    if (this.matched().length > 0 || this.unresolved().length > 0) {
      return 'results';
    }
    if (this.matching()) {
      return 'progress';
    }
    if (this.rows().length > 0 && !this.selectedLocationId()) {
      return 'location';
    }
    return 'upload';
  });

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.parseError.set(null);
    try {
      const rows = await this.cardImport.parse(file);
      this.rows.set(rows);
      this.source.set(rows[0]?.source ?? null);

      // Location already known (opened from a location's own page) — go
      // straight to matching instead of asking the user to pick one.
      if (this.selectedLocationId()) {
        await this.startImport();
      }
    } catch (err) {
      this.rows.set([]);
      this.source.set(null);
      this.parseError.set(
        err instanceof Error ? err.message : 'Não foi possível ler o arquivo CSV.',
      );
    } finally {
      input.value = '';
    }
  }

  restart(): void {
    this.rows.set([]);
    this.source.set(null);
    this.parseError.set(null);
    if (!this.locationId()) {
      this.selectedLocationId.set(null);
    }
    this.matching.set(false);
    this.matched.set([]);
    this.unresolved.set([]);
    this.added.set([]);
    this.updated.set([]);
    this.hasImported = false;
  }

  selectLocation(id: string): void {
    this.selectedLocationId.set(id || null);
  }

  async startImport(): Promise<void> {
    const locationId = this.selectedLocationId();
    if (!locationId) {
      return;
    }

    this.matching.set(true);
    const { matched, unresolved } = await this.cardImport.match(this.rows());
    const { added, updated } = this.cardImport.import(matched, locationId);
    this.added.set(added);
    this.updated.set(updated);
    this.matched.set(matched);
    this.unresolved.set(unresolved);
    this.matching.set(false);
    this.hasImported = true;

    await this.redirectWhenDone();
  }

  resolveRow(row: ImportRow): void {
    this.resolvingRow.set(row);
  }

  async closeResolveModal(): Promise<void> {
    // The modal's closed event fires on both a successful add and a cancel —
    // either way, this unresolved row's manual-resolution step is done.
    const row = this.resolvingRow();
    if (row) {
      this.unresolved.update((rows) => rows.filter((r) => r.row !== row));
    }
    this.resolvingRow.set(null);
    await this.redirectWhenDone();
  }

  async skipRow(row: ImportRow): Promise<void> {
    this.unresolved.update((rows) => rows.filter((r) => r.row !== row));
    await this.redirectWhenDone();
  }

  // Once every row from the batch has been either imported or manually
  // resolved/skipped, there's nothing left to show — jump back to the
  // location that just received the cards.
  private async redirectWhenDone(): Promise<void> {
    const locationId = this.selectedLocationId();
    if (this.hasImported && this.unresolved().length === 0 && locationId) {
      await this.router.navigate(['/collection', locationId]);
    }
  }
}
