// src/app/features/candidate/volunteers/volunteer-browse.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { RouterLink }        from '@angular/router';
import { catchError, of }    from 'rxjs';
import { VolunteerService }  from '../../../core/services/volunteer.service';
import { Volunteer }         from '../../../core/models/volunteer.model';
import { PageHeaderComponent }  from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent }  from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-volunteer-browse',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Our Volunteers"
      [subtitle]="pagination.total > 0 ? pagination.total + ' volunteers ready to help' : 'Volunteers'"
      icon="bi-people-fill">
    </app-page-header>

    <!-- Search bar -->
    <div class="filter-card mb-3">
      <div class="filter-card__search-row">
        <div class="filter-card__search-input-wrap">
          <i class="bi bi-search"></i>
          <input type="text" class="form-control form-control-sm"
            [value]="searchTerm"
            (input)="onSearch($event)"
            placeholder="Search by name or role…">
        </div>
        <div class="filter-card__actions">
          @if (searchTerm) {
            <button type="button" class="filter-clear-btn" (click)="clearSearch()">
              <i class="bi bi-x-lg"></i> Clear
            </button>
          }
        </div>
      </div>
    </div>

    @if (loading) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading volunteers…</div>
      </div>

    } @else if (volunteers.length === 0) {
      @if (searchTerm) {
        <app-empty-state
          icon="bi-people"
          title="No volunteers found"
          subtitle="No volunteers match your search. Try a different keyword."
        />
      } @else {
        <app-empty-state
          icon="bi-people"
          title="No volunteers yet"
          subtitle="Volunteers are candidates who successfully secured jobs abroad through TalentHub and have chosen to give back by supporting new job seekers."
        />
      }

    } @else {
      <!-- Volunteer cards grid -->
      <div class="vb-grid">
        @for (v of volunteers; track v.id) {
          <div class="vb-card card h-100">
            <div class="card-body d-flex flex-column">

              <!-- Avatar + name -->
              <div class="d-flex align-items-center gap-3 mb-3">
                @if (v.photo_url) {
                  <img [src]="v.photo_url" [alt]="v.name" class="vb-avatar vb-avatar--photo" />
                } @else {
                  <div class="vb-avatar vb-avatar--initials">{{ initials(v.name) }}</div>
                }
                <div>
                  <div class="fw-semibold text-dark">{{ v.name }}</div>
                  @if (v.role) { <div class="text-muted small">{{ v.role }}</div> }
                  <span class="badge mt-1"
                    [class.bg-success]="v.availability === 'Active'"
                    [class.bg-warning]="v.availability !== 'Active'"
                    [class.text-dark]="v.availability !== 'Active'"
                    style="font-size:10px;">
                    {{ v.availability ?? 'Active' }}
                  </span>
                </div>
              </div>

              <!-- Journey -->
              @if (v.nationality || v.country_placed) {
                <div class="vb-journey mb-3">
                  @if (v.nationality) {
                    <span class="vb-journey__tag">{{ v.nationality }}</span>
                    @if (v.country_placed) {
                      <i class="bi bi-arrow-right text-muted mx-1" style="font-size:11px;"></i>
                    }
                  }
                  @if (v.country_placed) {
                    <span class="vb-journey__tag vb-journey__tag--placed">{{ v.country_placed }}</span>
                  }
                </div>
              }

              <!-- Languages -->
              @if (v.languages?.length) {
                <div class="d-flex flex-wrap gap-1 mb-3">
                  @for (lang of (v.languages ?? []).slice(0,3); track lang) {
                    <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis" style="font-size:10px;">
                      {{ lang }}
                    </span>
                  }
                  @if ((v.languages?.length ?? 0) > 3) {
                    <span class="badge rounded-pill bg-light text-muted" style="font-size:10px;">
                      +{{ (v.languages?.length ?? 0) - 3 }}
                    </span>
                  }
                </div>
              }

              <div class="mt-auto">
                <a [routerLink]="['/candidate/volunteers', v.id]"
                   class="btn btn-outline-primary btn-sm w-100">
                  <i class="bi bi-person-lines-fill me-1"></i>View Profile
                </a>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Paginator -->
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
  `,
  styles: [`
    .vb-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }
    .vb-card { border-radius: 12px; transition: box-shadow .2s; }
    .vb-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.1); }

    .vb-avatar {
      width: 56px; height: 56px;
      border-radius: 50%; flex-shrink: 0; object-fit: cover;
    }
    .vb-avatar--photo { border: 2px solid var(--bs-primary); }
    .vb-avatar--initials {
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; font-weight: 700; font-size: 1.2rem;
    }

    .vb-journey { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
    .vb-journey__tag {
      background: #f3f4f6; color: #374151;
      font-size: 11px; font-weight: 500;
      border-radius: 4px; padding: 2px 8px;
    }
    .vb-journey__tag--placed {
      background: #d1fae5; color: #065f46;
    }
  `],
})
export class VolunteerBrowseComponent implements OnInit {
  volunteers: Volunteer[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading    = false;
  searchTerm = '';
  private searchTimer: any;

  constructor(private volunteerSvc: VolunteerService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.volunteerSvc.list({
      search: this.searchTerm || undefined,
      page:   this.pagination.page,
      limit:  this.pagination.limit,
    }).pipe(catchError(() => of(null))).subscribe((res) => {
      this.loading = false;
      if (res) { this.volunteers = res.data; this.pagination = res.pagination; }
    });
  }

  onSearch(e: Event): void {
    this.searchTerm = (e.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.pagination.page = 1; this.load(); }, 350);
  }

  clearSearch(): void { this.searchTerm = ''; this.pagination.page = 1; this.load(); }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page; this.load();
  }

  pageNumbers(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
