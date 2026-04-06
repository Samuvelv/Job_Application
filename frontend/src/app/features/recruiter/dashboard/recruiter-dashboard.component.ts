// src/app/features/recruiter/dashboard/recruiter-dashboard.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, RecruiterStats } from '../../../core/services/stats.service';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatCardComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Recruiter Dashboard" icon="bi-grid-1x2-fill">
      <span class="text-muted small">{{ email() }}</span>
    </app-page-header>

    <!-- Stats -->
    <div class="row g-3 mb-4">
      <div class="col-6">
        <app-stat-card
          label="My Shortlist"
          [value]="stats()?.shortlistCount ?? '—'"
          icon="bi-bookmark-star-fill"
          color="purple"
          [loading]="loading()" />
      </div>
      <div class="col-6">
        <app-stat-card
          label="Candidates Available"
          [value]="stats()?.candidatesAvailable ?? '—'"
          icon="bi-people-fill"
          color="info"
          [loading]="loading()" />
      </div>
    </div>

    <!-- Quick actions -->
    <div class="row g-3">
      <div class="col-sm-6">
        <div class="action-card action-card--info">
          <div class="action-card__icon">
            <i class="bi bi-search"></i>
          </div>
          <h5 class="fw-semibold mb-1">Search Talent</h5>
          <p class="text-muted small flex-grow-1">Filter candidates by skills, location, and more.</p>
          <a routerLink="/recruiter/candidates" class="btn btn-primary btn-sm mt-2 align-self-start">
            Search
          </a>
        </div>
      </div>
      <div class="col-sm-6">
        <div class="action-card action-card--purple">
          <div class="action-card__icon">
            <i class="bi bi-bookmark-star-fill"></i>
          </div>
          <h5 class="fw-semibold mb-1">My Shortlist</h5>
          <p class="text-muted small flex-grow-1">View and manage your saved candidates.</p>
          <a routerLink="/recruiter/shortlist" class="btn btn-outline-primary btn-sm mt-2 align-self-start">
            View
          </a>
        </div>
      </div>
    </div>
  `,
})
export class RecruiterDashboardComponent implements OnInit {
  stats   = signal<RecruiterStats | null>(null);
  loading = signal(true);

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.statsService.getRecruiterStats().subscribe({
      next:  s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  email(): string { return this.auth.currentUser()?.email ?? ''; }
}
