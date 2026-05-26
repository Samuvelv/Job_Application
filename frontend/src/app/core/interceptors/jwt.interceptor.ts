// src/app/core/interceptors/jwt.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, switchMap, catchError, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
// Use EMPTY_TOKEN sentinel so queued requests can detect failure vs. success
const refreshSubject = new BehaviorSubject<string | null>(null);

const REFRESH_FAILED = '__REFRESH_FAILED__';

// ── Multi-tab coordination via BroadcastChannel ───────────────────────────────
// When one tab successfully refreshes the access token it broadcasts the new
// token so all other tabs can update their localStorage without firing their
// own refresh request.  This prevents the rotation-conflict race where Tab B
// tries to rotate an already-rotated (revoked) refresh token and gets logged
// out unexpectedly.
//
// MODULE-LEVEL AUTH REFERENCE
// Angular DI (inject()) is only available inside injection context (i.e. inside
// the interceptor function itself).  The BroadcastChannel listener runs outside
// that context, so we keep a module-level reference that AuthService populates
// via registerForTabSync() during its own construction.  This avoids any
// circular-DI issue and keeps the listener fully reactive.
let _authRef: AuthService | null = null;

/** Called by AuthService constructor so the channel listener can reach it. */
export function registerAuthForTabSync(auth: AuthService): void {
  _authRef = auth;
}

const TAB_CHANNEL = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('auth:token_refresh')
  : null;

// Listen for token updates broadcast by other tabs
if (TAB_CHANNEL) {
  TAB_CHANNEL.onmessage = (event: MessageEvent<{ type: string; accessToken?: string }>) => {
    if (event.data?.type === 'TOKEN_REFRESHED' && event.data.accessToken) {
      // Silently adopt the new token — no refresh needed in this tab.
      localStorage.setItem('th_access_token', event.data.accessToken);
      // Re-arm this tab's own expiry warning for the new token lifetime.
      _authRef?.scheduleExpiryWarning(event.data.accessToken);
    }

    if (event.data?.type === 'SESSION_EXPIRED') {
      // Another tab's session fully expired.  Drive this tab through the same
      // expiry path so the UI state (signal, toast, redirect) is consistent
      // rather than leaving stale user data visible until the next API call.
      _authRef?.handleSessionExpiry();
    }
  };
}

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

        // Notify other tabs so they silently adopt the new token without
        // triggering their own refresh (avoids rotation conflict).
        TAB_CHANNEL?.postMessage({ type: 'TOKEN_REFRESHED', accessToken });

        return next(addToken(req, accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        // Signal failure to all queued requests so they don't hang forever
        refreshSubject.next(REFRESH_FAILED);
        refreshSubject.next(null); // reset back to idle

        // Notify other tabs that this session is gone
        TAB_CHANNEL?.postMessage({ type: 'SESSION_EXPIRED' });

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
