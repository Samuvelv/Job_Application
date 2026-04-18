// src/app/features/recruiter/candidates/candidates.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CandidateService, PaginatedCandidates } from '../../../core/services/candidate.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Candidate, CandidateFilters } from '../../../core/models/candidate.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CandidateFilterSidebarComponent } from '../../../shared/components/candidate-filter-sidebar/candidate-filter-sidebar.component';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    PageHeaderComponent, EmptyStateComponent, CandidateFilterSidebarComponent,
  ],
  template: `
    <app-page-header
      title="Search Talent"
      [subtitle]="pagination.total + ' candidates available'"
      icon="bi-person-search"
    />

    <!-- Top search bar -->
    <div class="cfs-topbar mb-3">
      <div class="cfs-topbar__search">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control form-control-sm"
          [formControl]="searchCtrl"
          placeholder="Search name, job title, skills…"
          (keydown.enter)="doSearch()">
      </div>
      <div class="cfs-topbar__actions">
        <button type="button" class="filter-search-btn" (click)="doSearch()">
          <i class="bi bi-search"></i> Search
        </button>
        <button type="button" class="cfs-toggle-sidebar-btn"
          [class.active]="sidebarVisible"
          (click)="toggleSidebar()">
          <i class="bi bi-sliders2"></i>
          <span class="d-none d-sm-inline">Filters</span>
          @if (sidebarActiveCount > 0) {
            <span class="cfs-filter-badge">{{ sidebarActiveCount }}</span>
          }
        </button>
        @if (hasActiveFilters) {
          <button type="button" class="filter-clear-btn" (click)="clearAll()">
            <i class="bi bi-x-lg"></i> Clear
          </button>
        }
      </div>
    </div>

    <!-- Filter sidebar (right-side off-canvas) -->
    <app-candidate-filter-sidebar
      #filterSidebar
      [showProfileStatus]="false"
      (filtersApplied)="onFiltersApplied($event)"
      (sidebarToggled)="onSidebarToggled($event)">
    </app-candidate-filter-sidebar>

    <!-- Results -->
    <div class="cfs-results">

        @if (loading) {
          <div class="loading-state">
            <div class="spinner-border"></div>
            <div class="loading-state__text">Searching candidates…</div>
          </div>
        } @else if (candidates.length === 0) {
          <app-empty-state
            icon="bi-person-search"
            title="No candidates match your filters"
            subtitle="Try adjusting your search criteria."
          />
        } @else {
          <div class="row g-3">
            @for (emp of candidates; track emp.id) {
              <div class="col-12 col-xl-4 col-lg-6 col-md-6">
                <div class="candidate-card" [class.candidate-card--shortlisted]="shortlistedIds.has(emp.id)">

                  <div class="candidate-card__band"></div>

                  <div class="candidate-card__header">
                    @if (emp.profile_photo_url) {
                      <img [src]="emp.profile_photo_url" alt="photo" class="candidate-card__avatar">
                    } @else {
                      <div class="candidate-card__avatar-placeholder">
                        {{ emp.first_name[0] }}{{ emp.last_name[0] }}
                      </div>
                    }
                    <div class="overflow-hidden flex-grow-1">
                      <div class="candidate-card__name">{{ emp.first_name }} {{ emp.last_name }}</div>
                      <div class="candidate-card__title">{{ emp.job_title || emp.occupation || '—' }}</div>
                      @if (emp.current_city || emp.current_country) {
                        <div class="candidate-card__location">
                          <i class="bi bi-geo-alt"></i>
                          {{ emp.current_city }}{{ emp.current_city && emp.current_country ? ', ' : '' }}{{ emp.current_country }}
                        </div>
                      }
                    </div>
                    @if (shortlistedIds.has(emp.id)) {
                      <span class="candidate-card__bookmark candidate-card__bookmark--active" title="Shortlisted">
                        <i class="bi bi-bookmark-star-fill"></i>
                      </span>
                    }
                  </div>

                  <div class="candidate-card__meta">
                    @if (emp.industry) {
                      <span class="cand-badge cand-badge--industry">
                        <i class="bi bi-building"></i> {{ emp.industry }}
                      </span>
                    }
                    @if (emp.years_experience != null) {
                      <span class="cand-badge cand-badge--exp">
                        <i class="bi bi-briefcase"></i> {{ emp.years_experience }} yrs
                      </span>
                    }
                    @if (emp.salary_min || emp.salary_max) {
                      <span class="cand-badge cand-badge--salary">
                        <i class="bi bi-cash-coin"></i>
                        {{ emp.salary_currency || '' }}
                        {{ emp.salary_min | number }}{{ emp.salary_max ? ('–' + (emp.salary_max | number)) : '' }}
                      </span>
                    }
                  </div>

                  @if (emp.skills?.length) {
                    <div class="candidate-card__skills">
                      @for (s of emp.skills!.slice(0, 3); track s.skill_name) {
                        <span class="tag-chip tag-chip--skill small">{{ s.skill_name }}</span>
                      }
                      @if (emp.skills!.length > 3) {
                        <span class="cand-badge cand-badge--more">+{{ emp.skills!.length - 3 }}</span>
                      }
                    </div>
                  }

                  <div class="candidate-card__footer">
                    <button class="btn btn-sm btn-primary flex-grow-1 cand-view-btn"
                      (click)="viewProfile(emp)">
                      <i class="bi bi-person-lines-fill me-1"></i>View Profile
                    </button>
                    @if (!shortlistedIds.has(emp.id)) {
                      <button class="btn btn-sm btn-outline-secondary candidate-card__shortlist-btn"
                        (click)="shortlist(emp)" [disabled]="shortlisting === emp.id" title="Add to shortlist">
                        @if (shortlisting === emp.id) {
                          <span class="spinner-border spinner-border-sm"></span>
                        } @else {
                          <i class="bi bi-bookmark-plus"></i>
                        }
                      </button>
                    }
                  </div>

                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (pagination.pages > 1) {
            <nav class="mt-4 d-flex justify-content-center">
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item" [class.disabled]="pagination.page === 1">
                  <button class="page-link" (click)="goToPage(pagination.page - 1)">«</button>
                </li>
                @for (pg of pageNumbers(); track pg) {
                  <li class="page-item" [class.active]="pg === pagination.page">
                    <button class="page-link" (click)="goToPage(pg)">{{ pg }}</button>
                  </li>
                }
                <li class="page-item" [class.disabled]="pagination.page === pagination.pages">
                  <button class="page-link" (click)="goToPage(pagination.page + 1)">»</button>
                </li>
              </ul>
            </nav>
          }
        }

      </div><!-- /cfs-results -->
  `,
})
export class CandidatesComponent implements OnInit {
  @ViewChild('filterSidebar') filterSidebar!: CandidateFilterSidebarComponent;

  candidates: Candidate[] = [];
  pagination = { page: 1, limit: 12, total: 0, pages: 0 };
  loading = false;
  shortlistedIds = new Set<string>();
  shortlisting: string | null = null;
  sidebarVisible = true;
  sidebarActiveCount = 0;
  hasActiveFilters = false;

  searchCtrl = new FormControl('');
  private sidebarFilters: CandidateFilters = {};

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private candidateService: CandidateService,
    private recruiterService: RecruiterService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadShortlist();
    this.load();
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
    if (this.sidebarVisible) this.filterSidebar.openSidebar();
    else this.filterSidebar.closeSidebar();
  }

  onSidebarToggled(open: boolean): void {
    this.sidebarVisible = open;
  }

  onFiltersApplied(filters: CandidateFilters): void {
    this.sidebarFilters = filters;
    this.sidebarActiveCount = Object.keys(filters).length;
    this.hasActiveFilters = this.sidebarActiveCount > 0 || !!this.searchCtrl.value;
    this.pagination.page = 1;
    this.load();
  }

  doSearch(): void {
    this.hasActiveFilters = Object.keys(this.sidebarFilters).length > 0 || !!this.searchCtrl.value;
    this.pagination.page = 1;
    this.load();
  }

  clearAll(): void {
    this.searchCtrl.setValue('');
    this.sidebarFilters = {};
    this.sidebarActiveCount = 0;
    this.hasActiveFilters = false;
    this.filterSidebar?.clearAll();
    this.pagination.page = 1;
    this.load();
  }

  loadShortlist(): void {
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.shortlistedIds = new Set(res.shortlist.map((e) => e.candidate_id));
      },
    });
  }

  load(): void {
    this.loading = true;
    const params: CandidateFilters = {
      ...this.sidebarFilters,
      search: this.searchCtrl.value || undefined,
      page:   this.pagination.page,
      limit:  this.pagination.limit,
    };
    this.candidateService.list(params)
      .pipe(catchError(() => of(null as unknown as PaginatedCandidates)))
      .subscribe((res) => {
        this.loading = false;
        if (res) { this.candidates = res.data; this.pagination = res.pagination; }
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.pagination.pages }, (_, i) => i + 1);
  }

  viewProfile(emp: Candidate): void {
    this.router.navigate(['/recruiter/candidates', emp.id]);
  }

  shortlist(emp: Candidate): void {
    this.shortlisting = emp.id;
    this.recruiterService.addToShortlist(emp.id).subscribe({
      next: () => {
        this.shortlisting = null;
        this.shortlistedIds = new Set([...this.shortlistedIds, emp.id]);
        this.toast.success(`${emp.first_name} ${emp.last_name} added to shortlist`);
      },
      error: (err) => {
        this.shortlisting = null;
        this.toast.error(err?.error?.message ?? 'Failed to shortlist');
      },
    });
  }
}
