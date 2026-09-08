import { Routes } from '@angular/router';

/**
 * Contacts is the only feature, so the app opens on it and an unknown URL lands there too rather
 * than on a blank page. The feature is loaded lazily, which is what lets it bring its own store.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'contacts' },
  {
    path: 'contacts',
    loadChildren: () => import('./contacts/contacts.routes').then((m) => m.contactsRoutes),
  },
  { path: '**', redirectTo: 'contacts' },
];
