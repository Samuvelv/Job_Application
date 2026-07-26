// src/app/features/recruiter/shortlist/shortlist.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ShortlistEntry } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-shortlist',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      [title]="'SHORTLIST.title' | translate"
      [subtitle]="('SHORTLIST.subtitle' | translate: { count: entries.length })"
      icon="bi-bookmark-star"
    >
      <a routerLink="/recruiter/candidates" class="btn btn-outline-primary btn-sm">
        <i class="bi bi-search me-1"></i>{{ 'SHORTLIST.browse_btn' | translate }}
      </a>
    </app-page-header>

    <!-- Filter bar -->
    @if (!loading && allEntries.length > 0) {
      <div class="filter-card">
        <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <div class="filter-card__search-row">
            <div class="filter-card__search-input-wrap">
              <i class="bi bi-search"></i>
              <input type="text" class="form-control form-control-sm"
                formControlName="search"
                [placeholder]="'SHORTLIST.search_placeholder' | translate"
                (keydown.enter)="applyFilters()">
            </div>
            <div class="filter-card__actions">
              <button type="submit" class="filter-search-btn">
                <i class="bi bi-search"></i> {{ 'COMMON.perform_search' | translate }}
              </button>
              <button type="button" class="filter-card__adv-toggle"
                [class.is-open]="advOpen"
                (click)="advOpen = !advOpen">
                <i class="bi bi-sliders2"></i> {{ 'COMMON.advanced' | translate }}
                @if (activeAdvCount > 0) {
                  <span class="filter-card__badge">{{ activeAdvCount }}</span>
                }
                <i class="bi bi-chevron-down adv-toggle__caret"></i>
              </button>
              @if (hasAnyFilter) {
                <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                  <i class="bi bi-x-lg"></i> {{ 'COMMON.clear' | translate }}
                </button>
              }
            </div>
          </div>

          <div class="filter-card__advanced" [class.is-open]="advOpen">
            <div class="filter-card__advanced-inner">
              <div class="row g-2">
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <label class="filter-card__section-label">{{ 'SHORTLIST.industry_label' | translate }}</label>
                  <input type="text" class="form-control form-control-sm"
                    formControlName="industry" placeholder="e.g. Technology">
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <label class="filter-card__section-label">{{ 'SHORTLIST.country_label' | translate }}</label>
                  <input type="text" class="form-control form-control-sm"
                    formControlName="currentCountry" placeholder="e.g. Australia">
                </div>
                <div class="col-sm-6 col-md-4 col-lg-3">
                  <label class="filter-card__section-label">{{ 'SHORTLIST.min_experience' | translate }}</label>
                  <input type="number" class="form-control form-control-sm"
                    formControlName="yearsExperience" placeholder="e.g. 3" min="0">
                </div>
              </div>
              <div class="mt-3 d-flex gap-2">
                <button type="submit" class="filter-search-btn">
                  <i class="bi bi-search"></i> {{ 'COMMON.apply_filters' | translate }}
                </button>
                @if (hasAnyFilter) {
                  <button type="button" class="filter-clear-btn" (click)="clearFilters()">
                    <i class="bi bi-x-lg"></i> {{ 'COMMON.clear_all' | translate }}
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
        <div class="loading-state__text">{{ 'SHORTLIST.loading' | translate }}</div>
      </div>
    } @else if (allEntries.length === 0) {
      <app-empty-state
        icon="bi-bookmark"
        [title]="'SHORTLIST.empty_title' | translate"
        [subtitle]="'SHORTLIST.empty_sub' | translate"
        [actionLabel]="'SHORTLIST.browse_talent' | translate"
        actionRoute="/recruiter/candidates"
      />
    } @else if (entries.length === 0) {
      <app-empty-state
        icon="bi-search"
        [title]="'SHORTLIST.no_results' | translate"
        [subtitle]="'SHORTLIST.no_results_sub' | translate"
      />
    } @else {
      <div class="cl-grid">
        @for (entry of entries; track entry.shortlist_id) {

          <div class="cl-card">

            <!-- Added date badge (top-left) -->
            <span style="
              position:absolute;top:.55rem;left:.55rem;
              display:inline-flex;align-items:center;gap:.25rem;
              font-size:.62rem;font-weight:600;letter-spacing:.3px;
              padding:.2rem .45rem;border-radius:999px;
              background:var(--th-surface-alt);color:var(--th-text-muted);
              border:1px solid var(--th-border);
              pointer-events:none;z-index:1;">
              <i class="bi bi-calendar3"></i> {{ entry.shortlisted_at | date:'dd MMM yyyy' }}
            </span>

            <!-- Shortlisted badge (top-right) -->
            <span style="
              position:absolute;top:.55rem;right:.55rem;
              display:inline-flex;align-items:center;gap:.25rem;
              font-size:.62rem;font-weight:700;letter-spacing:.4px;text-transform:uppercase;
              padding:.2rem .45rem;border-radius:999px;
              background:rgba(245,158,11,.13);color:#f59e0b;
              border:1px solid rgba(245,158,11,.4);
              pointer-events:none;z-index:1;">
              <i class="bi bi-bookmark-star-fill"></i> {{ 'SHORTLIST.shortlisted_badge' | translate }}
            </span>

            <!-- Hero -->
            <div class="cl-card__hero">
              <div class="cl-card__avatar-wrap">
                @if (entry.profile_photo_url) {
                  <img [src]="entry.profile_photo_url" alt=""
                    class="cl-card__avatar"
                    (error)="$any($event.target).style.display='none'">
                } @else {
                  <div class="cl-card__avatar-placeholder">
                    {{ entry.first_name[0] }}{{ entry.last_name[0] }}
                  </div>
                }
              </div>
              <div class="cl-card__name">{{ entry.first_name }} {{ entry.last_name }}</div>
              <div class="cl-card__job">{{ entry.job_title || entry.occupation || '—' }}</div>
            </div>

            <!-- Info rows -->
            <div style="display:flex;flex-direction:column;gap:0;border:1px solid var(--th-border);border-radius:.625rem;overflow:hidden;">

              @if (entry.industry) {
                <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;border-bottom:1px solid var(--th-border);">
                  <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
                    <i class="bi bi-building" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'SHORTLIST.industry_label' | translate }}
                    <span style="margin-left:auto;">:</span>
                  </span>
                  <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ entry.industry }}</span>
                </div>
              }

              @if (entry.years_experience != null) {
                <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;border-bottom:1px solid var(--th-border);">
                  <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
                    <i class="bi bi-clock-history" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'CANDIDATE_CARD.exp' | translate }}
                    <span style="margin-left:auto;">:</span>
                  </span>
                  <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ entry.years_experience === 1 ? ('SHORTLIST.exp_year' | translate: { n: entry.years_experience }) : ('SHORTLIST.exp_years' | translate: { n: entry.years_experience }) }}</span>
                </div>
              }

              @if (entry.current_country) {
                <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;border-bottom:1px solid var(--th-border);">
                  <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
                    <i class="bi bi-geo-alt-fill" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'COMMON.location' | translate }}
                    <span style="margin-left:auto;">:</span>
                  </span>
                  <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ entry.current_city ? entry.current_city + ', ' : '' }}{{ entry.current_country }}</span>
                </div>
              }

              @if (entry.target_locations?.[0]) {
                <div style="display:flex;align-items:center;gap:0;padding:.42rem .7rem;">
                  <span style="display:inline-flex;align-items:center;gap:.3rem;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--th-text-muted);min-width:6.2rem;flex-shrink:0;">
                    <i class="bi bi-send-fill" style="font-size:.72rem;color:var(--th-primary);opacity:.8;"></i>{{ 'CANDIDATE_CARD.target' | translate }}
                    <span style="margin-left:auto;">:</span>
                  </span>
                  <span style="font-size:.8rem;font-weight:500;color:var(--th-text);padding-left:.5rem;">{{ entry.target_locations![0] }}</span>
                </div>
              }

            </div>

            <!-- Note (if any) -->
            @if (entry.notes) {
              <div style="font-size:.75rem;color:var(--th-text-muted);background:var(--th-surface-alt);border:1px solid var(--th-border);border-radius:.5rem;padding:.4rem .6rem;">
                <i class="bi bi-sticky me-1"></i>{{ entry.notes }}
              </div>
            }

            <!-- Actions -->
            <div class="cl-card__actions">
              <a [routerLink]="['/recruiter/candidates', entry.candidate_id]"
                [queryParams]="{ returnTo: 'shortlist' }"
                class="cl-card__action cl-card__action--view">
                <i class="bi bi-eye"></i><span>{{ 'COMMON.view' | translate }}</span>
              </a>

              <button class="cl-card__action cl-card__action--danger"
                style="width:auto;padding:.3rem .55rem;"
                (click)="remove(entry)"
                [disabled]="removing === entry.candidate_id"
                [title]="'SHORTLIST.remove' | translate">
                @if (removing === entry.candidate_id) {
                  <span class="spinner-border spinner-border-sm" style="width:.75rem;height:.75rem;border-width:2px;"></span>
                  <span>{{ 'SHORTLIST.removing' | translate }}</span>
                } @else {
                  <i class="bi bi-bookmark-x"></i>
                  <span>{{ 'SHORTLIST.remove' | translate }}</span>
                }
              </button>
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
    private translateService: TranslateService,
  ) {
    this.filterForm = this.fb.group({
      search:          [''],
      industry:        [''],
      currentCountry:  [''],
      yearsExperience: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  get activeAdvCount(): number {
    const v = this.filterForm.value;
    return [v.industry, v.currentCountry, v.yearsExperience]
      .filter(x => x !== null && x !== '' && x !== undefined).length;
  }

  get hasAnyFilter(): boolean {
    return Object.values(this.filterForm.value).some(x => x !== null && x !== '' && x !== undefined);
  }

  applyFilters(): void {
    const v = this.filterForm.value;
    const search   = (v.search  || '').toLowerCase().trim();
    const industry = (v.industry || '').toLowerCase().trim();
    const country  = (v.currentCountry || '').toLowerCase().trim();
    const minYrs   = v.yearsExperience ? +v.yearsExperience : null;

    this.entries = this.allEntries.filter(e => {
      if (search   && !`${e.first_name} ${e.last_name} ${e.job_title || ''} ${e.occupation || ''}`.toLowerCase().includes(search))   return false;
      if (industry && !(e.industry        || '').toLowerCase().includes(industry)) return false;
      if (country  && !(e.current_country || '').toLowerCase().includes(country))  return false;
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
        this.allEntries = this.allEntries.filter(e => e.candidate_id !== entry.candidate_id);
        this.entries    = this.entries.filter(e => e.candidate_id !== entry.candidate_id);
        this.toast.success(this.translateService.instant('SHORTLIST.removed_success', { name: `${entry.first_name} ${entry.last_name}` }));
      },
      error: (err) => {
        this.removing = null;
        this.toast.error(err?.error?.message ?? this.translateService.instant('SHORTLIST.remove_failed'));
      },
    });
  }
}
