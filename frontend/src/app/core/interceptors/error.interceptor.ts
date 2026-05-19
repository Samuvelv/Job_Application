// src/app/core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const toast  = inject(ToastService);

  return next(req).pipe(
    catchError((err) => {
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
          toast.warning('Too many requests. Please slow down.');
          break;
        case 0:
          toast.error('Network error — server unreachable.');
          break;
        default:
          if (err.status >= 500) {
            toast.error('Server error. Please try again later.');
          }
          break;
      }
      return throwError(() => err);
    }),
  );
};
