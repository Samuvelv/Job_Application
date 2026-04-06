// src/app/features/employee/dashboard/employee-dashboard.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, EmployeeStats } from '../../../core/services/stats.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, PageHeaderComponent],
  template: `
    <app-page-header title="My Dashboard" icon="bi-grid-1x2-fill">
      <span class="text-muted small">{{ email() }}</span>
    </app-page-header>

    <!-- Stats -->
    <div class="row g-3 mb-4">
      <div class="col-6">
        <app-stat-card
          label="Profile Completeness"
          [value]="(stats()?.profileCompleteness ?? 0) + '%'"
          icon="bi-person-check-fill"
          color="success"
          [loading]="loading()" />
      </div>
      <div class="col-6">
        <app-stat-card
          label="Pending Request"
          [value]="stats()?.pendingRequest ? 'Yes' : 'None'"
          icon="bi-pencil-square"
          color="warning"
          [loading]="loading()" />
      </div>
    </div>

    <!-- Progress bar for completeness -->
    @if (!loading() && stats()) {
      <div class="card p-4 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="fw-semibold small">Profile Completeness</span>
          <span class="small text-gradient fw-semibold">{{ stats()!.profileCompleteness }}%</span>
        </div>
        <div class="progress" style="height:8px">
          <div class="progress-bar"
               role="progressbar"
               [style.width]="stats()!.profileCompleteness + '%'"
               [attr.aria-valuenow]="stats()!.profileCompleteness"
               aria-valuemin="0" aria-valuemax="100">
          </div>
        </div>
        @if (stats()!.profileCompleteness < 100) {
          <p class="text-muted small mt-2 mb-0">
            Complete your profile to improve visibility to recruiters.
          </p>
        }
      </div>
    }

    <!-- Quick actions -->
    <div class="row g-3">
      <div class="col-sm-6">
        <div class="action-card action-card--primary">
          <div class="action-card__icon">
            <i class="bi bi-person-circle"></i>
          </div>
          <h5 class="fw-semibold mb-1">My Profile</h5>
          <p class="text-muted small flex-grow-1">View and manage your profile details.</p>
          <a routerLink="/employee/profile" class="btn btn-primary btn-sm mt-2 align-self-start">
            View Profile
          </a>
        </div>
      </div>
      <div class="col-sm-6">
        <div class="action-card action-card--warning">
          <div class="action-card__icon">
            <i class="bi bi-pencil"></i>
          </div>
          <h5 class="fw-semibold mb-1">Request Edit</h5>
          <p class="text-muted small flex-grow-1">Submit changes to your profile for admin approval.</p>
          <a routerLink="/employee/edit-request" class="btn btn-outline-primary btn-sm mt-2 align-self-start">
            Request
          </a>
        </div>
      </div>
    </div>
  `,
})
export class EmployeeDashboardComponent implements OnInit {
  stats   = signal<EmployeeStats | null>(null);
  loading = signal(true);

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
}
