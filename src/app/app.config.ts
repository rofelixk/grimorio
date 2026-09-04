import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { TOKEN_CLIENTE_SUPABASE, criarClienteSupabaseNavegador } from '@shared/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: TOKEN_CLIENTE_SUPABASE, useFactory: criarClienteSupabaseNavegador },
  ]
};
