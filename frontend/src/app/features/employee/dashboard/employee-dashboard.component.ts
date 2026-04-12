// src/app/features/employee/dashboard/employee-dashboard.component.ts
import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, EmployeeStats } from '../../../core/services/stats.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ── Welcome Hero ──────────────────────────────────────────────────── -->
    <div class="dash-hero" style="background:var(--th-gradient-success);background-size:200% 200%">
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
        <div>
          <div class="dash-hero__greeting">Employee Portal</div>
          <h1 class="dash-hero__title mb-0">Good {{ timeOfDay() }},</h1>
          <div class="dash-hero__subtitle mt-1">{{ email() }}</div>
          <div class="dash-hero__meta">
            <span class="dash-hero__chip">
              <i class="bi bi-calendar3"></i>{{ today() }}
            </span>
            @if (stats()?.pendingRequest) {
              <span class="dash-hero__chip" style="background:rgba(245,158,11,.2);border-color:rgba(245,158,11,.3)">
                <i class="bi bi-clock-history"></i>Edit request pending
              </span>
            }
          </div>
        </div>

        <!-- Circular completion ring -->
        @if (!loading() && stats()) {
          <div class="d-flex flex-column align-items-center gap-1">
            <div class="ring-wrap">
              <svg viewBox="0 0 80 80" width="80" height="80">
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#10b981" />
                    <stop offset="100%" style="stop-color:#06b6d4" />
                  </linearGradient>
                </defs>
                <circle class="ring-bg" cx="40" cy="40" r="33" />
                <circle class="ring-fill" cx="40" cy="40" r="33"
                  [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="dashOffset()" />
              </svg>
              <div class="ring-wrap__label">
                {{ stats()!.profileCompleteness }}<br>
                <span>%</span>
              </div>
            </div>
            <div style="font-size:.7rem;color:rgba(255,255,255,.7);text-align:center;max-width:72px">
              Profile complete
            </div>
          </div>
        }
      </div>

      <div class="dash-hero__actions">
        <a routerLink="/employee/profile" class="dash-hero__btn dash-hero__btn--solid">
          <i class="bi bi-person-circle"></i>View Profile
        </a>
        <a routerLink="/employee/edit-request" class="dash-hero__btn">
          <i class="bi bi-pencil"></i>Request Edit
        </a>
      </div>
    </div>

    <!-- ── Profile Health Card ────────────────────────────────────────────── -->
    @if (!loading() && stats()) {
      <div class="card mb-4" style="border-radius:var(--th-radius-xl);overflow:hidden;border:1px solid var(--th-border)">
        <!-- Header -->
        <div class="d-flex align-items-center gap-3 px-4 py-3"
          style="background:var(--th-surface-raised);border-bottom:1px solid var(--th-border)">
          <div style="width:32px;height:32px;border-radius:var(--th-radius-sm);background:var(--th-gradient-success);
            display:flex;align-items:center;justify-content:center;color:#fff;font-size:.875rem;flex-shrink:0">
            <i class="bi bi-activity"></i>
          </div>
          <span style="font-size:.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--th-text-secondary)">
            Profile Health
          </span>
          <span class="ms-auto" style="font-size:1.25rem;font-weight:800;color:var(--th-emerald)">
            {{ stats()!.profileCompleteness }}%
          </span>
        </div>

        <!-- Progress bar -->
        <div class="px-4 pt-3 pb-1">
          <div class="progress" style="height:10px;border-radius:999px">
            <div class="progress-bar"
              role="progressbar"
              [style.width]="stats()!.profileCompleteness + '%'"
              [attr.aria-valuenow]="stats()!.profileCompleteness"
              aria-valuemin="0" aria-valuemax="100"
              style="border-radius:999px;background:var(--th-gradient-success)">
            </div>
          </div>
        </div>

        <!-- Tips row -->
        <div class="px-4 pb-3 pt-2">
          @if (stats()!.profileCompleteness < 100) {
            <p style="font-size:.8125rem;color:var(--th-text-secondary);margin:0">
              <i class="bi bi-info-circle me-1" style="color:var(--th-info)"></i>
              Complete your profile to improve visibility to recruiters.
              <a routerLink="/employee/edit-request" style="color:var(--th-primary);font-weight:600;text-decoration:none">
                &nbsp;Update now →
              </a>
            </p>
          } @else {
            <p style="font-size:.8125rem;color:var(--th-emerald);margin:0;font-weight:600">
              <i class="bi bi-check-circle-fill me-1"></i>
              Your profile is complete and fully visible to recruiters!
            </p>
          }
        </div>
      </div>
    }

    <!-- ── Stats Bento ──────────────────────────────────────────────────── -->
    <div class="bento-grid mb-4">
      <div class="bento-6">
        <div class="stat-card-xl stat-card-xl--success h-100">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-person-check-fill"></i>
            </div>
          </div>
          <div class="stat-card-xl__value">
            @if (loading()) {
              <span class="skeleton" style="width:80px;height:40px;display:block"></span>
            } @else {
              {{ stats()?.profileCompleteness ?? 0 }}%
            }
          </div>
          <div class="stat-card-xl__label">Profile Completeness</div>
          <div class="stat-card-xl__trend" style="background:rgba(16,185,129,.12);color:#065f46">
            <i class="bi bi-graph-up-arrow"></i>Recruiter visibility
          </div>
        </div>
      </div>

      <div class="bento-6">
        <div class="stat-card-xl h-100"
          [class.stat-card-xl--warning]="stats()?.pendingRequest"
          [class.stat-card-xl--info]="!stats()?.pendingRequest">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-pencil-square"></i>
            </div>
          </div>
          <div class="stat-card-xl__value" style="font-size:1.75rem">
            @if (loading()) {
              <span class="skeleton" style="width:80px;height:28px;display:block"></span>
            } @else {
              {{ stats()?.pendingRequest ? 'Pending' : 'None' }}
            }
          </div>
          <div class="stat-card-xl__label">Edit Request</div>
          @if (stats()?.pendingRequest) {
            <div class="stat-card-xl__trend" style="background:rgba(245,158,11,.12);color:#92400e">
              <i class="bi bi-hourglass-split"></i>Under review
            </div>
          } @else {
            <div class="stat-card-xl__trend" style="background:rgba(6,182,212,.12);color:#0e7490">
              <i class="bi bi-check-circle"></i>No active request
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ── Quick Actions ────────────────────────────────────────────────── -->
    <div class="mb-3">
      <div class="section-title">
        <i class="bi bi-lightning-charge-fill" style="color:var(--th-emerald)"></i>
        Quick Actions
      </div>
    </div>

    <div class="d-flex flex-column gap-2">
      <a routerLink="/employee/profile" class="nav-link-card nav-link-card--success">
        <div class="nav-link-card__icon">
          <i class="bi bi-person-circle"></i>
        </div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">My Profile</div>
          <div class="nav-link-card__desc">View your full profile as seen by recruiters</div>
        </div>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/employee/edit-request" class="nav-link-card nav-link-card--warning">
        <div class="nav-link-card__icon">
          <i class="bi bi-pencil"></i>
        </div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Request Edit</div>
          <div class="nav-link-card__desc">Submit changes to your profile for admin approval</div>
        </div>
        @if (stats()?.pendingRequest) {
          <span class="nav-link-card__badge"
            style="background:var(--th-amber-soft);color:var(--th-amber)">
            Pending
          </span>
        }
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>
    </div>
  `,
})
export class EmployeeDashboardComponent implements OnInit {
  stats   = signal<EmployeeStats | null>(null);
  loading = signal(true);

  readonly circumference = 2 * Math.PI * 33; // r = 33

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.statsService.getEmployeeStats().subscribe({
      next:  s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  email(): string { return this.auth.currentUser()?.email ?? ''; }

  dashOffset(): number {
    const pct = this.stats()?.profileCompleteness ?? 0;
    return this.circumference * (1 - pct / 100);
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
