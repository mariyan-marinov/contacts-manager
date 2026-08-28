import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'contacts' },
  {
    path: 'contacts',
    loadChildren: () => import('./contacts/contacts.routes').then((m) => m.contactsRoutes),
  },
  { path: '**', redirectTo: 'contacts' },
];
