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

const sortFields: readonly ContactSortField[] = ['surname', 'firstName', 'city', 'dateOfBirth'];

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
