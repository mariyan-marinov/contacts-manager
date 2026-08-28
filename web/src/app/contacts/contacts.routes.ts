import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { contactsEffects } from './data-access/state/contacts.effects';
import { contactsFeature } from './data-access/state/contacts.feature';

/** State and effects are provided here, so they arrive with the feature rather than at bootstrap. */
export const contactsRoutes: Routes = [
  {
    path: '',
    providers: [provideState(contactsFeature), provideEffects(contactsEffects)],
    children: [
      {
        path: '',
        title: 'Contacts',
        loadComponent: () =>
          import('./feature-list/contacts-list.component').then((m) => m.ContactsListComponent),
      },
    ],
  },
];
