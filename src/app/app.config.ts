import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, inject, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { ProfileStore } from '@services/profile-store.service';
import { ProfileSessionService } from '@services/profile-session.service';
import { runLegacyCleanup } from './core/db/legacy-cleanup';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Holds initial render until the profile registry and the restored active profile's
    // data have hydrated, so no component ever observes pre-hydration state.
    provideAppInitializer(async () => {
      const store = inject(ProfileStore);
      const session = inject(ProfileSessionService);
      await runLegacyCleanup();
      await store.whenReady();
      await session.whenReady();
    }),
  ],
};
