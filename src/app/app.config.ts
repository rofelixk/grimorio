import { ApplicationConfig, provideAppInitializer, provideBrowserGlobalErrorListeners, inject, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { CardService } from '@services/card.service';
import { StorageLocationService } from '@services/storage-location.service';
import { DeckService } from '@services/deck.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Holds initial render until IndexedDB-backed state has hydrated, so no
    // component ever observes an empty, not-yet-loaded collection.
    provideAppInitializer(() => {
      const cardService = inject(CardService);
      const locationService = inject(StorageLocationService);
      const deckService = inject(DeckService);
      return Promise.all([cardService.whenReady(), locationService.whenReady(), deckService.whenReady()]);
    }),
  ],
};
