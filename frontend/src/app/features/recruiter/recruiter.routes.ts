// src/app/features/recruiter/recruiter.routes.ts
import { Routes } from '@angular/router';
import { recruiterAccessGuard } from '../../core/guards/recruiter-access.guard';

export const recruiterRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    canActivate: [recruiterAccessGuard],
    loadComponent: () =>
      import('./dashboard/recruiter-dashboard.component').then((m) => m.RecruiterDashboardComponent),
  },
  {
    path: 'candidates',
    canActivate: [recruiterAccessGuard],
    loadComponent: () =>
      import('./candidates/candidates.component').then((m) => m.CandidatesComponent),
  },
  {
    path: 'candidates/:id',
    canActivate: [recruiterAccessGuard],
    loadComponent: () =>
      import('./candidates/candidate-profile.component').then((m) => m.RecruiterCandidateProfileComponent),
  },
  {
    path: 'shortlist',
    canActivate: [recruiterAccessGuard],
    loadComponent: () =>
      import('./shortlist/shortlist.component').then((m) => m.ShortlistComponent),
  },
  {
    path: 'interest-requests',
    canActivate: [recruiterAccessGuard],
    loadComponent: () =>
      import('./interest-requests/recruiter-interest-requests.component')
        .then((m) => m.RecruiterInterestRequestsComponent),
  },
];
