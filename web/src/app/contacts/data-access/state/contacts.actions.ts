import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ContactListItem, ContactQuery, PagedResult } from '../contact.model';

export const contactsPageActions = createActionGroup({
  source: 'Contacts Page',
  events: {
    Opened: props<{ query: Partial<ContactQuery> }>(),
    'Query Changed': props<{ query: Partial<ContactQuery> }>(),
    'Search Changed': props<{ search: string | null }>(),
    Refreshed: emptyProps(),
  },
});

export const contactsApiActions = createActionGroup({
  source: 'Contacts API',
  events: {
    Loaded: props<{ result: PagedResult<ContactListItem> }>(),
    'Load Failed': props<{ message: string }>(),
  },
});
