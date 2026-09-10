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
 *
 * The two error fields are deliberately separate. One string serving both pages meant a failed
 * delete could still be on screen when the form opened, and a failed load could be reported twice
 * at once — an error belongs to the page that caused it.
 */
export interface ContactsState extends EntityState<ContactListItem> {
  readonly query: ContactQuery;
  readonly total: number;
  readonly loading: boolean;
  /** Something went wrong on the list: a failed load, or a delete that was refused. */
  readonly listError: string | null;
  /** The contact being edited, null while creating. Set before the detail arrives. */
  readonly editingId: string | null;
  readonly selected: ContactDetail | null;
  readonly selectedLoading: boolean;
  /** Something went wrong on the form, other than the field errors below. */
  readonly formError: string | null;
  readonly saving: boolean;
  /** Set once a save lands, so leaving the page does not ask about work already committed. */
  readonly saved: boolean;
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
  listError: null,
  editingId: null,
  selected: null,
  selectedLoading: false,
  formError: null,
  saving: false,
  saved: false,
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
      listError: null,
    })),
    on(contactsPageActions.refreshed, (state) => ({ ...state, loading: true, listError: null })),
    /**
     * The box is ahead of the request by the length of the debounce, so the table says it is
     * working from the first keystroke rather than sitting still for a third of a second.
     *
     * Only when the term would actually change what is on screen, though. A term too short to
     * search with, or the one already applied, will be dropped by `debounceSearch` — starting a
     * spinner for it would leave one that nothing ever stops. This is the same test the effect
     * makes, and the two have to agree.
     */
    on(contactsPageActions.searchChanged, (state, { search }) => ({
      ...state,
      loading: search !== state.query.search,
    })),
    on(contactsApiActions.loaded, (state, { result }) => ({
      // setAll, not upsert: each page replaces the previous one rather than accumulating.
      ...contactsAdapter.setAll([...result.items], state),
      total: result.total,
      loading: false,
      listError: null,
    })),
    on(contactsApiActions.loadFailed, (state, { message }) => ({
      ...state,
      loading: false,
      listError: message,
    })),

    on(contactFormActions.opened, (state, { id }) => ({
      ...state,
      editingId: id,
      selected: null,
      selectedLoading: id !== null,
      saving: false,
      saved: false,
      fieldErrors: null,
      conflict: false,
      formError: null,
    })),
    on(contactFormActions.reloadRequested, (state) => ({
      ...state,
      selectedLoading: true,
      conflict: false,
      formError: null,
    })),
    on(contactsApiActions.contactLoaded, (state, { contact }) => ({
      ...state,
      selected: contact,
      selectedLoading: false,
      formError: null,
    })),
    // The page says the contact could not be loaded on its own, so the message is not repeated
    // as a banner above it.
    on(contactsApiActions.contactLoadFailed, (state) => ({
      ...state,
      selectedLoading: false,
    })),

    on(contactFormActions.submitted, (state) => ({
      ...state,
      saving: true,
      saved: false,
      fieldErrors: null,
      conflict: false,
      formError: null,
    })),
    on(contactsApiActions.created, contactsApiActions.updated, (state) => ({
      ...state,
      saving: false,
      saved: true,
      fieldErrors: null,
      formError: null,
    })),
    on(contactsApiActions.saveFailed, (state, { error }) => ({
      ...state,
      saving: false,
      fieldErrors: error.fieldErrors,
      conflict: error.status === 409,
      // A 400 is already spelled out field by field, and a 409 has a banner of its own.
      formError: error.status === 400 || error.status === 409 ? null : error.message,
    })),

    on(contactsApiActions.deleteFailed, (state, { message }) => ({
      ...state,
      listError: message,
    })),
  ),

  extraSelectors: ({ selectContactsState, selectQuery, selectTotal }) => ({
    selectAllContacts: createSelector(
      selectContactsState,
      contactsAdapter.getSelectors().selectAll,
    ),
    /** p-table counts rows from zero; the query counts pages from one. */
    selectFirstRow: createSelector(selectQuery, (query) => (query.page - 1) * query.size),
    /**
     * Why the list is empty, which decides what to offer: a search that matched nothing wants a way
     * to clear it, and an address book with nothing in it wants a way to add the first contact.
     */
    selectEmptyReason: createSelector(
      selectTotal,
      selectQuery,
      (total, query): 'no-matches' | 'no-contacts' | null => {
        if (total > 0) {
          return null;
        }

        return query.search !== null && query.search !== '' ? 'no-matches' : 'no-contacts';
      },
    ),
  }),
});
