// src/app/features/admin/candidate-list/candidate-list.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { Candidate, CandidateFilters } from '../../../core/models/candidate.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CandidateFilterSidebarComponent } from '../../../shared/components/candidate-filter-sidebar/candidate-filter-sidebar.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-candidate-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    PageHeaderComponent, EmptyStateComponent, CandidateFilterSidebarComponent,
  ],
  template: `
    <app-page-header title="Candidates" icon="bi-people-fill"
                     [subtitle]="pagination.total + ' total candidates'">
      <a routerLink="/admin/candidates/register" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-lg me-1"></i> Register Candidate
      </a>
    </app-page-header>

    <!-- Top search bar -->
    <div class="cfs-topbar mb-3">
      <div class="cfs-topbar__search">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control form-control-sm"
          [formControl]="searchCtrl"
          placeholder="Search name, email, job title…"
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
      [showProfileStatus]="true"
      (filtersApplied)="onFiltersApplied($event)"
      (sidebarToggled)="onSidebarToggled($event)">
    </app-candidate-filter-sidebar>

    <!-- Results area -->
    <div class="cfs-results">

      <!-- Loading -->
      @if (loading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading candidates…</div>
        </div>
      }

      <!-- Empty -->
      @if (!loading && candidates.length === 0) {
        <app-empty-state icon="bi-people"
                         title="No candidates found"
                         message="Try adjusting your filters or register a new candidate." />
      }

      <!-- Table -->
      @if (!loading && candidates.length > 0) {
        <div class="section-card">
            <!-- Desktop table -->
            <div class="table-responsive d-none d-md-block">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Candidate</th>
                    <th>Job Title</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Exp.</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (emp of candidates; track emp.id) {
                    <tr>
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          @if (emp.profile_photo_url) {
                            <img [src]="emp.profile_photo_url" alt=""
                              class="avatar-circle-sm flex-shrink-0" style="object-fit:cover;"
                              (error)="$any($event.target).style.display='none'">
                          } @else {
                            <div class="avatar-circle-sm flex-shrink-0">
                              {{ emp.first_name[0] }}{{ emp.last_name[0] }}
                            </div>
                          }
                          <div>
                            <div class="fw-semibold small">{{ emp.first_name }} {{ emp.last_name }}</div>
                            <div class="text-muted" style="font-size:.75rem">{{ emp.email }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="small">{{ emp.job_title || '—' }}</td>
                      <td class="small">{{ emp.industry || '—' }}</td>
                      <td class="small">{{ emp.current_city || '' }}{{ emp.current_country ? (emp.current_city ? ', ' : '') + emp.current_country : '' || '—' }}</td>
                      <td class="small">{{ emp.years_experience != null ? emp.years_experience + ' yrs' : '—' }}</td>
                      <td>
                        <span class="badge rounded-pill"
                          [class.badge-status-active]="emp.profile_status === 'active'"
                          [class.badge-status-pending]="emp.profile_status === 'pending_edit'"
                          [class.badge-status-inactive]="emp.profile_status === 'inactive'">
                          {{ emp.profile_status | titlecase }}
                        </span>
                      </td>
                      <td>
                        <div class="tbl-actions">
                          <a [routerLink]="['/admin/candidates', emp.id]"
                            class="tbl-actions__btn tbl-actions__btn--view tbl-actions__btn--icon" title="View profile">
                            <i class="bi bi-eye"></i>
                          </a>
                          <a [routerLink]="['/admin/candidates', emp.id, 'edit']"
                            class="tbl-actions__btn tbl-actions__btn--edit tbl-actions__btn--icon" title="Edit candidate">
                            <i class="bi bi-pencil"></i>
                          </a>
                          <div class="tbl-actions__sep"></div>
                          <button class="tbl-actions__btn tbl-actions__btn--mail tbl-actions__btn--icon"
                            (click)="resendCreds(emp)" title="Resend credentials">
                            <i class="bi bi-envelope"></i>
                          </button>
                          <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
                            (click)="deleteCandidate(emp)" title="Delete candidate">
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Mobile card list -->
            <div class="d-md-none">
              @for (emp of candidates; track emp.id) {
                <div class="card-table-row border-bottom p-3">
                  <div class="d-flex align-items-center gap-3 mb-2">
                    @if (emp.profile_photo_url) {
                      <img [src]="emp.profile_photo_url" alt=""
                        class="avatar-circle-sm flex-shrink-0" style="object-fit:cover;"
                        (error)="$any($event.target).style.display='none'">
                    } @else {
                      <div class="avatar-circle-sm flex-shrink-0">
                        {{ emp.first_name[0] }}{{ emp.last_name[0] }}
                      </div>
                    }
                    <div class="flex-grow-1 min-width-0">
                      <div class="fw-semibold text-truncate">{{ emp.first_name }} {{ emp.last_name }}</div>
                      <div class="text-muted small text-truncate">{{ emp.email }}</div>
                    </div>
                    <span class="badge rounded-pill flex-shrink-0"
                      [class.badge-status-active]="emp.profile_status === 'active'"
                      [class.badge-status-pending]="emp.profile_status === 'pending_edit'"
                      [class.badge-status-inactive]="emp.profile_status === 'inactive'">
                      {{ emp.profile_status | titlecase }}
                    </span>
                  </div>
                  <div class="d-flex flex-wrap gap-2 small text-muted mb-2">
                    @if (emp.job_title) { <span><i class="bi bi-briefcase me-1"></i>{{ emp.job_title }}</span> }
                    @if (emp.current_country) { <span><i class="bi bi-geo-alt me-1"></i>{{ emp.current_city ? emp.current_city + ', ' : '' }}{{ emp.current_country }}</span> }
                    @if (emp.years_experience != null) { <span><i class="bi bi-clock-history me-1"></i>{{ emp.years_experience }} yrs</span> }
                  </div>
                  <div class="tbl-actions">
                    <a [routerLink]="['/admin/candidates', emp.id]"
                      class="tbl-actions__btn tbl-actions__btn--view tbl-actions__btn--icon" title="View profile">
                      <i class="bi bi-eye"></i>
                    </a>
                    <a [routerLink]="['/admin/candidates', emp.id, 'edit']"
                      class="tbl-actions__btn tbl-actions__btn--edit tbl-actions__btn--icon" title="Edit candidate">
                      <i class="bi bi-pencil"></i>
                    </a>
                    <div class="tbl-actions__sep"></div>
                    <button class="tbl-actions__btn tbl-actions__btn--mail tbl-actions__btn--icon"
                      (click)="resendCreds(emp)" title="Resend credentials">
                      <i class="bi bi-envelope"></i>
                    </button>
                    <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
                      (click)="deleteCandidate(emp)" title="Delete candidate">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Pagination -->
            @if (pagination.pages > 1) {
              <div class="section-card__footer d-flex justify-content-between align-items-center px-3 py-2 border-top flex-wrap gap-2">
                <small class="text-muted">
                  Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }} results)
                </small>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-secondary"
                    [disabled]="pagination.page === 1" (click)="changePage(pagination.page - 1)">&laquo;</button>
                  @for (pg of pageRange(); track pg) {
                    <button class="btn btn-sm"
                      [class.btn-primary]="pg === pagination.page"
                      [class.btn-outline-secondary]="pg !== pagination.page"
                      (click)="changePage(pg)">{{ pg }}</button>
                  }
                  <button class="btn btn-sm btn-outline-secondary"
                    [disabled]="pagination.page === pagination.pages"
                    (click)="changePage(pagination.page + 1)">&raquo;</button>
                </div>
              </div>
            }
          </div>
        }

      </div><!-- /cfs-results -->
  `,
})
export class CandidateListComponent implements OnInit {
  @ViewChild('filterSidebar') filterSidebar!: CandidateFilterSidebarComponent;

  candidates: Candidate[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 1 };
  loading = true;
  sidebarVisible = true;
  sidebarActiveCount = 0;
  hasActiveFilters = false;

  searchCtrl = this.fb.control('');
  private sidebarFilters: CandidateFilters = {};

  constructor(
    private empSvc: CandidateService,
    private fb: FormBuilder,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.loadCandidates();
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
    this.loadCandidates();
  }

  doSearch(): void {
    this.hasActiveFilters = Object.keys(this.sidebarFilters).length > 0 || !!this.searchCtrl.value;
    this.pagination.page = 1;
    this.loadCandidates();
  }

  clearAll(): void {
    this.searchCtrl.setValue('');
    this.sidebarFilters = {};
    this.sidebarActiveCount = 0;
    this.hasActiveFilters = false;
    this.filterSidebar?.clearAll();
    this.pagination.page = 1;
    this.loadCandidates();
  }

  loadCandidates(): void {
    this.loading = true;
    const params: CandidateFilters = {
      ...this.sidebarFilters,
      search: this.searchCtrl.value || undefined,
      page:   this.pagination.page,
      limit:  20,
    };
    this.empSvc.list(params).subscribe({
      next:  res => { this.candidates = res.data; this.pagination = res.pagination; this.loading = false; },
      error: ()  => { this.loading = false; },
    });
  }

  changePage(page: number): void {
    this.pagination.page = page;
    this.loadCandidates();
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  resendCreds(emp: Candidate): void {
    this.confirm.confirm({ title: 'Resend Credentials', message: `Resend login credentials to ${emp.email}?`, confirmLabel: 'Send', confirmClass: 'btn-primary' })
      .then(ok => {
        if (!ok) return;
        this.empSvc.resendCredentials(emp.id).subscribe({
          next:  () => this.toast.show('Credentials sent!', 'success'),
          error: (err) => this.toast.show(err?.error?.message ?? 'Failed to send', 'error'),
        });
      });
  }

  deleteCandidate(emp: Candidate): void {
    this.confirm.confirm({ title: 'Delete Candidate', message: `Delete ${emp.first_name} ${emp.last_name}? This cannot be undone.`, confirmLabel: 'Delete', confirmClass: 'btn-danger' })
      .then(ok => {
        if (!ok) return;
        this.empSvc.delete(emp.id).subscribe({
          next:  () => { this.toast.show('Candidate deleted', 'success'); this.loadCandidates(); },
          error: (err) => this.toast.show(err?.error?.message ?? 'Delete failed', 'error'),
        });
      });
  }
}
