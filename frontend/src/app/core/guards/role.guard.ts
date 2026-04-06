// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const allowedRoles: UserRole[] = route.data['roles'] ?? [];
  const userRole = auth.getRole();

  if (userRole && allowedRoles.includes(userRole)) return true;

  // Redirect logged-in users to their own dashboard
  if (auth.isLoggedIn()) {
    router.navigate([auth.getDashboardRoute()]);
  } else {
    router.navigate(['/login']);
  }
  return false;
};
