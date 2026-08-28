import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { unsavedChangesGuard } from '../core/unsaved-changes.guard';
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
      {
        path: 'new',
        title: 'New contact',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./feature-detail/contact-detail.component').then((m) => m.ContactDetailComponent),
      },
      {
        path: ':id',
        title: 'Edit contact',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./feature-detail/contact-detail.component').then((m) => m.ContactDetailComponent),
      },
    ],
  },
];
