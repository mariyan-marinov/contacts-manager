import { convertToParamMap } from '@angular/router';
import { parseContactQuery, toQueryParams } from './contact-query-params';
import { ContactQuery, defaultContactQuery } from './contact.model';

function paramsOf(raw: Record<string, string>) {
  return convertToParamMap(raw);
}

describe('parseContactQuery', () => {
  it('reads a complete query out of the address bar', () => {
    const query = parseContactQuery(
      paramsOf({ search: 'ber', sort: 'city', direction: 'desc', page: '3', size: '50' }),
    );

    expect(query).toEqual({
      search: 'ber',
      sort: 'city',
      direction: 'desc',
      page: 3,
      size: 50,
    });
  });

  it('falls back to the defaults when the URL says nothing', () => {
    const query = parseContactQuery(paramsOf({}));

    expect(query.sort).toBe(defaultContactQuery.sort);
    expect(query.direction).toBe('asc');
    expect(query.page).toBe(defaultContactQuery.page);
    expect(query.size).toBe(defaultContactQuery.size);
    expect(query.search).toBeNull();
  });

  it('refuses a sort field the server would reject', () => {
    expect(parseContactQuery(paramsOf({ sort: 'iban' })).sort).toBe('surname');
    expect(parseContactQuery(paramsOf({ sort: '1; drop table contacts' })).sort).toBe('surname');
  });

  it('refuses paging values that are not positive whole numbers', () => {
    expect(parseContactQuery(paramsOf({ page: '0' })).page).toBe(1);
    expect(parseContactQuery(paramsOf({ page: '-2' })).page).toBe(1);
    expect(parseContactQuery(paramsOf({ page: 'two' })).page).toBe(1);
    expect(parseContactQuery(paramsOf({ size: '2.5' })).size).toBe(20);
  });
});

describe('toQueryParams', () => {
  it('round-trips a query through the URL unchanged', () => {
    const original: ContactQuery = {
      search: 'ber',
      sort: 'dateOfBirth',
      direction: 'desc',
      page: 4,
      size: 10,
    };

    const roundTripped = parseContactQuery(
      paramsOf(
        Object.fromEntries(
          Object.entries(toQueryParams(original)).map(([key, value]) => [key, String(value)]),
        ),
      ),
    );

    expect(roundTripped).toEqual(original);
  });

  it('leaves an empty search out of the URL entirely', () => {
    expect(toQueryParams({ ...defaultContactQuery, search: null })).not.toHaveProperty('search');
    expect(toQueryParams({ ...defaultContactQuery, search: '' })).not.toHaveProperty('search');
  });
});
