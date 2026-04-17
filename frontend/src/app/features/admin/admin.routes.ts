// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'candidates',
    loadComponent: () =>
      import('./candidate-list/candidate-list.component').then((m) => m.CandidateListComponent),
  },
  {
    path: 'candidates/register',
    loadComponent: () =>
      import('./candidate-register/candidate-register.component').then((m) => m.CandidateRegisterComponent),
  },
  {
    path: 'candidates/:id/edit',
    loadComponent: () =>
      import('./candidate-edit/candidate-edit.component').then((m) => m.CandidateEditComponent),
  },
  {
    path: 'candidates/:id',
    loadComponent: () =>
      import('./candidate-profile/candidate-profile-page.component').then((m) => m.CandidateProfilePageComponent),
  },
  {
    path: 'recruiters',
    loadComponent: () =>
      import('./recruiter-list/recruiter-list.component').then((m) => m.RecruiterListComponent),
  },
  {
    path: 'recruiters/create',
    loadComponent: () =>
      import('./recruiter-create/recruiter-create.component').then((m) => m.RecruiterCreateComponent),
  },
  {
    path: 'recruiters/:id',
    loadComponent: () =>
      import('./recruiter-profile/recruiter-profile-page.component').then((m) => m.RecruiterProfilePageComponent),
  },
  {
    path: 'edit-requests',
    loadComponent: () =>
      import('./edit-requests/edit-requests.component').then((m) => m.EditRequestsComponent),
  },
  {
    path: 'audit-logs',
    loadComponent: () =>
      import('./audit-logs/audit-logs.component').then((m) => m.AuditLogsComponent),
  },
];
