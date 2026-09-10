import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { Store, provideState, provideStore } from '@ngrx/store';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiError } from '../../../core/api-error';
import { ContactListItem, PagedResult } from '../contact.model';
import { ContactsApi } from '../contacts.api';
import { contactFormActions, contactsApiActions, contactsPageActions } from './contacts.actions';
import { contactsEffects } from './contacts.effects';
import { contactsFeature } from './contacts.feature';
import { searchDebounceMs } from '../contact-search';

const emptyPage: PagedResult<ContactListItem> = { items: [], total: 0, page: 1, size: 20 };

/**
 * Actions are dispatched through the real store rather than pushed into a stub stream, because the
 * effect depends on the reducer having already merged the new query — which is exactly the order
 * NgRx guarantees in the running app.
 */
function configure(api: Partial<ContactsApi>): Store {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideStore(),
      provideState(contactsFeature),
      provideEffects(),
      { provide: ContactsApi, useValue: api },
    ],
  });

  return TestBed.inject(Store);
}

function run(effect: () => unknown): Observable<unknown> {
  return TestBed.runInInjectionContext(effect) as Observable<unknown>;
}

/** The app is zoneless, so there is no fakeAsync/tick here — Vitest owns the clock. */
function withFakeTimers(body: () => void): void {
  vi.useFakeTimers();

  try {
    body();
  } finally {
    vi.useRealTimers();
  }
}

describe('loadContacts', () => {
  it('asks the API for the query the store holds and reports what came back', async () => {
    let requestedPage = 0;
    const store = configure({
      list: (query) => {
        requestedPage = query.page;
        return of(emptyPage);
      },
    });

    const dispatched = firstValueFrom(run(contactsEffects.loadContacts));
    store.dispatch(contactsPageActions.queryChanged({ query: { page: 4 } }));

    expect(await dispatched).toEqual(contactsApiActions.loaded({ result: emptyPage }));
    expect(requestedPage).toBe(4);
  });

  it('turns a failed request into a message rather than letting it escape', async () => {
    const failure: ApiError = { status: 0, message: 'Cannot reach the server.', fieldErrors: null };
    const store = configure({ list: () => throwError(() => failure) });

    const dispatched = firstValueFrom(run(contactsEffects.loadContacts));
    store.dispatch(contactsPageActions.opened({ query: {} }));

    expect(await dispatched).toEqual(
      contactsApiActions.loadFailed({ message: 'Cannot reach the server.' }),
    );
  });

  it('reloads on refresh without changing the query', async () => {
    let calls = 0;
    const store = configure({
      list: () => {
        calls += 1;
        return of(emptyPage);
      },
    });

    const dispatched = firstValueFrom(run(contactsEffects.loadContacts));
    store.dispatch(contactsPageActions.refreshed());

    await dispatched;
    expect(calls).toBe(1);
  });
});

describe('debounceSearch', () => {
  // The app is zoneless, so there is no fakeAsync/tick here — Vitest owns the clock.
  it('waits for typing to settle, then searches from page one', () => {
    vi.useFakeTimers();

    try {
      const store = configure({ list: () => of(emptyPage) });
      const dispatched: unknown[] = [];
      const subscription = run(contactsEffects.debounceSearch).subscribe((action) =>
        dispatched.push(action),
      );

      store.dispatch(contactsPageActions.searchChanged({ search: 'b' }));
      store.dispatch(contactsPageActions.searchChanged({ search: 'be' }));
      store.dispatch(contactsPageActions.searchChanged({ search: 'ber' }));

      vi.advanceTimersByTime(299);
      expect(dispatched).toEqual([]);

      vi.advanceTimersByTime(1);
      expect(dispatched).toEqual([
        contactsPageActions.queryChanged({ query: { search: 'ber', page: 1 } }),
      ]);

      subscription.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * A single character is the start of a search rather than a search, so the box sends null and
   * nothing should be asked for — the list is already unfiltered.
   */
  it('asks for nothing when the term settles too short to search with', () => {
    withFakeTimers(() => {
      const store = configure({ list: () => of(emptyPage) });
      const dispatched: unknown[] = [];
      const subscription = run(contactsEffects.debounceSearch).subscribe((action) =>
        dispatched.push(action),
      );

      store.dispatch(contactsPageActions.searchChanged({ search: null }));
      vi.advanceTimersByTime(searchDebounceMs);

      expect(dispatched).toEqual([]);
      subscription.unsubscribe();
    });
  });

  it('clears the filter when the term drops back below the minimum', () => {
    withFakeTimers(() => {
      const store = configure({ list: () => of(emptyPage) });
      store.dispatch(contactsPageActions.queryChanged({ query: { search: 'ber' } }));

      const dispatched: unknown[] = [];
      const subscription = run(contactsEffects.debounceSearch).subscribe((action) =>
        dispatched.push(action),
      );

      store.dispatch(contactsPageActions.searchChanged({ search: null }));
      vi.advanceTimersByTime(searchDebounceMs);

      expect(dispatched).toEqual([
        contactsPageActions.queryChanged({ query: { search: null, page: 1 } }),
      ]);
      subscription.unsubscribe();
    });
  });

  /**
   * Typing a letter and deleting it again leaves the term that was already applied. Compared
   * against the previous keystroke this looked like a change; compared against what is applied it
   * is not one.
   */
  it('asks for nothing when the term settles back on the search already applied', () => {
    withFakeTimers(() => {
      const store = configure({ list: () => of(emptyPage) });
      store.dispatch(contactsPageActions.queryChanged({ query: { search: 'ber' } }));

      const dispatched: unknown[] = [];
      const subscription = run(contactsEffects.debounceSearch).subscribe((action) =>
        dispatched.push(action),
      );

      store.dispatch(contactsPageActions.searchChanged({ search: 'berg' }));
      store.dispatch(contactsPageActions.searchChanged({ search: 'ber' }));
      vi.advanceTimersByTime(searchDebounceMs);

      expect(dispatched).toEqual([]);
      subscription.unsubscribe();
    });
  });
});

describe('saveContact', () => {
  const input = {
    firstName: 'Sanne',
    surname: 'Bakker',
    dateOfBirth: '1988-04-12',
    address: {
      street: 'Keizersgracht',
      houseNumber: '241',
      postalCode: '1016 EA',
      city: 'Amsterdam',
      country: 'NL',
    },
    phoneNumber: '+31 6 2145 8890',
    iban: 'NL91ABNA0417164300',
  };

  const detail = { ...input, id: 'contact-1', version: 7 };

  it('creates when nothing is selected', async () => {
    let created = false;
    const store = configure({
      create: () => {
        created = true;
        return of(undefined);
      },
    });

    const dispatched = firstValueFrom(run(contactsEffects.saveContact));
    store.dispatch(contactFormActions.submitted({ contact: input }));

    expect(await dispatched).toEqual(contactsApiActions.created());
    expect(created).toBe(true);
  });

  it('updates with the version the form was loaded with', async () => {
    let sentVersion = 0;
    let sentId = '';
    const store = configure({
      update: (id, _contact, version) => {
        sentId = id;
        sentVersion = version;
        return of(undefined);
      },
    });
    // The route is what says this is an edit, so the page reports it before the detail arrives.
    store.dispatch(contactFormActions.opened({ id: detail.id }));
    store.dispatch(contactsApiActions.contactLoaded({ contact: detail }));

    const dispatched = firstValueFrom(run(contactsEffects.saveContact));
    store.dispatch(contactFormActions.submitted({ contact: input }));

    expect(await dispatched).toEqual(contactsApiActions.updated());
    expect(sentId).toBe(detail.id);
    expect(sentVersion).toBe(7);
  });

  /**
   * The route said which contact is being edited, so a detail that never arrived must not turn the
   * save into a second copy of it. Keying this off `selected` instead would do exactly that.
   */
  it('updates rather than creates when the contact being edited failed to load', async () => {
    let created = false;
    let updated = false;
    const store = configure({
      create: () => {
        created = true;
        return of(undefined);
      },
      update: () => {
        updated = true;
        return of(undefined);
      },
    });
    store.dispatch(contactFormActions.opened({ id: detail.id }));
    store.dispatch(contactsApiActions.contactLoadFailed({ message: 'Cannot reach the server.' }));

    const dispatched = firstValueFrom(run(contactsEffects.saveContact));
    store.dispatch(contactFormActions.submitted({ contact: input }));

    await dispatched;

    expect(created).toBe(false);
    expect(updated).toBe(true);
  });

  /** A second click while a save is in flight is ignored, not raced against the first. */
  it('ignores a second submit while the first is still going', async () => {
    let calls = 0;
    const store = configure({
      create: () => {
        calls += 1;
        return new Observable<void>(() => {
          // Never settles, so the first save is still in flight when the second arrives.
        });
      },
    });

    const effect = run(contactsEffects.saveContact) as Observable<unknown>;
    const subscription = effect.subscribe();

    store.dispatch(contactFormActions.submitted({ contact: input }));
    store.dispatch(contactFormActions.submitted({ contact: input }));

    subscription.unsubscribe();

    expect(calls).toBe(1);
  });

  it('keeps a 400 as field errors rather than a page-level message', async () => {
    const failure: ApiError = {
      status: 400,
      message: 'Some of the details are not valid.',
      fieldErrors: { 'address.city': ["'City' must not be empty."] },
    };
    const store = configure({ create: () => throwError(() => failure) });

    const dispatched = firstValueFrom(run(contactsEffects.saveContact));
    store.dispatch(contactFormActions.submitted({ contact: input }));

    expect(await dispatched).toEqual(contactsApiActions.saveFailed({ error: failure }));
  });
});

describe('returnToList', () => {
  /**
   * Going back to a bare /contacts would let the URL fall back to the defaults, which is how a
   * page size the user had chosen used to turn back into twenty the moment they saved.
   */
  function navigationAfter(action: unknown) {
    const store = configure({ list: () => of(emptyPage) });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    store.dispatch(
      contactsPageActions.queryChanged({ query: { page: 3, size: 10, search: 'ber' } }),
    );

    const subscription = run(contactsEffects.returnToList).subscribe();
    store.dispatch(action as never);
    subscription.unsubscribe();

    return navigate;
  }

  it('carries the query the list was showing back into the URL after a save', () => {
    const navigate = navigationAfter(contactsApiActions.updated());

    expect(navigate).toHaveBeenCalledWith(['/contacts'], {
      queryParams: { sort: 'surname', direction: 'asc', page: 3, size: 10, search: 'ber' },
    });
  });

  it('does the same when the form is abandoned rather than saved', () => {
    const navigate = navigationAfter(contactFormActions.abandoned());

    expect(navigate).toHaveBeenCalledWith(['/contacts'], {
      queryParams: { sort: 'surname', direction: 'asc', page: 3, size: 10, search: 'ber' },
    });
  });
});
