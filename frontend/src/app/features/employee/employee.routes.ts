// src/app/features/employee/employee.routes.ts
import { Routes } from '@angular/router';

export const employeeRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/employee-dashboard.component').then((m) => m.EmployeeDashboardComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/my-profile.component').then((m) => m.MyProfileComponent),
  },
  {
    path: 'edit-request',
    loadComponent: () =>
      import('./edit-request/edit-request.component').then((m) => m.EditRequestComponent),
  },
];
