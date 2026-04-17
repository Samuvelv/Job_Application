// src/app/shared/components/topbar/topbar.component.ts
import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="app-topbar">
      <!-- Left: hamburger + brand -->
      <div class="d-flex align-items-center gap-2">
        <button class="topbar-icon-btn d-lg-none"
                (click)="sidebar.toggle()"
                aria-label="Toggle sidebar">
          <i class="bi bi-list fs-5"></i>
        </button>
        <a [routerLink]="dashboardRoute()" class="topbar-brand">
          TalentHub
        </a>
      </div>

      <!-- Right: dark mode + avatar dropdown -->
      <div class="d-flex align-items-center gap-2">
        <!-- Dark mode toggle -->
        <button class="topbar-icon-btn" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
          <i class="bi" [class.bi-moon-fill]="!theme.isDark()" [class.bi-sun-fill]="theme.isDark()"></i>
        </button>

        <!-- Avatar / dropdown -->
        <div class="dropdown">
          <button class="topbar-avatar-btn dropdown-toggle"
                  data-bs-toggle="dropdown"
                  aria-expanded="false">
            <span class="avatar-circle">{{ initials() }}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li class="px-3 py-2">
              <div class="fw-semibold small text-truncate" style="max-width:200px">{{ userEmail() }}</div>
              <span class="badge mt-1" [ngClass]="roleBadgeClass()">{{ role() | titlecase }}</span>
            </li>
            <li><hr class="dropdown-divider my-1"></li>
            <li>
              <button class="dropdown-item d-flex align-items-center gap-2 text-danger" (click)="logout()">
                <i class="bi bi-box-arrow-right"></i> Sign out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  role      = computed(() => this.auth.currentUser()?.role ?? '');
  userEmail = computed(() => this.auth.currentUser()?.email ?? '');
  initials  = computed(() => {
    const email = this.userEmail();
    return email ? email.slice(0, 2).toUpperCase() : 'U';
  });
  dashboardRoute = computed(() => this.auth.getDashboardRoute());

  roleBadgeClass = computed(() => ({
    'badge-role-admin':     this.role() === 'admin',
    'badge-role-candidate':  this.role() === 'candidate',
    'badge-role-recruiter': this.role() === 'recruiter',
  }));

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    public sidebar: SidebarService,
  ) {}

  logout(): void { this.auth.logout(); }
}
