import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProfileRow } from '@shared/ds/profile-row/profile-row';
import { EntryFlowStore } from '../entry-flow.store';

// The `list` phase: every profile on the device, the active one first ("Em uso"), the
// "+ Criar novo perfil" row, and "Sair de {P}" when a profile is active (FR-007, FR-031).
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-list',
  imports: [ProfileRow],
  templateUrl: './profile-list.html',
  styles: `
    :host,
    .list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    :host {
      gap: var(--space-4);
    }
  `,
})
export class ProfileList {
  protected readonly store = inject(EntryFlowStore);

  protected readonly others = computed(() => {
    const activeId = this.store.active()?.id;
    return this.store.profiles().filter((p) => p.id !== activeId);
  });

  // Leaving the list as a whole — not a single row — restores the colors, so the gaps between
  // rows never flicker (FR-031).
  protected onFocusOut(event: FocusEvent): void {
    const list = event.currentTarget as HTMLElement;
    if (!(event.relatedTarget instanceof Node) || !list.contains(event.relatedTarget)) {
      this.store.preview(null);
    }
  }
}
