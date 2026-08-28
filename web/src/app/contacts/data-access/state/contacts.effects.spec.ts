import { TestBed } from '@angular/core/testing';
import { provideEffects } from '@ngrx/effects';
import { Store, provideState, provideStore } from '@ngrx/store';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ApiError } from '../../../core/api-error';
import { ContactListItem, PagedResult } from '../contact.model';
import { ContactsApi } from '../contacts.api';
import { contactsApiActions, contactsPageActions } from './contacts.actions';
import { contactsEffects } from './contacts.effects';
import { contactsFeature } from './contacts.feature';

const emptyPage: PagedResult<ContactListItem> = { items: [], total: 0, page: 1, size: 20 };

/**
 * Actions are dispatched through the real store rather than pushed into a stub stream, because the
 * effect depends on the reducer having already merged the new query — which is exactly the order
 * NgRx guarantees in the running app.
 */
function configure(api: Partial<ContactsApi>): Store {
  TestBed.configureTestingModule({
    providers: [
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
});
