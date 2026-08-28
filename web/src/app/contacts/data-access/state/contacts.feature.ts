import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { ContactListItem, ContactQuery, defaultContactQuery } from '../contact.model';
import { contactsApiActions, contactsPageActions } from './contacts.actions';

/**
 * The entity map holds list items only. The detail shape carries a full IBAN and a version, so it
 * gets its own slice rather than sharing ids with a different shape.
 */
export interface ContactsState extends EntityState<ContactListItem> {
  readonly query: ContactQuery;
  readonly total: number;
  readonly loading: boolean;
  readonly error: string | null;
}

export const contactsAdapter = createEntityAdapter<ContactListItem>({
  selectId: (contact) => contact.id,
});

const initialState: ContactsState = contactsAdapter.getInitialState({
  query: defaultContactQuery,
  total: 0,
  loading: false,
  error: null,
});

export const contactsFeature = createFeature({
  name: 'contacts',
  reducer: createReducer(
    initialState,
    on(contactsPageActions.opened, contactsPageActions.queryChanged, (state, { query }) => ({
      ...state,
      query: { ...state.query, ...query },
      loading: true,
      error: null,
    })),
    on(contactsPageActions.refreshed, (state) => ({ ...state, loading: true, error: null })),
    on(contactsApiActions.loaded, (state, { result }) => ({
      // setAll, not upsert: each page replaces the previous one rather than accumulating.
      ...contactsAdapter.setAll([...result.items], state),
      total: result.total,
      loading: false,
      error: null,
    })),
    on(contactsApiActions.loadFailed, (state, { message }) => ({
      ...state,
      loading: false,
      error: message,
    })),
  ),
  extraSelectors: ({ selectContactsState, selectQuery, selectTotal }) => ({
    selectAllContacts: createSelector(
      selectContactsState,
      contactsAdapter.getSelectors().selectAll,
    ),
    /** p-table counts rows from zero; the query counts pages from one. */
    selectFirstRow: createSelector(selectQuery, (query) => (query.page - 1) * query.size),
    selectIsEmpty: createSelector(
      selectTotal,
      selectQuery,
      (total, query) => total === 0 && query.search !== null,
    ),
  }),
});
