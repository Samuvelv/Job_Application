// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Landing page — public, no guard
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },

  // ── Auth (public) ────────────────────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },

  // ── Unauthorized ─────────────────────────────────────────────────────────────
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./shared/components/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent,
      ),
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // ── Candidate ──────────────────────────────────────────────────────────────────
  {
    path: 'candidate',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['candidate'] },
    loadChildren: () =>
      import('./features/candidate/candidate.routes').then((m) => m.candidateRoutes),
  },

  // ── Recruiter ─────────────────────────────────────────────────────────────────
  {
    path: 'recruiter',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['recruiter'] },
    loadChildren: () =>
      import('./features/recruiter/recruiter.routes').then((m) => m.recruiterRoutes),
  },

  // Catch-all
  { path: '**', redirectTo: 'login' },
];
