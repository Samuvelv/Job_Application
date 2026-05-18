// src/app/core/guards/recruiter-access.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RecruiterService } from '../services/recruiter.service';
import { map, catchError, of } from 'rxjs';

/**
 * Redirects to /recruiter/dashboard (which shows the expiry modal) when the
 * recruiter's access_expires_at is in the past.  The dashboard itself is
 * always allowed through so the modal can be shown and the user can log out.
 */
export const recruiterAccessGuard: CanActivateFn = (route) => {
  const recruiterSvc = inject(RecruiterService);
  const router       = inject(Router);

  // Always allow the dashboard itself so the expiry modal is reachable
  if (route.routeConfig?.path === 'dashboard') {
    return true;
  }

  return recruiterSvc.getMyProfile().pipe(
    map((res) => {
      const exp = res.recruiter.access_expires_at;
      if (exp && new Date(exp) < new Date()) {
        router.navigate(['/recruiter/dashboard']);
        return false;
      }
      return true;
    }),
    catchError(() => of(true)), // on error, allow through (fail open)
  );
};
