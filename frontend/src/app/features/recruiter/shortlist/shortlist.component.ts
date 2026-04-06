// src/app/features/recruiter/shortlist/shortlist.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ShortlistEntry } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-shortlist',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between align-items-start mb-4">
      <app-page-header
        title="My Shortlist"
        [subtitle]="entries.length + ' candidate(s) shortlisted'"
        icon="bi-bookmark-star"
        class="flex-grow-1"
      />
      <a routerLink="/recruiter/candidates" class="btn btn-outline-primary btn-sm mt-1 ms-3">
        <i class="bi bi-search me-1"></i>Browse Candidates
      </a>
    </div>

    @if (loading) {
      <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
    } @else if (entries.length === 0) {
      <app-empty-state
        icon="bi-bookmark"
        title="Your shortlist is empty"
        subtitle="Browse candidates and add them to your shortlist."
        actionLabel="Browse Talent"
        actionRoute="/recruiter/candidates"
      />
    } @else {
      <div class="row g-3">
        @for (entry of entries; track entry.shortlist_id) {
          <div class="col-md-6 col-lg-4">
            <div class="card h-100 p-3 d-flex flex-column">

              <!-- Avatar + name -->
              <div class="d-flex align-items-center gap-3 mb-3">
                @if (entry.profile_photo_url) {
                  <img [src]="entry.profile_photo_url" alt="photo"
                    class="rounded-circle flex-shrink-0"
                    style="width:52px;height:52px;object-fit:cover;">
                } @else {
                  <div class="rounded-circle bg-primary text-white d-flex align-items-center
                    justify-content-center fw-bold flex-shrink-0"
                    style="width:52px;height:52px;font-size:1.1rem">
                    {{ entry.first_name[0] }}{{ entry.last_name[0] }}
                  </div>
                }
                <div class="overflow-hidden">
                  <div class="fw-semibold text-truncate">{{ entry.first_name }} {{ entry.last_name }}</div>
                  <div class="text-muted small text-truncate">{{ entry.job_title || entry.occupation || '—' }}</div>
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

              <div class="mt-auto">
                <button class="btn btn-sm btn-outline-danger w-100"
                  (click)="remove(entry)" [disabled]="removing === entry.employee_id">
                  @if (removing === entry.employee_id) {
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
  entries: ShortlistEntry[] = [];
  loading = false;
  removing: string | null = null;

  constructor(
    private recruiterService: RecruiterService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.recruiterService.getShortlist().subscribe({
      next: (res) => {
        this.loading = false;
        this.entries = res.shortlist;
      },
      error: () => (this.loading = false),
    });
  }

  remove(entry: ShortlistEntry): void {
    this.removing = entry.employee_id;
    this.recruiterService.removeFromShortlist(entry.employee_id).subscribe({
      next: () => {
        this.removing = null;
        this.entries  = this.entries.filter((e) => e.employee_id !== entry.employee_id);
        this.toast.success('Removed from shortlist');
      },
      error: (err) => {
        this.removing = null;
        this.toast.error(err?.error?.message ?? 'Failed to remove');
      },
    });
  }
}
