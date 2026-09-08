export type ContactSortField = 'surname' | 'firstName' | 'city' | 'dateOfBirth';

export type SortDirection = 'asc' | 'desc';

/** The list shape. It carries a masked IBAN because that is all the server will send. */
export interface ContactListItem {
  readonly id: string;
  readonly firstName: string;
  readonly surname: string;
  readonly dateOfBirth: string;
  readonly city: string;
  readonly country: string;
  readonly phoneNumber: string;
  readonly ibanMasked: string;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly size: number;
}

export interface ContactQuery {
  readonly search: string | null;
  readonly sort: ContactSortField;
  readonly direction: SortDirection;
  readonly page: number;
  readonly size: number;
}

export const defaultContactQuery: ContactQuery = {
  search: null,
  sort: 'surname',
  direction: 'asc',
  page: 1,
  size: 20,
};

/** What a lazy-load event from the table can speak about: paging and sorting, never the search. */
export type ContactListView = Pick<ContactQuery, 'page' | 'size' | 'sort' | 'direction'>;

/**
 * Whether the table is describing the view the store already holds. The table re-announces its
 * state more often than it changes, and this is what tells a genuine change from an echo.
 */
export function isSameListView(left: ContactListView, right: ContactListView): boolean {
  return (
    left.page === right.page &&
    left.size === right.size &&
    left.sort === right.sort &&
    left.direction === right.direction
  );
}

const sortFields: readonly ContactSortField[] = ['surname', 'firstName', 'city', 'dateOfBirth'];

/** Guards the two places a sort field arrives as a bare string: the URL and the table's events. */
export function isSortField(value: string | null | undefined): value is ContactSortField {
  return value !== null && value !== undefined && sortFields.includes(value as ContactSortField);
}

export interface ContactAddress {
  readonly street: string;
  readonly houseNumber: string | null;
  readonly postalCode: string;
  readonly city: string;
  readonly country: string;
}

/** The detail shape: the only one carrying the full IBAN and the version needed to save. */
export interface ContactDetail {
  readonly id: string;
  readonly firstName: string;
  readonly surname: string;
  readonly dateOfBirth: string;
  readonly address: ContactAddress;
  readonly phoneNumber: string;
  readonly iban: string;
  readonly version: number;
}

/** What the form produces, before it becomes a create or an update. */
export interface ContactInput {
  readonly firstName: string;
  readonly surname: string;
  readonly dateOfBirth: string;
  readonly address: ContactAddress;
  readonly phoneNumber: string;
  readonly iban: string;
}
