import { ContactListItem, PagedResult, defaultContactQuery } from '../contact.model';
import { contactsApiActions, contactsPageActions } from './contacts.actions';
import { contactsFeature } from './contacts.feature';

function contact(id: string, surname: string): ContactListItem {
  return {
    id,
    firstName: 'Sanne',
    surname,
    dateOfBirth: '1988-04-12',
    city: 'Amsterdam',
    country: 'NL',
    phoneNumber: '+31 6 2145 8890',
    ibanMasked: 'NL91****4300',
  };
}

function page(items: ContactListItem[], total = items.length): PagedResult<ContactListItem> {
  return { items, total, page: 1, size: 20 };
}

const { reducer, name } = contactsFeature;

describe('contacts reducer', () => {
  const initial = reducer(undefined, { type: '@@init' });

  it('starts empty, not loading, on the default query', () => {
    expect(initial.ids.length).toBe(0);
    expect(initial.loading).toBe(false);
    expect(initial.query).toEqual(defaultContactQuery);
  });

  it('is named for the feature it provides', () => {
    expect(name).toBe('contacts');
  });

  it('merges a partial query rather than replacing it', () => {
    const state = reducer(initial, contactsPageActions.queryChanged({ query: { page: 3 } }));

    expect(state.query.page).toBe(3);
    expect(state.query.sort).toBe(defaultContactQuery.sort);
    expect(state.query.size).toBe(defaultContactQuery.size);
  });

  it('marks itself loading and clears any earlier error when a query changes', () => {
    const failed = reducer(initial, contactsApiActions.loadFailed({ message: 'gone wrong' }));
    const reloading = reducer(failed, contactsPageActions.queryChanged({ query: { page: 2 } }));

    expect(failed.error).toBe('gone wrong');
    expect(reloading.error).toBeNull();
    expect(reloading.loading).toBe(true);
  });

  it('replaces the previous page instead of accumulating rows', () => {
    const first = reducer(initial, contactsApiActions.loaded({ result: page([contact('1', 'Bakker'), contact('2', 'Brandt')], 4) }));
    const second = reducer(first, contactsApiActions.loaded({ result: page([contact('3', 'Cavendish')], 4) }));

    expect(first.ids).toEqual(['1', '2']);
    expect(second.ids).toEqual(['3']);
    expect(second.total).toBe(4);
  });

  it('stops loading and keeps the message when a load fails', () => {
    const loading = reducer(initial, contactsPageActions.opened({ query: {} }));
    const failed = reducer(loading, contactsApiActions.loadFailed({ message: 'Cannot reach the server.' }));

    expect(loading.loading).toBe(true);
    expect(failed.loading).toBe(false);
    expect(failed.error).toBe('Cannot reach the server.');
  });
});

describe('contacts selectors', () => {
  const loaded = reducer(
    reducer(undefined, { type: '@@init' }),
    contactsApiActions.loaded({ result: page([contact('1', 'Bakker'), contact('2', 'Brandt')], 30) }),
  );

  it('lists the contacts in the order the server sent them', () => {
    expect(contactsFeature.selectAllContacts.projector(loaded).map((c) => c.surname)).toEqual([
      'Bakker',
      'Brandt',
    ]);
  });

  it('translates a one-based page into the row the table starts at', () => {
    expect(contactsFeature.selectFirstRow.projector({ ...defaultContactQuery, page: 1 })).toBe(0);
    expect(contactsFeature.selectFirstRow.projector({ ...defaultContactQuery, page: 3, size: 20 })).toBe(40);
  });
});
