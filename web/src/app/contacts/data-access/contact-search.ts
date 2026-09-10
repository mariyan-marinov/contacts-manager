/**
 * How the search box behaves, in one place, because the two numbers below only make sense
 * together: the minimum decides *whether* a term is worth asking about and the debounce decides
 * *when*.
 *
 * A single character matches a large slice of any address book, so it is not a search — it is the
 * first keystroke of one. Waiting for a second character keeps the list still while someone starts
 * typing, and the debounce then waits for them to stop rather than sending a request per keystroke.
 *
 * Both are client-side judgements about a search box, not rules about a contact, which is why they
 * live here and not in `contact-rules.ts` alongside the limits the server also enforces.
 */

/** Characters, after trimming, before a term is worth a request. */
export const searchMinimumLength = 2;

/** How long typing has to settle before the term becomes a query. */
export const searchDebounceMs = 300;

/**
 * The box's text as a query value: the trimmed term once it is long enough to search with, and
 * `null` — meaning unfiltered — until then. Deleting back down to one character therefore clears
 * the filter rather than leaving a stale one applied to a term no longer on screen.
 */
export function toSearchQuery(term: string | null): string | null {
  const trimmed = (term ?? '').trim();

  return trimmed.length >= searchMinimumLength ? trimmed : null;
}

/** Whether there is something in the box that is not yet long enough to search with. */
export function isSearchTooShort(term: string): boolean {
  return term.trim() !== '' && toSearchQuery(term) === null;
}
