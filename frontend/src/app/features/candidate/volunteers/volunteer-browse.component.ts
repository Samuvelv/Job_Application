// src/app/features/candidate/volunteers/volunteer-browse.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { VolunteerService } from '../../../core/services/volunteer.service';
import { Volunteer } from '../../../core/models/volunteer.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-volunteer-browse',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Volunteers"
      [subtitle]="pagination.total + ' available'"
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
            placeholder="Search name, role, email…">
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
          subtitle="Volunteers are candidates who successfully secured jobs abroad through TalentHub and have chosen to give back by supporting new job seekers on their journey."
        />
      }

    } @else {
      <div class="section-card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="small">Name</th>
                <th class="small">Role / Skills</th>
                <th class="small">Email</th>
                <th class="small">Phone</th>
                <th class="small">Notes</th>
              </tr>
            </thead>
            <tbody>
              @for (v of volunteers; track v.id) {
                <tr>
                  <td class="fw-semibold small">{{ v.name }}</td>
                  <td>
                    @if (v.role) {
                      <span class="vol-role-chip">{{ v.role }}</span>
                    } @else {
                      <span class="text-muted small">—</span>
                    }
                  </td>
                  <td class="small">
                    @if (v.email) {
                      <a [href]="'mailto:' + v.email" class="text-decoration-none">{{ v.email }}</a>
                    } @else { <span class="text-muted">—</span> }
                  </td>
                  <td class="small">{{ v.phone || '—' }}</td>
                  <td class="small text-muted" style="max-width:220px">
                    <span class="vol-notes-clamp">{{ v.notes || '—' }}</span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (pagination.pages > 1) {
        <nav class="mt-3 d-flex justify-content-center">
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
})
export class VolunteerBrowseComponent implements OnInit {
  volunteers: Volunteer[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 0 };
  loading = false;
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
}
