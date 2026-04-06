// src/app/features/recruiter/recruiter.routes.ts
import { Routes } from '@angular/router';

export const recruiterRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/recruiter-dashboard.component').then((m) => m.RecruiterDashboardComponent),
  },
  {
    path: 'candidates',
    loadComponent: () =>
      import('./candidates/candidates.component').then((m) => m.CandidatesComponent),
  },
  {
    path: 'shortlist',
    loadComponent: () =>
      import('./shortlist/shortlist.component').then((m) => m.ShortlistComponent),
  },
];
