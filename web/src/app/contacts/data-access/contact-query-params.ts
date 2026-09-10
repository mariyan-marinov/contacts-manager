import { ParamMap } from '@angular/router';
import { toSearchQuery } from './contact-search';
import { ContactQuery, defaultContactQuery, isSortField } from './contact.model';

/**
 * The largest page and the longest search the API will accept. Asking for more is answered with a
 * 400, so a hand-edited URL is brought inside the limits rather than sent on to be refused.
 */
const maximumSize = 100;
const maximumSearchLength = 100;

/**
 * The query lives in the URL as well as the store, so a reload or a shared link lands on the same
 * view. Anything unrecognised falls back to the default rather than being passed to the server.
 */
export function parseContactQuery(params: ParamMap): Partial<ContactQuery> {
  const sort = params.get('sort');
  const direction = params.get('direction');

  return {
    // Held to the same minimum the box is, so a link carrying a single character lands on the
    // unfiltered list rather than on a search the UI would never have run.
    search: toSearchQuery(params.get('search')?.slice(0, maximumSearchLength) ?? null),
    sort: isSortField(sort) ? sort : defaultContactQuery.sort,
    direction: direction === 'desc' ? 'desc' : 'asc',
    page: positiveInteger(params.get('page'), defaultContactQuery.page),
    size: Math.min(positiveInteger(params.get('size'), defaultContactQuery.size), maximumSize),
  };
}

/**
 * The inverse of {@link parseContactQuery}. An empty search is omitted rather than written as a
 * blank parameter, so the URL says what it means and reparsing gives back the same query.
 */
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

/** Page and size come out of a URL anyone can edit, so anything but a counting number is refused. */
function positiveInteger(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
