// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/** Walk up the route tree to find the nearest `data.roles` array. */
function getRolesFromRoute(route: ActivatedRouteSnapshot): UserRole[] {
  let r: ActivatedRouteSnapshot | null = route;
  while (r) {
    if (r.data['roles']?.length) return r.data['roles'] as UserRole[];
    r = r.parent;
  }
  return [];
}

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = getRolesFromRoute(route);
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
