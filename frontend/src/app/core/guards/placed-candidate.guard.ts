// src/app/core/guards/placed-candidate.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CandidateService } from '../services/candidate.service';
import { map, catchError, of } from 'rxjs';

/**
 * Blocks placed candidates from accessing restricted routes.
 * If status is already cached in AuthService, uses that.
 * Otherwise fetches from /candidates/me and caches it.
 * Redirects to /candidate/dashboard with { placedBlocked: true } state.
 */
export const placedCandidateGuard: CanActivateFn = () => {
  const auth            = inject(AuthService);
  const candidateSvc    = inject(CandidateService);
  const router          = inject(Router);

  const cached = auth.candidateStatus();

  if (cached !== null) {
    if (cached === 'placed') {
      router.navigate(['/candidate/dashboard'], { state: { placedBlocked: true } });
      return false;
    }
    return true;
  }

  // Status not yet cached — fetch profile
  return candidateSvc.getMyProfile().pipe(
    map((res) => {
      const status = res.candidate.profile_status ?? 'active';
      auth.setCandidateStatus(status);
      if (status === 'placed') {
        router.navigate(['/candidate/dashboard'], { state: { placedBlocked: true } });
        return false;
      }
      return true;
    }),
    catchError(() => of(true)), // on error, allow through (fail open)
  );
};
