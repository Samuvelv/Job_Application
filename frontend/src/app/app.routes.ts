// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Default redirect — auth guard decides where to send user
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },

  // ── Auth (public) ────────────────────────────────────────────────────────────
  {
    path: 'login',
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
    data: { roles: ['admin'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // ── Employee ──────────────────────────────────────────────────────────────────
  {
    path: 'employee',
    data: { roles: ['employee'] },
    loadChildren: () =>
      import('./features/employee/employee.routes').then((m) => m.employeeRoutes),
  },

  // ── Recruiter ─────────────────────────────────────────────────────────────────
  {
    path: 'recruiter',
    data: { roles: ['recruiter'] },
    loadChildren: () =>
      import('./features/recruiter/recruiter.routes').then((m) => m.recruiterRoutes),
  },

  // Catch-all
  { path: '**', redirectTo: 'login' },
];
