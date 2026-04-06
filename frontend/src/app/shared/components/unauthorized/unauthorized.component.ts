// src/app/shared/components/unauthorized/unauthorized.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center"
         style="min-height:100vh; background: var(--th-bg)">
      <div class="text-center p-5">
        <div style="font-size:5rem">🚫</div>
        <h1 class="fw-bold mt-3 mb-2">Access Denied</h1>
        <p class="text-muted mb-4">You don't have permission to view this page.</p>
        <a [routerLink]="dashRoute" class="btn btn-primary">
          Back to Dashboard
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
