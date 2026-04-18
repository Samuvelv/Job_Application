// src/app/features/recruiter/shortlist/shortlist.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ShortlistEntry } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-shortlist',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="My Shortlist"
      [subtitle]="entries.length + ' candidate(s) shortlisted'"
      icon="bi-bookmark-star"
    >
      <a routerLink="/recruiter/candidates" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-search me-1"></i>Browse Candidates
      </a>
    </app-page-header>

    <!-- Filter card (client-side) -->
    @if (!loading && allEntries.length > 0) {
      <div class="filter-card">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">

          <!-- Basic row -->
          <div class="filter-card__search-row">
            <div class="filter-card__search-input-wrap">
              <i class="bi bi-search"></i>
              <input type="text" class="form-control form-control-sm"
                formControlName="search"
                placeholder="Search name, job title…"
                (keydown.enter)="applyFilters()">
            </div>
            <div class="filter-card__actions">
              <button type="submit" class="filter-search-btn">
                <i class="bi bi-search"></i> Search
              </button>
              <button type="button" class="filter-card__adv-toggle"
                [class.is-open]="advOpen"
                (click)="advOpen = !advOpen">
                <i class="bi bi-sliders2"></i>
                Advanced
                @if (activeAdvCount > 0) {
                  <span class="filter-card__badge">{{ activeAdvCount }}</span>
                }
                <i class="bi bi-chevron-down adv-toggle__caret"></i>
              </button>
              @if (hasAnyFilter) {
                <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                  <i class="bi bi-x-lg"></i> Clear
                </button>
              }
            </div>
          </div>

          <!-- Advanced panel -->
          <div class="filter-card__advanced" [class.is-open]="advOpen">
            <div class="filter-card__advanced-inner">
              <div class="row g-2">
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <label class="filter-card__section-label">Industry</label>
                  <input type="text" class="form-control form-control-sm"
                    formControlName="industry" placeholder="e.g. Technology">
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <label class="filter-card__section-label">Country</label>
                  <input type="text" class="form-control form-control-sm"
                    formControlName="currentCountry" placeholder="e.g. Australia">
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <label class="filter-card__section-label">Min. Experience (yrs)</label>
                  <input type="number" class="form-control form-control-sm"
                    formControlName="yearsExperience" placeholder="e.g. 3" min="0">
                </div>
              </div>
              <div class="mt-3 d-flex gap-2">
                <button type="submit" class="filter-search-btn">
                  <i class="bi bi-search"></i> Apply Filters
                </button>
                @if (hasAnyFilter) {
                  <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                    <i class="bi bi-x-lg"></i> Clear All
                  </button>
                }
              </div>
            </div>
          </div>

        </form>
      </div>
    }

    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading shortlist…</div>
      </div>
    } @else if (allEntries.length === 0) {
      <app-empty-state
        icon="bi-bookmark"
        title="Your shortlist is empty"
        subtitle="Browse candidates and add them to your shortlist."
        actionLabel="Browse Talent"
        actionRoute="/recruiter/candidates"
      />
    } @else if (entries.length === 0) {
      <app-empty-state
        icon="bi-search"
        title="No results match your filters"
        subtitle="Try adjusting your search criteria."
      />
    } @else {
      <div class="row g-3">
        @for (entry of entries; track entry.shortlist_id) {
          <div class="col-md-6 col-lg-4">
            <div class="candidate-card">

              <!-- Avatar + name -->
              <div class="candidate-card__header">
                @if (entry.profile_photo_url) {
                  <img [src]="entry.profile_photo_url" alt="photo"
                    class="rounded-circle flex-shrink-0"
                    style="width:52px;height:52px;object-fit:cover;">
                } @else {
                  <div class="candidate-card__avatar-placeholder">
                    {{ entry.first_name[0] }}{{ entry.last_name[0] }}
                  </div>
                }
                <div class="overflow-hidden">
                  <div class="candidate-card__name">{{ entry.first_name }} {{ entry.last_name }}</div>
                  <div class="candidate-card__title">{{ entry.job_title || entry.occupation || '—' }}</div>
                </div>
              </div>

              <!-- Meta -->
              <div class="small text-muted mb-2">
                @if (entry.industry) {
                  <span class="badge bg-light text-dark border me-1">{{ entry.industry }}</span>
                }
                @if (entry.current_city || entry.current_country) {
                  <span>
                    <i class="bi bi-geo-alt me-1"></i>{{ entry.current_city }}{{ entry.current_city && entry.current_country ? ', ' : '' }}{{ entry.current_country }}
                  </span>
                }
              </div>

              @if (entry.years_experience != null) {
                <div class="small text-muted mb-2">
                  <i class="bi bi-briefcase me-1"></i>{{ entry.years_experience }} yrs experience
                </div>
              }

              @if (entry.notes) {
                <div class="alert alert-light py-1 px-2 small mb-2">
                  <i class="bi bi-sticky me-1"></i><span class="text-muted">Note:</span> {{ entry.notes }}
                </div>
              }

              <div class="text-muted small mb-3">
                <i class="bi bi-calendar3 me-1"></i>Added {{ entry.shortlisted_at | date:'dd MMM yyyy' }}
              </div>

              <div class="candidate-card__footer">
                <button class="btn btn-sm btn-outline-danger flex-grow-1"
                  (click)="remove(entry)" [disabled]="removing === entry.candidate_id">
                  @if (removing === entry.candidate_id) {
                    <span class="spinner-border spinner-border-sm me-1"></span>Removing…
                  } @else {
                    <i class="bi bi-bookmark-x me-1"></i>Remove from Shortlist
                  }
                </button>
              </div>

            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ShortlistComponent implements OnInit {
  allEntries: ShortlistEntry[] = [];
  entries: ShortlistEntry[] = [];
  loading = false;
  removing: string | null = null;
  advOpen = false;

  filterForm: FormGroup;

  constructor(
    private recruiterService: RecruiterService,
    private toast: ToastService,
    private fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      search:          [''],
      industry:        [''],
      currentCountry:  [''],
      yearsExperience: [''],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  get activeAdvCount(): number {
    const v = this.filterForm.value;
    return [v.industry, v.currentCountry, v.yearsExperience]
      .filter(x => x !== null && x !== '' && x !== undefined).length;
  }

  get hasAnyFilter(): boolean {
    const v = this.filterForm.value;
    return Object.values(v).some(x => x !== null && x !== '' && x !== undefined);
  }

  applyFilters(): void {
    const v = this.filterForm.value;
    const search  = (v.search || '').toLowerCase().trim();
    const industry = (v.industry || '').toLowerCase().trim();
    const country  = (v.currentCountry || '').toLowerCase().trim();
    const minYrs   = v.yearsExperience ? +v.yearsExperience : null;

    this.entries = this.allEntries.filter(e => {
      if (search && !`${e.first_name} ${e.last_name} ${e.job_title || ''} ${e.occupation || ''}`.toLowerCase().includes(search)) return false;
      if (industry && !(e.industry || '').toLowerCase().includes(industry)) return false;
      if (country  && !(e.current_country || '').toLowerCase().includes(country)) return false;
      if (minYrs !== null && (e.years_experience == null || e.years_experience < minYrs)) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.entries = [...this.allEntries];
  }

  load(): void {
    this.loading = true;
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.loading    = false;
        this.allEntries = res.shortlist;
        this.entries    = [...this.allEntries];
      },
      error: () => (this.loading = false),
    });
  }

  remove(entry: ShortlistEntry): void {
    this.removing = entry.candidate_id;
    this.recruiterService.removeFromShortlist(entry.candidate_id).subscribe({
      next: () => {
        this.removing   = null;
        this.allEntries = this.allEntries.filter((e) => e.candidate_id !== entry.candidate_id);
        this.entries    = this.entries.filter((e) => e.candidate_id !== entry.candidate_id);
        this.toast.success('Removed from shortlist');
      },
      error: (err) => {
        this.removing = null;
        this.toast.error(err?.error?.message ?? 'Failed to remove');
      },
    });
  }
}
