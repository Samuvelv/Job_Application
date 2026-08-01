// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const toast  = inject(ToastService);
  // Resolved lazily (not eagerly here) — TranslateService's HTTP loader depends
  // on HttpClient, which depends on this very interceptor chain, so injecting
  // it at the top of every intercepted request would deadlock DI (NG0200).
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((err) => {
      const translate = injector.get(TranslateService);
      switch (err.status) {
        case 401:
          // TOKEN_EXPIRED is handled by jwtInterceptor (attempts refresh first).
          // Any other 401 (revoked token, invalid token) triggers immediate session expiry.
          if (err.error?.code !== 'TOKEN_EXPIRED') {
            auth.handleSessionExpiry();
          }
          break;
        case 403:
          if ((err.error?.message as string | undefined)?.includes('Your access has expired')) {
            router.navigate(['/unauthorized'], { state: { reason: 'expired' } });
          } else {
            router.navigate(['/unauthorized']);
          }
          break;
        case 429:
          toast.warning(translate.instant('ERRORS.too_many_requests'));
          break;
        case 0:
          toast.error(translate.instant('ERRORS.server_unreachable'));
          break;
        default:
          if (err.status >= 500) {
            toast.error(translate.instant('ERRORS.server_error_retry'));
          }
          break;
      }
      return throwError(() => err);
    }),
  );
};
