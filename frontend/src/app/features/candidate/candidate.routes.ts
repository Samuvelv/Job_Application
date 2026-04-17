// src/app/features/candidate/candidate.routes.ts
import { Routes } from '@angular/router';

export const candidateRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/candidate-dashboard.component').then((m) => m.CandidateDashboardComponent),
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
