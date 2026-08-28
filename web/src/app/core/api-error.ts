import { HttpErrorResponse } from '@angular/common/http';

/**
 * A failed request in the shape the rest of the app wants: something to show a person, plus the
 * per-field messages a form needs to bind to its own controls.
 */
export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>> | null;
}

interface ProblemDetails {
  readonly title?: string;
  readonly detail?: string;
  readonly errors?: Record<string, string[]>;
}

export function toApiError(response: HttpErrorResponse): ApiError {
  const problem: ProblemDetails | null =
    response.error !== null && typeof response.error === 'object' ? response.error : null;

  return {
    status: response.status,
    message: describe(response, problem),
    fieldErrors: problem?.errors ?? null,
  };
}

/**
 * A dead API reaches the browser as status 0 when it is called directly, but as a 502 or 504 when a
 * proxy sits in front of it — which is how the dev server is set up. Both mean the same thing to a
 * person, so they get the same message.
 */
const unreachableStatuses: readonly number[] = [0, 502, 503, 504];

function describe(response: HttpErrorResponse, problem: ProblemDetails | null): string {
  if (unreachableStatuses.includes(response.status)) {
    return 'Cannot reach the server. Check that the API is running and try again.';
  }

  return problem?.detail ?? problem?.title ?? fallbackFor(response.status);
}

function fallbackFor(status: number): string {
  switch (status) {
    case 400:
      return 'Some of the details are not valid.';
    case 404:
      return 'That contact no longer exists.';
    case 409:
      return 'Someone else changed this contact while you were editing it.';
    default:
      return 'Something went wrong on the server. Try again in a moment.';
  }
}
