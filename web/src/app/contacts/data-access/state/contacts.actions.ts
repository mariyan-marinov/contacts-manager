import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ApiError } from '../../../core/api-error';
import {
  ContactDetail,
  ContactInput,
  ContactListItem,
  ContactQuery,
  PagedResult,
} from '../contact.model';

export const contactsPageActions = createActionGroup({
  source: 'Contacts Page',
  events: {
    Opened: props<{ query: Partial<ContactQuery> }>(),
    'Query Changed': props<{ query: Partial<ContactQuery> }>(),
    'Search Changed': props<{ search: string | null }>(),
    Refreshed: emptyProps(),
    'Delete Confirmed': props<{ id: string; name: string }>(),
  },
});

export const contactFormActions = createActionGroup({
  source: 'Contact Form',
  events: {
    /** id is null when creating, so one page serves both. */
    Opened: props<{ id: string | null }>(),
    Submitted: props<{ contact: ContactInput }>(),
    Abandoned: emptyProps(),
    'Reload Requested': emptyProps(),
  },
});

export const contactsApiActions = createActionGroup({
  source: 'Contacts API',
  events: {
    Loaded: props<{ result: PagedResult<ContactListItem> }>(),
    'Load Failed': props<{ message: string }>(),
    'Contact Loaded': props<{ contact: ContactDetail }>(),
    'Contact Load Failed': props<{ message: string }>(),
    Created: emptyProps(),
    Updated: emptyProps(),
    Deleted: props<{ name: string }>(),
    'Save Failed': props<{ error: ApiError }>(),
    'Delete Failed': props<{ message: string }>(),
  },
});
