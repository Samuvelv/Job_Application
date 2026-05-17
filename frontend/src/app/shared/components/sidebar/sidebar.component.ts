// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, computed, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '../../../core/services/notification.service';
import { MASTER_TABLE_CONFIGS } from '../../../features/admin/master/master-table.config';

interface NavItem {
  label:      string;
  icon:       string;
  route:      string;
  badge?:     () => number;
  iconColor?: string;
}

interface NavGroup {
  label:    string;
  icon:     string;
  children: NavItem[];
  // route prefix used to auto-expand when active
  routePrefix: string;
}

type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return 'children' in e;
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
        @for (entry of navEntries(); track $index) {

          <!-- ── Group entry ── -->
          @if (isGroup(entry)) {
            <li class="sidebar-group" [class.is-open]="isGroupOpen(entry)">
              <button class="sidebar-link sidebar-group__toggle w-100 text-start"
                [title]="sidebar.isCollapsed() ? entry.label : ''"
                (click)="toggleGroup(entry)">
                <div class="sidebar-link__icon-wrapper">
                  <i class="bi {{ entry.icon }}"></i>
                </div>
                <span class="sidebar-link-label flex-grow-1">{{ entry.label }}</span>
                <i class="bi sidebar-group__chevron sidebar-link-label"
                   [class.bi-chevron-down]="!isGroupOpen(entry)"
                   [class.bi-chevron-up]="isGroupOpen(entry)"></i>
              </button>
              @if (isGroupOpen(entry) && !sidebar.isCollapsed()) {
                <ul class="sidebar-group__children">
                  @for (child of entry.children; track child.route) {
                    <li>
                      <a class="sidebar-link sidebar-link--child"
                         [routerLink]="child.route"
                         routerLinkActive="active"
                         (click)="sidebar.close()">
                        <i class="bi {{ child.icon }}"></i>
                        <span class="sidebar-link-label">{{ child.label }}</span>
                      </a>
                    </li>
                  }
                </ul>
              }
            </li>
          }

          <!-- ── Flat link entry ── -->
          @if (!isGroup(entry)) {
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
  styles: [`
    .sidebar-group__toggle {
      background: none; border: none; cursor: pointer;
      color: inherit; padding: 0; border-radius: var(--th-radius, 8px);
    }
    .sidebar-group__toggle:hover { background: var(--th-primary-soft, #eef2ff); }
    .sidebar-group__chevron { font-size: .7rem; transition: transform .2s; }
    .sidebar-group__children {
      list-style: none; padding: 0; margin: .2rem 0 .2rem .5rem;
    }
    .sidebar-link--child {
      padding-left: 1rem !important;
      font-size: .82rem;
    }
    .sidebar-link--child i { font-size: .85rem; min-width: 1.1rem; }
  `],
})
export class SidebarComponent implements OnDestroy {
  private role = computed(() => this.auth.currentUser()?.role ?? '');

  // Track which groups are open by routePrefix
  private openGroups = signal<Set<string>>(new Set());

  isGroup = isGroup;

  navEntries = computed<NavEntry[]>(() => {
    switch (this.role()) {
      case 'admin': {
        // Auto-open master group if current URL starts with /admin/master
        const url = this.router.url;
        if (url.startsWith('/admin/master') && !this.openGroups().has('/admin/master')) {
          this.openGroups.update((s) => { const n = new Set(s); n.add('/admin/master'); return n; });
        }
        return [
          { label: 'Dashboard',         icon: 'bi-grid-1x2-fill',    route: '/admin/dashboard' },
          { label: 'Candidates',         icon: 'bi-people-fill',       route: '/admin/candidates' },
          { label: 'Recruiters',        icon: 'bi-person-badge-fill', route: '/admin/recruiters' },
          { label: 'Edit Requests',     icon: 'bi-pencil-square',     route: '/admin/edit-requests',       badge: () => this.notifications.pendingEdits() + this.notifications.pendingVolunteerSupport() },
          { label: 'Contact Requests',  icon: 'bi-envelope-fill',     route: '/admin/contact-submissions', badge: () => this.notifications.pendingContactRequests() },
          { label: 'Interest Requests', icon: 'bi-briefcase-fill',    route: '/admin/interest-requests',   badge: () => this.notifications.pendingInterestRequests() },
          { label: 'Volunteers',        icon: 'bi-mortarboard-fill',  route: '/admin/volunteers', iconColor: '#f59e0b' },
          // ── Master Data group ─────────────────────────────────────────────
          {
            label:       'Master Data',
            icon:        'bi-database',
            routePrefix: '/admin/master',
            children: MASTER_TABLE_CONFIGS.map((cfg) => ({
              label: cfg.label,
              icon:  cfg.icon,
              route: `/admin/master/${cfg.key}`,
            })),
          } as NavGroup,
          { label: 'Audit Logs',        icon: 'bi-journal-text',      route: '/admin/audit-logs' },
        ];
      }
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
    private router:        Router,
  ) {}

  ngOnDestroy(): void {
    this.notifications.stopPolling();
  }

  isGroupOpen(group: NavGroup): boolean {
    return this.openGroups().has(group.routePrefix);
  }

  toggleGroup(group: NavGroup): void {
    this.openGroups.update((s) => {
      const n = new Set(s);
      if (n.has(group.routePrefix)) { n.delete(group.routePrefix); }
      else                          { n.add(group.routePrefix);    }
      return n;
    });
  }
}
