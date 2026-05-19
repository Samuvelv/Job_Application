// src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, switchMap, catchError, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
// Use EMPTY_TOKEN sentinel so queued requests can detect failure vs. success
const refreshSubject = new BehaviorSubject<string | null>(null);

const REFRESH_FAILED = '__REFRESH_FAILED__';

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const token = auth.getToken();

  // Attach token to every non-refresh request
  const authReq = token && !req.url.includes('/auth/refresh')
    ? addToken(req, token)
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && err.error?.code === 'TOKEN_EXPIRED') {
        return handle401(req, next, auth);
      }
      return throwError(() => err);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return auth.refreshToken().pipe(
      switchMap(({ accessToken }) => {
        isRefreshing = false;
        refreshSubject.next(accessToken);
        return next(addToken(req, accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        // Signal failure to all queued requests so they don't hang forever
        refreshSubject.next(REFRESH_FAILED);
        refreshSubject.next(null); // reset back to idle
        auth.handleSessionExpiry();
        return throwError(() => err);
      }),
    );
  }

  // Queue other requests while refresh is in progress
  return refreshSubject.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap((token) => {
      // If refresh failed, discard queued request silently (session expiry already handled)
      if (token === REFRESH_FAILED) {
        return throwError(() => new Error('Session expired'));
      }
      return next(addToken(req, token));
    }),
  );
}
