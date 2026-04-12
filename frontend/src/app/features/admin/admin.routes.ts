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
    path: 'employees',
    loadComponent: () =>
      import('./employee-list/employee-list.component').then((m) => m.EmployeeListComponent),
  },
  {
    path: 'employees/register',
    loadComponent: () =>
      import('./employee-register/employee-register.component').then((m) => m.EmployeeRegisterComponent),
  },
  {
    path: 'employees/:id/edit',
    loadComponent: () =>
      import('./employee-edit/employee-edit.component').then((m) => m.EmployeeEditComponent),
  },
  {
    path: 'employees/:id',
    loadComponent: () =>
      import('./employee-profile/employee-profile-page.component').then((m) => m.EmployeeProfilePageComponent),
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
