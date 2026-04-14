// src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, AdminStats } from '../../../core/services/stats.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ── Welcome Hero ──────────────────────────────────────────────────── -->
    <div class="dash-hero">
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
        <div>
          <div class="dash-hero__greeting">Admin Portal</div>
          <h1 class="dash-hero__title mb-0">Good {{ timeOfDay() }},</h1>
          <div class="dash-hero__subtitle mt-1">{{ email() }}</div>
          <div class="dash-hero__meta">
            <span class="dash-hero__chip">
              <i class="bi bi-calendar3"></i>{{ today() }}
            </span>
            <span class="dash-hero__badge">
              <i class="bi bi-shield-fill-check"></i>Administrator
            </span>
          </div>
        </div>

      </div>
      <div class="dash-hero__actions">
        <a routerLink="/admin/employees/register" class="dash-hero__btn dash-hero__btn--solid">
          <i class="bi bi-person-plus-fill"></i>Add Employee
        </a>
        <a routerLink="/admin/recruiters/create" class="dash-hero__btn">
          <i class="bi bi-person-badge"></i>New Recruiter
        </a>
        <a routerLink="/admin/edit-requests" class="dash-hero__btn">
          <i class="bi bi-pencil-square"></i>Edit Requests
          @if ((stats()?.pendingEdits ?? 0) > 0) {
            <span class="badge rounded-pill ms-1"
              style="background:rgba(255,255,255,.25);font-size:.65rem">
              {{ stats()?.pendingEdits }}
            </span>
          }
        </a>
      </div>
    </div>

    <!-- ── Bento Stats Grid ──────────────────────────────────────────────── -->
    <div class="bento-grid mb-4">

      <!-- Employees — wide card -->
      <div class="bento-6">
        <div class="stat-card-xl stat-card-xl--primary h-100">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-people-fill"></i>
            </div>
            <span class="badge rounded-pill"
              style="background:rgba(99,102,241,.12);color:#4338ca;font-size:.7rem;font-weight:600">
              Active
            </span>
          </div>
          <div class="stat-card-xl__value">
            @if (loading()) {
              <span class="skeleton" style="width:80px;height:40px;display:block"></span>
            } @else {
              {{ stats()?.employees ?? 0 }}
            }
          </div>
          <div class="stat-card-xl__label">Total Employees</div>
          <div class="stat-card-xl__trend" style="background:rgba(99,102,241,.10);color:#4338ca">
            <i class="bi bi-arrow-up-right"></i>On platform
          </div>
        </div>
      </div>

      <!-- Recruiters -->
      <div class="bento-3">
        <div class="stat-card-xl stat-card-xl--success h-100">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-person-badge-fill"></i>
            </div>
          </div>
          <div class="stat-card-xl__value">
            @if (loading()) {
              <span class="skeleton" style="width:60px;height:40px;display:block"></span>
            } @else {
              {{ stats()?.recruiters ?? 0 }}
            }
          </div>
          <div class="stat-card-xl__label">Recruiters</div>
        </div>
      </div>

      <!-- Pending Edits -->
      <div class="bento-3">
        <div class="stat-card-xl h-100"
          [class.stat-card-xl--warning]="(stats()?.pendingEdits ?? 0) > 0"
          [class.stat-card-xl--info]="(stats()?.pendingEdits ?? 0) === 0">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-pencil-square"></i>
            </div>
          </div>
          <div class="stat-card-xl__value">
            @if (loading()) {
              <span class="skeleton" style="width:60px;height:40px;display:block"></span>
            } @else {
              {{ stats()?.pendingEdits ?? 0 }}
            }
          </div>
          <div class="stat-card-xl__label">Pending Edits</div>
          @if ((stats()?.pendingEdits ?? 0) > 0) {
            <div class="stat-card-xl__trend" style="background:rgba(245,158,11,.12);color:#92400e">
              <i class="bi bi-exclamation-circle-fill"></i>Needs review
            </div>
          }
        </div>
      </div>

      <!-- Audit Logs Today — full width accent card -->
      <div class="bento-12">
        <div class="stat-card-xl stat-card-xl--info">
          <div class="d-flex align-items-center gap-3">
            <div class="stat-card-xl__icon flex-shrink-0" style="width:52px;height:52px">
              <i class="bi bi-journal-text"></i>
            </div>
            <div class="flex-grow-1">
              <div class="stat-card-xl__label mb-1">Audit Logs Today</div>
              <div class="stat-card-xl__value" style="font-size:1.875rem">
                @if (loading()) {
                  <span class="skeleton" style="width:60px;height:30px;display:block"></span>
                } @else {
                  {{ stats()?.auditLogsToday ?? 0 }}
                }
              </div>
            </div>
            <a routerLink="/admin/audit-logs"
              class="btn btn-sm ms-auto flex-shrink-0"
              style="background:rgba(6,182,212,.12);color:#0e7490;border:1px solid rgba(6,182,212,.22);font-weight:600">
              View All <i class="bi bi-arrow-right ms-1"></i>
            </a>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Quick Actions ────────────────────────────────────────────────── -->
    <div class="mb-3">
      <div class="section-title">
        <i class="bi bi-lightning-charge-fill" style="color:var(--th-primary)"></i>
        Quick Actions
      </div>
    </div>

    <div class="d-flex flex-column gap-2">
      <a routerLink="/admin/employees" class="nav-link-card nav-link-card--primary">
        <div class="nav-link-card__icon">
          <i class="bi bi-people-fill"></i>
        </div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Manage Employees</div>
          <div class="nav-link-card__desc">View, search and manage all employee profiles</div>
        </div>
        <span class="nav-link-card__badge"
          style="background:var(--th-primary-soft);color:var(--th-primary)">
          {{ stats()?.employees ?? 0 }} total
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/recruiters" class="nav-link-card nav-link-card--success">
        <div class="nav-link-card__icon">
          <i class="bi bi-person-badge-fill"></i>
        </div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Manage Recruiters</div>
          <div class="nav-link-card__desc">Create and control recruiter accounts</div>
        </div>
        <span class="nav-link-card__badge"
          style="background:var(--th-emerald-soft);color:var(--th-emerald)">
          {{ stats()?.recruiters ?? 0 }} active
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/edit-requests" class="nav-link-card nav-link-card--warning">
        <div class="nav-link-card__icon">
          <i class="bi bi-pencil-square"></i>
        </div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Review Edit Requests</div>
          <div class="nav-link-card__desc">Approve or reject pending profile change requests</div>
        </div>
        @if ((stats()?.pendingEdits ?? 0) > 0) {
          <span class="nav-link-card__badge"
            style="background:var(--th-amber-soft);color:var(--th-amber)">
            {{ stats()?.pendingEdits }} pending
          </span>
        }
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>

      <a routerLink="/admin/audit-logs" class="nav-link-card nav-link-card--info">
        <div class="nav-link-card__icon">
          <i class="bi bi-journal-text"></i>
        </div>
        <div class="nav-link-card__body">
          <div class="nav-link-card__title">Audit Logs</div>
          <div class="nav-link-card__desc">Track all user actions and system events</div>
        </div>
        <span class="nav-link-card__badge"
          style="background:var(--th-cyan-soft);color:var(--th-cyan)">
          {{ stats()?.auditLogsToday ?? 0 }} today
        </span>
        <i class="bi bi-chevron-right nav-link-card__arrow"></i>
      </a>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  stats   = signal<AdminStats | null>(null);
  loading = signal(true);

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.statsService.getAdminStats().subscribe({
      next:  s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  email(): string { return this.auth.currentUser()?.email ?? ''; }

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
