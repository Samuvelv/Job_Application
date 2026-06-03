// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '../../../core/services/notification.service';

interface NavItem {
  labelKey:   string;
  icon:       string;
  route:      string;
  badge?:     () => number;
  iconColor?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
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
               [title]="sidebar.isCollapsed() ? (entry.labelKey | translate) : ''"
               (click)="sidebar.close()">
              <div class="sidebar-link__icon-wrapper">
                <i class="bi {{ entry.icon }}" [style.color]="entry.iconColor || null"></i>
                @if (entry.badge && entry.badge() > 0) {
                  <span class="sidebar-link__badge">{{ entry.badge() }}</span>
                }
              </div>
              <span class="sidebar-link-label">{{ entry.labelKey | translate }}</span>
            </a>
          </li>
        }
      </ul>

      <!-- Collapse toggle (desktop only, pinned to bottom) -->
      <div class="sidebar-collapse-wrap">
        <button class="sidebar-collapse-btn"
                (click)="sidebar.toggleCollapse()"
                [title]="(sidebar.isCollapsed() ? 'NAV.expand_sidebar' : 'NAV.collapse_sidebar') | translate">
          <i class="bi"
             [class.bi-chevron-double-left]="!sidebar.isCollapsed()"
             [class.bi-chevron-double-right]="sidebar.isCollapsed()"></i>
          <span class="sidebar-link-label">{{ 'NAV.collapse' | translate }}</span>
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
          { labelKey: 'NAV.dashboard',         icon: 'bi-grid-1x2-fill',    route: '/admin/dashboard' },
          { labelKey: 'NAV.candidates',         icon: 'bi-people-fill',       route: '/admin/candidates' },
          { labelKey: 'NAV.recruiters',         icon: 'bi-person-badge-fill', route: '/admin/recruiters' },
          { labelKey: 'NAV.edit_requests',      icon: 'bi-pencil-square',     route: '/admin/edit-requests',       badge: () => this.notifications.totalEditRequestsPending() },
          { labelKey: 'NAV.contact_requests',   icon: 'bi-envelope-fill',     route: '/admin/contact-submissions', badge: () => this.notifications.pendingContactRequests() },
          { labelKey: 'NAV.interest_requests',  icon: 'bi-briefcase-fill',    route: '/admin/interest-requests',   badge: () => this.notifications.pendingInterestRequests() },
          { labelKey: 'NAV.volunteers',         icon: 'bi-mortarboard-fill',  route: '/admin/volunteers' },
          { labelKey: 'NAV.master_data',        icon: 'bi-database-fill',     route: '/admin/master' },
          { labelKey: 'NAV.audit_logs',         icon: 'bi-journal-text',      route: '/admin/audit-logs' },
        ];
      case 'candidate': {
        const placed = this.auth.candidateStatus() === 'placed';
        const items: NavItem[] = [
          { labelKey: 'NAV.dashboard',   icon: 'bi-grid-1x2-fill', route: '/candidate/dashboard' },
          { labelKey: 'NAV.my_profile',  icon: 'bi-person-circle', route: '/candidate/profile' },
        ];
        if (!placed) {
          items.push({ labelKey: 'NAV.request_edit', icon: 'bi-pencil',      route: '/candidate/edit-request' });
          items.push({ labelKey: 'NAV.volunteers',   icon: 'bi-people-fill', route: '/candidate/volunteers' });
        }
        return items;
      }
      case 'recruiter':
        return [
          { labelKey: 'NAV.dashboard',        icon: 'bi-grid-1x2-fill',     route: '/recruiter/dashboard' },
          { labelKey: 'NAV.search_talent',    icon: 'bi-search',             route: '/recruiter/candidates' },
          { labelKey: 'NAV.my_shortlist',     icon: 'bi-bookmark-star-fill', route: '/recruiter/shortlist' },
          { labelKey: 'NAV.interest_requests',icon: 'bi-briefcase-fill',     route: '/recruiter/interest-requests' },
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
