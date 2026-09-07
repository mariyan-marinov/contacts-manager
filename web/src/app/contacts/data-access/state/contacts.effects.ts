import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { catchError, debounceTime, filter, map, of, switchMap, take, tap } from 'rxjs';
import { ApiError } from '../../../core/api-error';
import { toQueryParams } from '../contact-query-params';
import { ContactsApi } from '../contacts.api';
import { contactFormActions, contactsApiActions, contactsPageActions } from './contacts.actions';
import { contactsFeature } from './contacts.feature';

const searchDebounceMs = 300;
const toastLifeMs = 4000;

type OutcomeAction =
  | ReturnType<typeof contactsApiActions.created>
  | ReturnType<typeof contactsApiActions.updated>
  | ReturnType<typeof contactsApiActions.deleted>
  | ReturnType<typeof contactsApiActions.deleteFailed>;

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

export const loadContact = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactFormActions.opened, contactFormActions.reloadRequested),
      switchMap(() =>
        store.select(contactsFeature.selectEditingId).pipe(
          take(1),
          // Creating a contact has nothing to fetch.
          filter((id): id is string => id !== null),
          switchMap((id) =>
            api.getById(id).pipe(
              map((contact) => contactsApiActions.contactLoaded({ contact })),
              catchError((error: ApiError) =>
                of(contactsApiActions.contactLoadFailed({ message: error.message })),
              ),
            ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const saveContact = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactFormActions.submitted),
      switchMap(({ contact }) =>
        store.select(contactsFeature.selectSelected).pipe(
          take(1),
          switchMap((selected) =>
            selected === null
              ? api.create(contact).pipe(
                  map(() => contactsApiActions.created()),
                  catchError((error: ApiError) => of(contactsApiActions.saveFailed({ error }))),
                )
              : // The version the form was loaded with is what makes a stale save fail.
                api.update(selected.id, contact, selected.version).pipe(
                  map(() => contactsApiActions.updated()),
                  catchError((error: ApiError) => of(contactsApiActions.saveFailed({ error }))),
                ),
          ),
        ),
      ),
    ),
  { functional: true },
);

export const deleteContact = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi)) =>
    actions$.pipe(
      ofType(contactsPageActions.deleteConfirmed),
      switchMap(({ id, name }) =>
        api.remove(id).pipe(
          map(() => contactsApiActions.deleted({ name })),
          catchError((error: ApiError) =>
            of(contactsApiActions.deleteFailed({ message: error.message })),
          ),
        ),
      ),
    ),
  { functional: true },
);

/** A delete leaves the current page one row short, so the page is asked for again. */
export const reloadAfterDelete = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(contactsApiActions.deleted),
      map(() => contactsPageActions.refreshed()),
    ),
  { functional: true },
);

/**
 * Leaving the form returns to the list the user came from, not to a fresh one: the query goes
 * back into the URL, so the page size they chose and the search they typed are still there.
 */
export const returnToList = createEffect(
  (actions$ = inject(Actions), router = inject(Router), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactsApiActions.created, contactsApiActions.updated, contactFormActions.abandoned),
      switchMap(() => store.select(contactsFeature.selectQuery).pipe(take(1))),
      tap((query) => void router.navigate(['/contacts'], { queryParams: toQueryParams(query) })),
    ),
  { functional: true, dispatch: false },
);

export const announceOutcome = createEffect(
  (actions$ = inject(Actions), messages = inject(MessageService)) =>
    actions$.pipe(
      ofType(
        contactsApiActions.created,
        contactsApiActions.updated,
        contactsApiActions.deleted,
        contactsApiActions.deleteFailed,
      ),
      tap((action: OutcomeAction) => messages.add(toastFor(action))),
    ),
  { functional: true, dispatch: false },
);

export const contactsEffects = {
  loadContacts,
  debounceSearch,
  loadContact,
  saveContact,
  deleteContact,
  reloadAfterDelete,
  returnToList,
  announceOutcome,
};

function toastFor(action: OutcomeAction): ToastMessageOptions {
  switch (action.type) {
    case contactsApiActions.created.type:
      return { severity: 'success', summary: 'Contact added', life: toastLifeMs };
    case contactsApiActions.updated.type:
      return { severity: 'success', summary: 'Changes saved', life: toastLifeMs };
    case contactsApiActions.deleted.type:
      return { severity: 'success', summary: `${action.name} deleted`, life: toastLifeMs };
    default:
      return {
        severity: 'error',
        summary: 'Could not delete',
        detail: action.message,
        life: toastLifeMs,
      };
  }
}
