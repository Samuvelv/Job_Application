// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

interface NavItem {
  label: string;
  icon: string;  // Bootstrap Icons class e.g. 'bi-grid-1x2-fill'
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="app-sidebar" [class.open]="sidebar.isOpen()">
      <!-- Brand -->
      <div class="sidebar-brand">
        <span class="sidebar-logo">TalentHub</span>
        <span class="badge ms-2" [ngClass]="roleBadgeClass()">
          {{ role() | titlecase }}
        </span>
      </div>

      <!-- Nav links -->
      <ul class="sidebar-nav">
        @for (item of navItems(); track item.route) {
          <li>
            <a class="sidebar-link"
               [routerLink]="item.route"
               routerLinkActive="active"
               (click)="sidebar.close()">
              <i class="bi {{ item.icon }}"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>

      <!-- Logout -->
      <div class="sidebar-footer">
        <button class="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                (click)="logout()">
          <i class="bi bi-box-arrow-right"></i>
          Sign out
        </button>
      </div>
    </nav>
  `,
})
export class SidebarComponent {
  role = computed(() => this.auth.currentUser()?.role ?? '');

  roleBadgeClass = computed(() => ({
    'badge-role-admin':     this.role() === 'admin',
    'badge-role-employee':  this.role() === 'employee',
    'badge-role-recruiter': this.role() === 'recruiter',
  }));

  navItems = computed<NavItem[]>(() => {
    switch (this.role()) {
      case 'admin':
        return [
          { label: 'Dashboard',     icon: 'bi-grid-1x2-fill',     route: '/admin/dashboard' },
          { label: 'Employees',     icon: 'bi-people-fill',        route: '/admin/employees' },
          { label: 'Recruiters',    icon: 'bi-person-badge-fill',  route: '/admin/recruiters' },
          { label: 'Edit Requests', icon: 'bi-pencil-square',      route: '/admin/edit-requests' },
          { label: 'Audit Logs',    icon: 'bi-journal-text',       route: '/admin/audit-logs' },
        ];
      case 'employee':
        return [
          { label: 'Dashboard',    icon: 'bi-grid-1x2-fill', route: '/employee/dashboard' },
          { label: 'My Profile',   icon: 'bi-person-circle', route: '/employee/profile' },
          { label: 'Request Edit', icon: 'bi-pencil',        route: '/employee/edit-request' },
        ];
      case 'recruiter':
        return [
          { label: 'Dashboard',    icon: 'bi-grid-1x2-fill',      route: '/recruiter/dashboard' },
          { label: 'Search Talent',icon: 'bi-search',              route: '/recruiter/candidates' },
          { label: 'My Shortlist', icon: 'bi-bookmark-star-fill', route: '/recruiter/shortlist' },
        ];
      default:
        return [];
    }
  });

  constructor(
    private auth: AuthService,
    public sidebar: SidebarService,
  ) {}

  logout(): void { this.auth.logout(); }
}
