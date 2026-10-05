import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, inject, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { ProfileStore } from '@services/profile-store.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { PlanechaseGameService } from '@services/planechase-game.service';
import { StoragePersistenceService } from '@services/storage-persistence.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Holds initial render until the profile registry, the restored active profile's data and
    // the device's Planechase game have hydrated, so no component ever observes pre-hydration state.
    provideAppInitializer(async () => {
      const store = inject(ProfileStore);
      const session = inject(ProfileSessionService);
      const planechase = inject(PlanechaseGameService);
      const persistence = inject(StoragePersistenceService);
      await store.whenReady();
      // Fire-and-forget (FR-006): startup never waits on the browser's answer.
      void persistence.request('startup');
      await Promise.all([session.whenReady(), planechase.whenReady()]);
    }),
  ],
};
