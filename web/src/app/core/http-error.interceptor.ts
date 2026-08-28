import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { toApiError } from './api-error';

/**
 * Turns every transport failure into an ApiError before it reaches an effect, so nothing downstream
 * has to know about HttpErrorResponse or guess at a message to show.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((response: HttpErrorResponse) => throwError(() => toApiError(response))),
  );
