import { ParamMap } from '@angular/router';
import { ContactQuery, defaultContactQuery, isSortField } from './contact.model';

/**
 * The query lives in the URL as well as the store, so a reload or a shared link lands on the same
 * view. Anything unrecognised falls back to the default rather than being passed to the server.
 */
export function parseContactQuery(params: ParamMap): Partial<ContactQuery> {
  const sort = params.get('sort');
  const direction = params.get('direction');

  return {
    search: params.get('search'),
    sort: isSortField(sort) ? sort : defaultContactQuery.sort,
    direction: direction === 'desc' ? 'desc' : 'asc',
    page: positiveInteger(params.get('page'), defaultContactQuery.page),
    size: positiveInteger(params.get('size'), defaultContactQuery.size),
  };
}

export function toQueryParams(query: ContactQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    sort: query.sort,
    direction: query.direction,
    page: query.page,
    size: query.size,
  };

  if (query.search !== null && query.search !== '') {
    params['search'] = query.search;
  }

  return params;
}

function positiveInteger(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
