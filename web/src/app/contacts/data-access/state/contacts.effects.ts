import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, map, of, switchMap, take } from 'rxjs';
import { ApiError } from '../../../core/api-error';
import { ContactsApi } from '../contacts.api';
import { contactsApiActions, contactsPageActions } from './contacts.actions';
import { contactsFeature } from './contacts.feature';

const searchDebounceMs = 300;

export const loadContacts = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi), store = inject(Store)) =>
    actions$.pipe(
      ofType(
        contactsPageActions.opened,
        contactsPageActions.queryChanged,
        contactsPageActions.refreshed,
      ),
      // The reducer has already merged the new parameters, so the store holds what to ask for.
      switchMap(() =>
        store.select(contactsFeature.selectQuery).pipe(
          take(1),
          switchMap((query) =>
            api.list(query).pipe(
              map((result) => contactsApiActions.loaded({ result })),
              catchError((error: ApiError) =>
                of(contactsApiActions.loadFailed({ message: error.message })),
              ),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

/** Typing should not fire a request per keystroke, and a new search belongs on page one. */
export const debounceSearch = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(contactsPageActions.searchChanged),
      debounceTime(searchDebounceMs),
      map(({ search }) => contactsPageActions.queryChanged({ query: { search, page: 1 } })),
    ),
  { functional: true },
);

export const contactsEffects = { loadContacts, debounceSearch };
