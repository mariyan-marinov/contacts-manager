import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { unsavedChangesGuard } from '../core/unsaved-changes.guard';
import { contactsEffects } from './data-access/state/contacts.effects';
import { contactsFeature } from './data-access/state/contacts.feature';

/**
 * State and effects are provided here, so they arrive with the feature rather than at bootstrap.
 *
 * `:id` reads a contact and `:id/edit` changes one, which is what lets a row be opened without
 * putting every field of it within reach of a stray keystroke. Only the two routes that hold a form
 * ask before being left.
 */
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
        path: ':id/edit',
        title: 'Edit contact',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./feature-detail/contact-detail.component').then((m) => m.ContactDetailComponent),
      },
      {
        path: ':id',
        title: 'Contact',
        loadComponent: () =>
          import('./feature-view/contact-view.component').then((m) => m.ContactViewComponent),
      },
    ],
  },
];
