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
          // Only hard-logout if not a token-expiry (handled by jwtInterceptor)
          if (err.error?.code !== 'TOKEN_EXPIRED') {
            auth.logout();
          }
          break;
        case 403:
          router.navigate(['/unauthorized']);
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
