import { Injectable, inject } from '@angular/core';
import { isClosedConnectionError } from '@db/connection-events';
import { WriteQueue } from '@db/write-queue';
import { DATA } from '@utils/entry-copy';
import { ToastService } from './toast.service';

// Builds the entity services' write queues (research R1): a failed save logs and shows the
// "Dados" toast (FR-002), except a write on a connection a takeover closed, which the takeover's
// own message covers (research R2).
@Injectable({ providedIn: 'root' })
export class SaveQueueService {
  private readonly toast = inject(ToastService);

  create(label: string, before?: () => Promise<unknown>): WriteQueue {
    return new WriteQueue({
      before,
      onError: (error) => {
        console.error(`Grimorio: failed to persist ${label}.`, error);
        if (!isClosedConnectionError(error)) {
          this.toast.show(DATA.saveFailed.label, DATA.saveFailed.text);
        }
      },
    });
  }
}
