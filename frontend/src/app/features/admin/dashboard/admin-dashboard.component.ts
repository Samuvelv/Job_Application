// src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, AdminStats } from '../../../core/services/stats.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ContactSubmissionService } from '../../../core/services/contact-submission.service';
import { ContactSubmission } from '../../../core/models/contact-submission.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `

    <!-- ── Hero ─────────────────────────────────────────────────────────── -->
    <div class="adm-hero">
      <div class="adm-hero__eyebrow">NTL Career Nexus &mdash; Admin Portal</div>
      <h1 class="adm-hero__title">Good {{ timeOfDay() }}{{ adminName() ? ', ' + adminName() : '' }}</h1>
      <div class="adm-hero__meta">
        <span class="adm-hero__chip"><i class="bi bi-calendar3"></i>{{ today() }}</span>
        <span class="adm-hero__chip adm-hero__chip--shield"><i class="bi bi-shield-fill-check"></i>Administrator</span>
      </div>
      <div class="adm-hero__actions">
        <a routerLink="/admin/candidates/register" class="adm-hero__btn adm-hero__btn--solid">
          <i class="bi bi-person-plus-fill"></i>Add Candidate
        </a>
        <a routerLink="/admin/recruiters/create" class="adm-hero__btn">
          <i class="bi bi-person-badge"></i>New Recruiter
        </a>
        <a routerLink="/admin/edit-requests" class="adm-hero__btn">
          <i class="bi bi-pencil-square"></i>Edit Requests
          @if ((stats()?.pendingEdits ?? 0) > 0) {
            <span class="adm-hero__pill">{{ stats()?.pendingEdits }}</span>
          }
        </a>
      </div>
    </div>

    <!-- ── Alert Banner ──────────────────────────────────────────────────── -->
    @if ((stats()?.pendingEdits ?? 0) > 0) {
      <a routerLink="/admin/edit-requests" class="adm-alert">
        <span class="adm-alert__icon"><i class="bi bi-exclamation-triangle-fill"></i></span>
        <span class="adm-alert__text">
          <strong>{{ stats()?.pendingEdits }} edit request{{ (stats()?.pendingEdits ?? 0) > 1 ? 's' : '' }}</strong>
          waiting for your review
        </span>
        <span class="adm-alert__cta">Review now <i class="bi bi-arrow-right"></i></span>
      </a>
    }

    <!-- ════════════════════════════════════════════════════════════════════
         SECTION 1 — TODAY'S ACTIVITY
         Style: Solid accent-header cards
    ════════════════════════════════════════════════════════════════════ -->
    <div class="adm-section-label">
      <i class="bi bi-lightning-charge-fill"></i> Today's Activity
    </div>

    <div class="dash-stat-grid dash-stat-grid--3 mb-4">

      <!-- New Registrations Today — Indigo -->
      <div class="kpi-hcard kpi-hcard--indigo">
        <div class="kpi-hcard__header">
          <i class="bi bi-person-plus-fill"></i>
          <span class="kpi-hcard__header-label">Registrations</span>
        </div>
        <div class="kpi-hcard__body">
          <div class="kpi-hcard__value">
            @if (loading()) { <span class="kpi-hcard__skeleton"></span> }
            @else { {{ stats()?.registrationsToday ?? 0 }} }
          </div>
          <div class="kpi-hcard__title">New Registrations Today</div>
          <div class="kpi-hcard__badge kpi-hcard__badge--indigo">
            <i class="bi bi-calendar-day"></i> Today
          </div>
        </div>
      </div>

      <!-- Profiles Forwarded Today — Emerald -->
      <div class="kpi-hcard kpi-hcard--emerald">
        <div class="kpi-hcard__header">
          <i class="bi bi-send-fill"></i>
          <span class="kpi-hcard__header-label">Forwarded</span>
        </div>
        <div class="kpi-hcard__body">
          <div class="kpi-hcard__value">
            @if (loading()) { <span class="kpi-hcard__skeleton"></span> }
            @else { {{ stats()?.profilesForwardedToday ?? 0 }} }
          </div>
          <div class="kpi-hcard__title">Profiles Forwarded Today</div>
          <div class="kpi-hcard__badge kpi-hcard__badge--emerald">
            <i class="bi bi-arrow-up-right"></i> Today
          </div>
        </div>
      </div>

      <!-- Interviews Arranged Today — Cyan -->
      <div class="kpi-hcard kpi-hcard--cyan">
        <div class="kpi-hcard__header">
          <i class="bi bi-calendar-check-fill"></i>
          <span class="kpi-hcard__header-label">Interviews</span>
        </div>
        <div class="kpi-hcard__body">
          <div class="kpi-hcard__value">
            @if (loading()) { <span class="kpi-hcard__skeleton"></span> }
            @else { {{ stats()?.interviewsArrangedToday ?? 0 }} }
          </div>
          <div class="kpi-hcard__title">Interviews Arranged Today</div>
          <div class="kpi-hcard__badge kpi-hcard__badge--cyan">
            <i class="bi bi-calendar-check-fill"></i> Today
          </div>
        </div>
      </div>

    </div>

    <!-- ════════════════════════════════════════════════════════════════════
         SECTION 2 — PLATFORM OVERVIEW
         Style: Single horizontal strip with dividers
    ════════════════════════════════════════════════════════════════════ -->
    <div class="adm-section-label">
      <i class="bi bi-grid-fill"></i> Platform Overview
    </div>

    <div class="overview-strip mb-4">

      <a routerLink="/admin/candidates" class="overview-strip__col">
        <span class="overview-strip__icon overview-strip__icon--indigo">
          <i class="bi bi-people-fill"></i>
        </span>
        <div class="overview-strip__data">
          <div class="overview-strip__value">
            @if (loading()) { <span class="overview-strip__skeleton"></span> }
            @else { {{ stats()?.candidates ?? 0 }} }
          </div>
          <div class="overview-strip__label">Total Candidates</div>
        </div>
      </a>

      <div class="overview-strip__divider"></div>

      <a routerLink="/admin/candidates" class="overview-strip__col">
        <span class="overview-strip__icon overview-strip__icon--emerald">
          <i class="bi bi-person-check-fill"></i>
        </span>
        <div class="overview-strip__data">
          <div class="overview-strip__value">
            @if (loading()) { <span class="overview-strip__skeleton"></span> }
            @else { {{ stats()?.activeCandidates ?? 0 }} }
          </div>
          <div class="overview-strip__label">Active Candidates</div>
        </div>
      </a>

      <div class="overview-strip__divider"></div>

      <a routerLink="/admin/recruiters" class="overview-strip__col">
        <span class="overview-strip__icon overview-strip__icon--cyan">
          <i class="bi bi-person-badge-fill"></i>
        </span>
        <div class="overview-strip__data">
          <div class="overview-strip__value">
            @if (loading()) { <span class="overview-strip__skeleton"></span> }
            @else { {{ stats()?.recruiters ?? 0 }} }
          </div>
          <div class="overview-strip__label">Total Recruiters</div>
        </div>
      </a>

      <div class="overview-strip__divider"></div>

      <div class="overview-strip__col">
        <span class="overview-strip__icon overview-strip__icon--purple">
          <i class="bi bi-globe2"></i>
        </span>
        <div class="overview-strip__data">
          <div class="overview-strip__value">
            @if (loading()) { <span class="overview-strip__skeleton"></span> }
            @else { {{ stats()?.countriesActive ?? 0 }} }
          </div>
          <div class="overview-strip__label">Countries Active</div>
        </div>
      </div>

      <div class="overview-strip__divider"></div>

      <div class="overview-strip__col">
        <span class="overview-strip__icon overview-strip__icon--amber">
          <i class="bi bi-trophy-fill"></i>
        </span>
        <div class="overview-strip__data">
          <div class="overview-strip__value">
            @if (loading()) { <span class="overview-strip__skeleton"></span> }
            @else { {{ stats()?.placementsMade ?? 0 }} }
          </div>
          <div class="overview-strip__label">Placements Made</div>
        </div>
      </div>

      <div class="overview-strip__divider"></div>

      <a routerLink="/admin/edit-requests" class="overview-strip__col"
        [class.overview-strip__col--alert]="(stats()?.pendingEdits ?? 0) > 0">
        <span class="overview-strip__icon"
          [class.overview-strip__icon--rose]="(stats()?.pendingEdits ?? 0) > 0"
          [class.overview-strip__icon--slate]="(stats()?.pendingEdits ?? 0) === 0">
          <i class="bi"
            [class.bi-exclamation-circle-fill]="(stats()?.pendingEdits ?? 0) > 0"
            [class.bi-check-circle-fill]="(stats()?.pendingEdits ?? 0) === 0"></i>
        </span>
        <div class="overview-strip__data">
          <div class="overview-strip__value"
            [style.color]="(stats()?.pendingEdits ?? 0) > 0 ? '#e11d48' : 'inherit'">
            @if (loading()) { <span class="overview-strip__skeleton"></span> }
            @else { {{ stats()?.pendingEdits ?? 0 }} }
          </div>
          <div class="overview-strip__label">Pending Edits</div>
        </div>
      </a>

    </div>

    <!-- ════════════════════════════════════════════════════════════════════
         SECTION 3 — COMMUNITY
         Style: Dark gradient feature cards
    ════════════════════════════════════════════════════════════════════ -->
    <div class="adm-section-label">
      <i class="bi bi-heart-fill"></i> Community
    </div>

    <div class="dash-stat-grid dash-stat-grid--3 mb-4">

      <!-- Total Volunteers — Deep Purple -->
      <div class="dark-stat-card dark-stat-card--purple">
        <div class="dark-stat-card__orb"></div>
        <div class="dark-stat-card__icon"><i class="bi bi-hand-thumbs-up-fill"></i></div>
        <div class="dark-stat-card__value">
          @if (loading()) { <span class="dark-stat-card__skeleton"></span> }
          @else { {{ stats()?.totalVolunteers ?? 0 }} }
        </div>
        <div class="dark-stat-card__label">Total Volunteers</div>
        <div class="dark-stat-card__badge">
          <i class="bi bi-people-fill"></i> Registered
        </div>
      </div>

      <!-- Active Volunteers — Deep Teal -->
      <div class="dark-stat-card dark-stat-card--teal">
        <div class="dark-stat-card__orb"></div>
        <div class="dark-stat-card__icon"><i class="bi bi-person-check-fill"></i></div>
        <div class="dark-stat-card__value">
          @if (loading()) { <span class="dark-stat-card__skeleton"></span> }
          @else { {{ stats()?.activeVolunteers ?? 0 }} }
        </div>
        <div class="dark-stat-card__label">Active Volunteers</div>
        <div class="dark-stat-card__badge">
          <i class="bi bi-circle-fill" style="font-size:.4rem"></i> Ready to help
        </div>
      </div>

      <!-- Candidates Helped — Deep Orange -->
      <div class="dark-stat-card dark-stat-card--orange">
        <div class="dark-stat-card__orb"></div>
        <div class="dark-stat-card__icon"><i class="bi bi-stars"></i></div>
        <div class="dark-stat-card__value">
          @if (loading()) { <span class="dark-stat-card__skeleton"></span> }
          @else { {{ stats()?.candidatesHelpedThisMonth ?? 0 }} }
        </div>
        <div class="dark-stat-card__label">Candidates Helped This Month</div>
        <div class="dark-stat-card__badge">
          <i class="bi bi-arrow-up-right"></i> Via volunteers
        </div>
      </div>

    </div>

    <!-- ── Quick Actions ─────────────────────────────────────────────────── -->
    <div class="adm-section-label">
      <i class="bi bi-lightning-charge-fill"></i> Quick Actions
    </div>

    <div class="d-flex flex-column gap-2">

      <a routerLink="/admin/candidates" class="nav-link-card nav-link-card--primary">
        <div class="nav-link-card__icon"><i class="bi bi-people-fill"></i></div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Manage Candidates</div>
          <div class="nav-link-card__desc">View, search and manage all candidate profiles</div>
        </div>
        <span class="nav-link-card__badge" style="background:var(--th-primary-soft);color:var(--th-primary)">
          {{ stats()?.candidates ?? 0 }} total
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/recruiters" class="nav-link-card nav-link-card--success">
        <div class="nav-link-card__icon"><i class="bi bi-person-badge-fill"></i></div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Manage Recruiters</div>
          <div class="nav-link-card__desc">Create and control recruiter accounts</div>
        </div>
        <span class="nav-link-card__badge" style="background:var(--th-emerald-soft);color:var(--th-emerald)">
          {{ stats()?.recruiters ?? 0 }} active
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/edit-requests" class="nav-link-card nav-link-card--warning">
        <div class="nav-link-card__icon"><i class="bi bi-pencil-square"></i></div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Review Edit Requests</div>
          <div class="nav-link-card__desc">Approve or reject pending profile change requests</div>
        </div>
        @if ((stats()?.pendingEdits ?? 0) > 0) {
          <span class="nav-link-card__badge" style="background:var(--th-amber-soft);color:var(--th-amber)">
            {{ stats()?.pendingEdits }} pending
          </span>
        }
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/audit-logs" class="nav-link-card nav-link-card--info">
        <div class="nav-link-card__icon"><i class="bi bi-journal-text"></i></div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Audit Logs</div>
          <div class="nav-link-card__desc">Track all user actions and system events</div>
        </div>
        <span class="nav-link-card__badge" style="background:var(--th-cyan-soft);color:var(--th-cyan)">
          {{ stats()?.auditLogsToday ?? 0 }} today
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/volunteers" class="nav-link-card nav-link-card--purple">
        <div class="nav-link-card__icon"><i class="bi bi-hand-thumbs-up-fill"></i></div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Manage Volunteers</div>
          <div class="nav-link-card__desc">View and manage volunteer profiles</div>
        </div>
        <span class="nav-link-card__badge" style="background:var(--th-violet-soft);color:var(--th-violet)">
          {{ stats()?.activeVolunteers ?? 0 }} active
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/contact-submissions" class="nav-link-card nav-link-card--primary">
        <div class="nav-link-card__icon"><i class="bi bi-envelope-fill"></i></div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Contact Requests</div>
          <div class="nav-link-card__desc">Review messages and enquiries submitted via the website contact form</div>
        </div>
        @if (unreadCount() > 0) {
          <span class="nav-link-card__badge" style="background:var(--th-primary-soft);color:var(--th-primary)">
            {{ unreadCount() }} unread
          </span>
        }
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

    </div>
  `,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats              = signal<AdminStats | null>(null);
  loading            = signal(true);
  submissions        = signal<ContactSubmission[]>([]);
  submissionsLoading = signal(true);

  unreadCount     = computed(() => this.submissions().filter(s => !s.is_read).length);
  submissionTotal = computed(() => this.submissions().length);

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
    private contactSvc: ContactSubmissionService,
    public notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    this.statsService.getAdminStats().subscribe({
      next:  s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.contactSvc.list(1, 50).subscribe({
      next:  r => { this.submissions.set(r.data); this.submissionsLoading.set(false); },
      error: () => this.submissionsLoading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.notifications.stopPolling();
  }

  email(): string { return this.auth.currentUser()?.email ?? ''; }

  adminName(): string {
    return this.auth.currentUser()?.name ?? '';
  }

  timeOfDay(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  today(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
