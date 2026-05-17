// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem {
  label:      string;
  icon:       string;
  route:      string;
  badge?:     () => number;
  iconColor?: string;
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
        @for (entry of navEntries(); track entry.route) {
          <li>
            <a class="sidebar-link"
               [routerLink]="entry.route"
               routerLinkActive="active"
               [title]="sidebar.isCollapsed() ? entry.label : ''"
               (click)="sidebar.close()">
              <div class="sidebar-link__icon-wrapper">
                <i class="bi {{ entry.icon }}" [style.color]="entry.iconColor || null"></i>
                @if (entry.badge && entry.badge() > 0) {
                  <span class="sidebar-link__badge">{{ entry.badge() }}</span>
                }
              </div>
              <span class="sidebar-link-label">{{ entry.label }}</span>
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

  navEntries = computed<NavItem[]>(() => {
    switch (this.role()) {
      case 'admin':
        return [
          { label: 'Dashboard',         icon: 'bi-grid-1x2-fill',    route: '/admin/dashboard' },
          { label: 'Candidates',         icon: 'bi-people-fill',       route: '/admin/candidates' },
          { label: 'Recruiters',        icon: 'bi-person-badge-fill', route: '/admin/recruiters' },
          { label: 'Edit Requests',     icon: 'bi-pencil-square',     route: '/admin/edit-requests',       badge: () => this.notifications.pendingEdits() + this.notifications.pendingVolunteerSupport() },
          { label: 'Contact Requests',  icon: 'bi-envelope-fill',     route: '/admin/contact-submissions', badge: () => this.notifications.pendingContactRequests() },
          { label: 'Interest Requests', icon: 'bi-briefcase-fill',    route: '/admin/interest-requests',   badge: () => this.notifications.pendingInterestRequests() },
          { label: 'Volunteers',        icon: 'bi-mortarboard-fill',  route: '/admin/volunteers', iconColor: '#f59e0b' },
          { label: 'Master Data',       icon: 'bi-database',          route: '/admin/master' },
          { label: 'Audit Logs',        icon: 'bi-journal-text',      route: '/admin/audit-logs' },
        ];
      case 'candidate': {
        const placed = this.auth.candidateStatus() === 'placed';
        const items: NavItem[] = [
          { label: 'Dashboard',  icon: 'bi-grid-1x2-fill', route: '/candidate/dashboard' },
          { label: 'My Profile', icon: 'bi-person-circle', route: '/candidate/profile' },
        ];
        if (!placed) {
          items.push({ label: 'Request Edit', icon: 'bi-pencil',      route: '/candidate/edit-request' });
          items.push({ label: 'Volunteers',   icon: 'bi-people-fill', route: '/candidate/volunteers' });
        }
        return items;
      }
      case 'recruiter':
        return [
          { label: 'Dashboard',        icon: 'bi-grid-1x2-fill',     route: '/recruiter/dashboard' },
          { label: 'Search Talent',    icon: 'bi-search',             route: '/recruiter/candidates' },
          { label: 'My Shortlist',     icon: 'bi-bookmark-star-fill', route: '/recruiter/shortlist' },
          { label: 'Interest Requests',icon: 'bi-briefcase-fill',     route: '/recruiter/interest-requests' },
        ];
      default:
        return [];
    }
  });

  constructor(
    private auth:          AuthService,
    public  sidebar:       SidebarService,
    public  notifications: NotificationService,
  ) {}

  ngOnDestroy(): void {
    this.notifications.stopPolling();
  }
}
