import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';

function response(status: number, body: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body });
}

describe('toApiError', () => {
  // 0 is a direct call to a dead server; 502/504 is the same thing seen through the dev proxy.
  it.each([0, 502, 503, 504])('says the server is unreachable for status %i', (status) => {
    const error = toApiError(response(status));

    expect(error.message).toBe(
      'Cannot reach the server. Check that the API is running and try again.',
    );
    expect(error.fieldErrors).toBeNull();
  });

  it('keeps the per-field messages a form needs to bind', () => {
    const error = toApiError(
      response(400, {
        title: 'One or more validation errors occurred.',
        errors: { iban: ["'Iban' has an invalid checksum."] },
      }),
    );

    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ iban: ["'Iban' has an invalid checksum."] });
  });

  it('prefers the problem detail over its title', () => {
    const error = toApiError(
      response(409, {
        title: 'The contact was changed by someone else.',
        detail: 'Reload the contact and apply your changes to the current version.',
      }),
    );

    expect(error.message).toBe('Reload the contact and apply your changes to the current version.');
  });

  it('falls back to something a person can read when the body says nothing', () => {
    expect(toApiError(response(404)).message).toBe('That contact no longer exists.');
    expect(toApiError(response(500)).message).toBe(
      'Something went wrong on the server. Try again in a moment.',
    );
  });
});
