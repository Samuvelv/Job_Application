// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem {
  label: string;
  icon: string;  // Bootstrap Icons class e.g. 'bi-grid-1x2-fill'
  route: string;
  badge?: () => number; // Optional badge count
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="app-sidebar"
         [class.open]="sidebar.isOpen()"
         [class.collapsed]="sidebar.isCollapsed()">

      <!-- Nav links -->
      <ul class="sidebar-nav">
        @for (item of navItems(); track item.route) {
          <li>
            <a class="sidebar-link"
               [routerLink]="item.route"
               routerLinkActive="active"
               [title]="sidebar.isCollapsed() ? item.label : ''"
               (click)="sidebar.close()">
              <div class="sidebar-link__icon-wrapper">
                <i class="bi {{ item.icon }}"></i>
                @if (item.badge && item.badge() > 0) {
                  <span class="sidebar-link__badge">{{ item.badge() }}</span>
                }
              </div>
              <span class="sidebar-link-label">{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>

      <!-- Collapse toggle (desktop only, pinned to bottom) -->
      <div class="sidebar-collapse-wrap">
        <button class="sidebar-collapse-btn"
                (click)="sidebar.toggleCollapse()"
                [title]="sidebar.isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <i class="bi"
             [class.bi-chevron-double-left]="!sidebar.isCollapsed()"
             [class.bi-chevron-double-right]="sidebar.isCollapsed()"></i>
          <span class="sidebar-link-label">Collapse</span>
        </button>
      </div>

    </nav>
  `,
})
export class SidebarComponent implements OnDestroy {
  private role = computed(() => this.auth.currentUser()?.role ?? '');

  navItems = computed<NavItem[]>(() => {
    switch (this.role()) {
      case 'admin':
        return [
          { label: 'Dashboard',     icon: 'bi-grid-1x2-fill',     route: '/admin/dashboard' },
          { label: 'Candidates',     icon: 'bi-people-fill',        route: '/admin/candidates' },
          { label: 'Recruiters',    icon: 'bi-person-badge-fill',  route: '/admin/recruiters' },
          { label: 'Edit Requests',      icon: 'bi-pencil-square',      route: '/admin/edit-requests', badge: () => this.notifications.pendingEdits() },
          { label: 'Contact Requests',  icon: 'bi-envelope-fill',      route: '/admin/contact-submissions', badge: () => this.notifications.pendingContactRequests() },
          { label: 'Volunteers',        icon: 'bi-people-fill',        route: '/admin/volunteers' },
          { label: 'Audit Logs',        icon: 'bi-journal-text',       route: '/admin/audit-logs' },
        ];
      case 'candidate':
        return [
          { label: 'Dashboard',    icon: 'bi-grid-1x2-fill', route: '/candidate/dashboard' },
          { label: 'My Profile',   icon: 'bi-person-circle', route: '/candidate/profile' },
          { label: 'Request Edit', icon: 'bi-pencil',        route: '/candidate/edit-request' },
          { label: 'Volunteers',   icon: 'bi-people-fill',  route: '/candidate/volunteers' },
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
    public notifications: NotificationService,
  ) {}

  ngOnDestroy(): void {
    this.notifications.stopPolling();
  }
}

