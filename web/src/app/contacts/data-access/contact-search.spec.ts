import {
  isSearchTooShort,
  searchDebounceMs,
  searchMinimumLength,
  toSearchQuery,
} from './contact-search';

describe('toSearchQuery', () => {
  it('is null until the term is long enough to be worth a request', () => {
    expect(toSearchQuery('')).toBeNull();
    expect(toSearchQuery('b')).toBeNull();
    expect(toSearchQuery('ba')).toBe('ba');
    expect(toSearchQuery('bakker')).toBe('bakker');
  });

  it('measures the term after trimming, and sends what it measured', () => {
    expect(toSearchQuery('  b  ')).toBeNull();
    expect(toSearchQuery('  ba  ')).toBe('ba');
    expect(toSearchQuery('   ')).toBeNull();
  });

  it('treats an absent term as no search rather than as an empty one', () => {
    expect(toSearchQuery(null)).toBeNull();
  });

  /**
   * The box and the query part company here: dropping below the minimum has to clear the filter,
   * or the list would stay narrowed by a term no longer on screen.
   */
  it('clears the filter rather than keeping the last term that was long enough', () => {
    expect(toSearchQuery('ba')).toBe('ba');
    expect(toSearchQuery('b')).toBeNull();
  });
});

describe('isSearchTooShort', () => {
  it('is true only while there is something in the box that cannot be searched with', () => {
    expect(isSearchTooShort('')).toBe(false);
    expect(isSearchTooShort('   ')).toBe(false);
    expect(isSearchTooShort('b')).toBe(true);
    expect(isSearchTooShort(' b ')).toBe(true);
    expect(isSearchTooShort('ba')).toBe(false);
  });
});

describe('the search settings', () => {
  /** Both are quoted in the README and in RATIONALE; these pin the numbers those describe. */
  it('start searching at two characters, after typing settles for 300 ms', () => {
    expect(searchMinimumLength).toBe(2);
    expect(searchDebounceMs).toBe(300);
  });
});
