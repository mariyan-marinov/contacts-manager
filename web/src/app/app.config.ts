import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { httpErrorInterceptor } from './core/http-error.interceptor';
import { appPreset } from './core/theme.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([httpErrorInterceptor])),
    providePrimeNG({
      theme: {
        preset: appPreset,
        // Dark mode is a deliberate choice the user makes, not something the OS imposes.
        options: { darkModeSelector: '.app-dark' },
      },
      ripple: true,
    }),
    // The toast and the confirm dialog live in the shell, so their services belong at the root.
    MessageService,
    ConfirmationService,
    // Empty at the root: each feature provides its own slice and effects when its route loads.
    provideStore(),
    provideEffects(),
    ...(isDevMode() ? [provideStoreDevtools({ maxAge: 25, connectInZone: false })] : []),
  ],
};
