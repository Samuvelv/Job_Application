// src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, AdminStats } from '../../../core/services/stats.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Dashboard" icon="bi-grid-1x2-fill">
      <span class="text-muted small">Welcome back, {{ email() }}</span>
    </app-page-header>

    <!-- Stats row -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <app-stat-card
          label="Employees"
          [value]="stats()?.employees ?? '—'"
          icon="bi-people-fill"
          [loading]="loading()" />
      </div>
      <div class="col-6 col-lg-3">
        <app-stat-card
          label="Recruiters"
          [value]="stats()?.recruiters ?? '—'"
          icon="bi-person-badge-fill"
          [loading]="loading()" />
      </div>
      <div class="col-6 col-lg-3">
        <app-stat-card
          label="Pending Edits"
          [value]="stats()?.pendingEdits ?? '—'"
          icon="bi-pencil-square"
          [loading]="loading()" />
      </div>
      <div class="col-6 col-lg-3">
        <app-stat-card
          label="Audit Logs Today"
          [value]="stats()?.auditLogsToday ?? '—'"
          icon="bi-journal-text"
          [loading]="loading()" />
      </div>
    </div>

    <!-- Quick-action cards -->
    <div class="row g-3">
      <div class="col-sm-6 col-lg-4">
        <div class="card h-100 p-4 d-flex flex-column">
          <div class="mb-3">
            <i class="bi bi-people-fill fs-3 text-primary"></i>
          </div>
          <h5 class="fw-semibold mb-1">Employees</h5>
          <p class="text-muted small flex-grow-1">Manage all employee profiles and records.</p>
          <a routerLink="/admin/employees" class="btn btn-primary btn-sm mt-2 align-self-start">
            View All
          </a>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card h-100 p-4 d-flex flex-column">
          <div class="mb-3">
            <i class="bi bi-person-badge-fill fs-3 text-primary"></i>
          </div>
          <h5 class="fw-semibold mb-1">Recruiters</h5>
          <p class="text-muted small flex-grow-1">Create and manage recruiter access.</p>
          <a routerLink="/admin/recruiters" class="btn btn-primary btn-sm mt-2 align-self-start">
            Manage
          </a>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card h-100 p-4 d-flex flex-column">
          <div class="mb-3">
            <i class="bi bi-pencil-square fs-3 text-primary"></i>
          </div>
          <h5 class="fw-semibold mb-1">Edit Requests</h5>
          <p class="text-muted small flex-grow-1">Review and approve pending profile changes.</p>
          <a routerLink="/admin/edit-requests" class="btn btn-primary btn-sm mt-2 align-self-start">
            Review
          </a>
        </div>
      </div>
      <div class="col-sm-6 col-lg-4">
        <div class="card h-100 p-4 d-flex flex-column">
          <div class="mb-3">
            <i class="bi bi-journal-text fs-3 text-primary"></i>
          </div>
          <h5 class="fw-semibold mb-1">Audit Logs</h5>
          <p class="text-muted small flex-grow-1">Track all actions across the platform.</p>
          <a routerLink="/admin/audit-logs" class="btn btn-outline-secondary btn-sm mt-2 align-self-start">
            View Logs
          </a>
        </div>
      </div>
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
}
