// Shared by FilterSelect and AppSelect: closes an open dropdown panel on
// Escape (while focus is within the component's host) or on a click outside
// it. Call from a component constructor (injection context required).
import { DestroyRef, ElementRef, inject } from '@angular/core';

interface DismissTarget {
  host: HTMLElement;
  isOpen: () => boolean;
  onClose: () => void;
}

// One document-level click listener shared by every mounted dropdown
// instance, rather than one per instance — CollectionFilters alone mounts 4
// in the nav drawer (present on every /collection/:id page), so a per-click
// document listener per instance would otherwise scale linearly with how
// many dropdowns happen to be on screen.
const targets = new Set<DismissTarget>();
let documentListenerBound = false;

function ensureDocumentListener(): void {
  if (documentListenerBound) {
    return;
  }
  documentListenerBound = true;
  document.addEventListener('click', (event) => {
    for (const target of targets) {
      if (target.isOpen() && !target.host.contains(event.target as Node)) {
        target.onClose();
      }
    }
  });
}

export function bindDropdownDismiss(
  elementRef: ElementRef<HTMLElement>,
  isOpen: () => boolean,
  onClose: () => void,
): void {
  const destroyRef = inject(DestroyRef);
  const host = elementRef.nativeElement;

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && isOpen()) {
      onClose();
    }
  };

  const target: DismissTarget = { host, isOpen, onClose };
  targets.add(target);
  ensureDocumentListener();

  host.addEventListener('keydown', onKeydown);
  destroyRef.onDestroy(() => {
    host.removeEventListener('keydown', onKeydown);
    targets.delete(target);
  });
}
