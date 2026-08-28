import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import {
  ContactDetail,
  ContactListItem,
  ContactQuery,
  defaultContactQuery,
} from '../contact.model';
import { contactFormActions, contactsApiActions, contactsPageActions } from './contacts.actions';

/**
 * The entity map holds list items only. The detail shape carries a full IBAN and a version, so it
 * lives in its own slice rather than sharing ids with a different shape.
 */
export interface ContactsState extends EntityState<ContactListItem> {
  readonly query: ContactQuery;
  readonly total: number;
  readonly loading: boolean;
  readonly error: string | null;
  /** The contact being edited, null while creating. Set before the detail arrives. */
  readonly editingId: string | null;
  readonly selected: ContactDetail | null;
  readonly selectedLoading: boolean;
  readonly saving: boolean;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>> | null;
  readonly conflict: boolean;
}

export const contactsAdapter = createEntityAdapter<ContactListItem>({
  selectId: (contact) => contact.id,
});

const initialState: ContactsState = contactsAdapter.getInitialState({
  query: defaultContactQuery,
  total: 0,
  loading: false,
  error: null,
  editingId: null,
  selected: null,
  selectedLoading: false,
  saving: false,
  fieldErrors: null,
  conflict: false,
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

    on(contactFormActions.opened, (state, { id }) => ({
      ...state,
      editingId: id,
      selected: null,
      selectedLoading: id !== null,
      saving: false,
      fieldErrors: null,
      conflict: false,
      error: null,
    })),
    on(contactFormActions.reloadRequested, (state) => ({
      ...state,
      selectedLoading: true,
      conflict: false,
    })),
    on(contactsApiActions.contactLoaded, (state, { contact }) => ({
      ...state,
      selected: contact,
      selectedLoading: false,
    })),
    on(contactsApiActions.contactLoadFailed, (state, { message }) => ({
      ...state,
      selectedLoading: false,
      error: message,
    })),

    on(contactFormActions.submitted, (state) => ({
      ...state,
      saving: true,
      fieldErrors: null,
      conflict: false,
    })),
    on(contactsApiActions.created, contactsApiActions.updated, (state) => ({
      ...state,
      saving: false,
      fieldErrors: null,
    })),
    on(contactsApiActions.saveFailed, (state, { error }) => ({
      ...state,
      saving: false,
      fieldErrors: error.fieldErrors,
      conflict: error.status === 409,
      error: error.status === 400 ? null : error.message,
    })),

    on(contactsApiActions.deleteFailed, (state, { message }) => ({ ...state, error: message })),
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
