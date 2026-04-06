// src/app/shared/components/unauthorized/unauthorized.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="unauthorized-page">
      <div class="unauthorized-page__card">
        <div class="unauthorized-page__icon">
          <i class="bi bi-shield-x"></i>
        </div>
        <h1 class="unauthorized-page__title">Access Denied</h1>
        <p class="unauthorized-page__desc">You don't have permission to view this page.</p>
        <a [routerLink]="dashRoute" class="btn btn-primary px-4">
          <i class="bi bi-arrow-left me-1"></i>Back to Dashboard
        </a>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {
  dashRoute: string;
  constructor(auth: AuthService) {
    this.dashRoute = auth.getDashboardRoute();
  }
}
