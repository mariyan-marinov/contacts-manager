import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import {
  EMPTY,
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
} from 'rxjs';
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

/**
 * `switchMap` is right here and only here: a newer page supersedes an older one, so abandoning the
 * request in flight is exactly what should happen. The write effects below use operators that
 * cannot abandon a request the server may already have committed.
 */
export const loadContacts = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi), store = inject(Store)) =>
    actions$.pipe(
      ofType(
        contactsPageActions.opened,
        contactsPageActions.queryChanged,
        contactsPageActions.refreshed,
      ),
      // The reducer has already merged the new parameters, so the store holds what to ask for.
      concatLatestFrom(() => store.select(contactsFeature.selectQuery)),
      switchMap(([, query]) =>
        api.list(query).pipe(
          map((result) => contactsApiActions.loaded({ result })),
          catchError((error: ApiError) =>
            of(contactsApiActions.loadFailed({ message: error.message })),
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
      // Typing a letter and deleting it again leaves the same search, and needs no second request.
      distinctUntilChanged((before, after) => before.search === after.search),
      map(({ search }) => contactsPageActions.queryChanged({ query: { search, page: 1 } })),
    ),
  { functional: true },
);

export const loadContact = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactFormActions.opened, contactFormActions.reloadRequested),
      concatLatestFrom(() => store.select(contactsFeature.selectEditingId)),
      switchMap(([, id]) =>
        // Creating a contact has nothing to fetch.
        id === null
          ? EMPTY
          : api.getById(id).pipe(
              map((contact) => contactsApiActions.contactLoaded({ contact })),
              catchError((error: ApiError) =>
                of(contactsApiActions.contactLoadFailed({ message: error.message })),
              ),
            ),
      ),
    ),
  { functional: true },
);

/**
 * `exhaustMap`, so a second click on Save is ignored rather than cancelling the request already in
 * flight — cancelling only abandons the response, and the server may well have committed the write.
 *
 * Whether this creates or updates is decided by `editingId`, which is what the route said, rather
 * than by whether a contact happens to have loaded: a failed load must not turn a save into a
 * second copy of the contact being edited.
 */
export const saveContact = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactFormActions.submitted),
      concatLatestFrom(() => [
        store.select(contactsFeature.selectEditingId),
        store.select(contactsFeature.selectSelected),
      ]),
      exhaustMap(([{ contact }, editingId, selected]) =>
        editingId === null
          ? api.create(contact).pipe(
              map(() => contactsApiActions.created()),
              catchError((error: ApiError) => of(contactsApiActions.saveFailed({ error }))),
            )
          : // The version the form was loaded with is what makes a stale save fail.
            api.update(editingId, contact, selected?.version ?? 0).pipe(
              map(() => contactsApiActions.updated()),
              catchError((error: ApiError) => of(contactsApiActions.saveFailed({ error }))),
            ),
      ),
    ),
  { functional: true },
);

/**
 * `mergeMap`, not `switchMap`: deleting two contacts in quick succession must delete both, and a
 * request already sent cannot be taken back by dropping its response.
 */
export const deleteContact = createEffect(
  (actions$ = inject(Actions), api = inject(ContactsApi)) =>
    actions$.pipe(
      ofType(contactsPageActions.deleteConfirmed),
      mergeMap(({ id, name }) =>
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

/**
 * A delete leaves the current page one row short, so the page is asked for again — and if it was
 * the last row on the last page, a step back, because an empty page nobody chose to visit reads as
 * a bug rather than as the end of the list.
 */
export const reloadAfterDelete = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactsApiActions.deleted),
      concatLatestFrom(() => [
        store.select(contactsFeature.selectQuery),
        store.select(contactsFeature.selectTotal),
      ]),
      map(([, query, total]) => {
        // The total still counts the row just removed, so the page that is about to be empty is
        // the one whose first row no longer exists.
        const remaining = total - 1;
        const stranded = query.page > 1 && (query.page - 1) * query.size >= remaining;

        return stranded
          ? contactsPageActions.queryChanged({ query: { page: query.page - 1 } })
          : contactsPageActions.refreshed();
      }),
    ),
  { functional: true },
);

/**
 * The URL is the query's second home, so a reload or a shared link lands on the same view. It is
 * written here rather than from the list component, so there is one place that decides what the
 * address bar says. `replaceUrl`, because paging is not a browser-history event — and on `opened`
 * too, so a hand-edited URL asking for more rows than the API allows is corrected to what was
 * actually loaded.
 */
export const syncUrlWithQuery = createEffect(
  (actions$ = inject(Actions), router = inject(Router), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactsPageActions.opened, contactsPageActions.queryChanged),
      concatLatestFrom(() => store.select(contactsFeature.selectQuery)),
      tap(
        ([, query]) =>
          void router.navigate(['/contacts'], {
            queryParams: toQueryParams(query),
            replaceUrl: true,
          }),
      ),
    ),
  { functional: true, dispatch: false },
);

/**
 * Leaving the form returns to the list the user came from, not to a fresh one: the query goes
 * back into the URL, so the page size they chose and the search they typed are still there.
 */
export const returnToList = createEffect(
  (actions$ = inject(Actions), router = inject(Router), store = inject(Store)) =>
    actions$.pipe(
      ofType(contactsApiActions.created, contactsApiActions.updated, contactFormActions.abandoned),
      concatLatestFrom(() => store.select(contactsFeature.selectQuery)),
      tap(
        ([, query]) => void router.navigate(['/contacts'], { queryParams: toQueryParams(query) }),
      ),
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
  syncUrlWithQuery,
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
