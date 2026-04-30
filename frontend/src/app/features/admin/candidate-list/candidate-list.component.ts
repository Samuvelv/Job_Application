// src/app/features/admin/candidate-list/candidate-list.component.ts
import { Component, OnInit, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../../core/services/candidate.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { Candidate, CandidateFilters } from '../../../core/models/candidate.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { CandidateFilterSidebarComponent } from '../../../shared/components/candidate-filter-sidebar/candidate-filter-sidebar.component';
import { CandidateCardComponent } from '../../../shared/components/candidate-card/candidate-card.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { SORT_OPTIONS } from '../../../core/constants/candidate-options';

@Component({
  selector: 'app-candidate-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    PageHeaderComponent, EmptyStateComponent,
    CandidateFilterSidebarComponent, CandidateCardComponent,
  ],
  template: `
    <app-page-header title="Candidates" icon="bi-people-fill"
                     [subtitle]="pagination.total + ' total candidates'">
      <a routerLink="/admin/candidates/register" class="btn btn-primary btn-sm">
        <i class="bi bi-plus-lg me-1"></i> Register Candidate
      </a>
    </app-page-header>

    <!-- ── Top bar ──────────────────────────────────────────────────────────── -->
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
        <!-- Sort By -->
        <div class="cl-sort-wrap">
          <i class="bi bi-sort-down cl-sort-wrap__icon"></i>
          <select class="form-select form-select-sm cl-sort-select"
            [formControl]="sortCtrl"
            (change)="onSortChange()"
            title="Sort candidates">
            @for (opt of SORT_OPTIONS; track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </div>
        <button type="button" class="cfs-toggle-sidebar-btn"
          [class.active]="sidebarVisible"
          (click)="toggleSidebar()">
          <i class="bi bi-sliders2"></i>
          <span class="d-none d-sm-inline">Filters</span>
          @if (sidebarActiveCount > 0) {
            <span class="cfs-filter-badge">{{ sidebarActiveCount }}</span>
          }
        </button>
        <button type="button" class="cfs-export-btn"
          (click)="exportCsv()" [disabled]="exporting"
          title="Export filtered candidates to CSV">
          @if (exporting) {
            <span class="spinner-border spinner-border-sm" role="status"></span>
          } @else {
            <i class="bi bi-download"></i>
          }
          <span class="d-none d-sm-inline ms-1">Export CSV</span>
        </button>
        <!-- View mode toggle -->
        <div class="cl-view-toggle">
          <button type="button" class="cl-view-toggle__btn"
            [class.cl-view-toggle__btn--active]="viewMode === 'list'"
            (click)="setViewMode('list')" title="List view">
            <i class="bi bi-list-ul"></i>
          </button>
          <button type="button" class="cl-view-toggle__btn"
            [class.cl-view-toggle__btn--active]="viewMode === 'grid'"
            (click)="setViewMode('grid')" title="Grid view">
            <i class="bi bi-grid-3x3-gap-fill"></i>
          </button>
        </div>
        @if (hasActiveFilters) {
          <button type="button" class="filter-clear-btn" (click)="clearAll()">
            <i class="bi bi-x-lg"></i> Clear
          </button>
        }
      </div>
    </div>

    <!-- ── Filter sidebar ───────────────────────────────────────────────────── -->
    <app-candidate-filter-sidebar
      #filterSidebar
      [showProfileStatus]="true"
      (filtersApplied)="onFiltersApplied($event)"
      (sidebarToggled)="onSidebarToggled($event)">
    </app-candidate-filter-sidebar>

    <!-- ── Bulk action bar (above results, sticky) ──────────────────────────── -->
    @if (selectionCount > 0) {
      <!-- Transparent overlay closes the status dropdown on outside click -->
      @if (statusDropOpen) {
        <div class="cl-drop-overlay" (click)="statusDropOpen = false"></div>
      }

      <div class="cl-bulk-bar">
        <!-- Left: count + clear -->
        <div class="cl-bulk-bar__info">
          <i class="bi bi-check2-square"></i>
          <strong>{{ selectionCount }}</strong>
          <span class="d-none d-sm-inline"> candidate{{ selectionCount === 1 ? '' : 's' }} selected</span>
          <button class="cl-bulk-bar__clear-x" (click)="clearSelection()" title="Clear selection">
            <i class="bi bi-x"></i>
          </button>
        </div>

        <!-- Divider -->
        <div class="cl-bulk-bar__sep"></div>

        <!-- Right: action buttons -->
        <div class="cl-bulk-bar__actions">

          <!-- Export selected -->
          <button class="cl-bulk-bar__btn"
            [disabled]="bulkProcessing"
            (click)="exportSelectedCsv()"
            title="Export selected candidates to CSV">
            <i class="bi bi-download"></i>
            <span class="d-none d-sm-inline ms-1">Export</span>
          </button>

          <!-- Change Status dropdown -->
          <div class="cl-bulk-bar__drop-wrap">
            <button class="cl-bulk-bar__btn"
              [disabled]="bulkProcessing"
              (click)="toggleStatusDrop($event)"
              title="Change profile status for selected">
              <i class="bi bi-person-badge"></i>
              <span class="d-none d-sm-inline ms-1">Status</span>
              <i class="bi bi-chevron-down" style="font-size:.6rem;margin-left:.2rem"></i>
            </button>
            @if (statusDropOpen) {
              <div class="cl-bulk-bar__drop">
                @for (s of PROFILE_STATUSES; track s.value) {
                  <button class="cl-bulk-bar__drop-item" (click)="bulkChangeStatus(s.value)">
                    <span class="cl-bulk-bar__drop-dot"
                      [style.background]="s.color"></span>
                    {{ s.label }}
                  </button>
                }
              </div>
            }
          </div>

          <!-- Mark Fee Paid -->
          <button class="cl-bulk-bar__btn cl-bulk-bar__btn--success"
            [disabled]="bulkProcessing"
            (click)="bulkMarkFeePaid()"
            title="Mark registration fee as paid for selected">
            @if (bulkProcessing) {
              <span class="spinner-border spinner-border-sm"></span>
            } @else {
              <i class="bi bi-check-circle-fill"></i>
            }
            <span class="d-none d-sm-inline ms-1">Mark Paid</span>
          </button>

        </div>
      </div>
    }

    <!-- ── Results area ──────────────────────────────────────────────────────── -->
    <div class="cfs-results">

      @if (loading) {
        <div class="loading-state">
          <div class="spinner-border"></div>
          <div class="loading-state__text">Loading candidates…</div>
        </div>
      }

      @if (!loading && candidates.length === 0) {
        <app-empty-state icon="bi-people"
                         title="No candidates found"
                         message="Try adjusting your filters or register a new candidate." />
      }

      @if (!loading && candidates.length > 0) {

        <!-- ══ LIST VIEW ════════════════════════════════════════════════════ -->
        @if (viewMode === 'list') {
          <div class="section-card">
            <!-- Desktop table -->
            <div class="table-responsive d-none d-md-block">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th style="width:44px">
                      <input type="checkbox" class="cl-table-check"
                        [checked]="isAllSelected()"
                        (change)="toggleSelectAll()"
                        title="Select all">
                    </th>
                    <th>#</th>
                    <th>Candidate</th>
                    <th>Job Title</th>
                    <th>Industry</th>
                    <th>Location</th>
                    <th>Exp.</th>
                    <th>Status</th>
                    <th>Fee</th>
                    <th>CV Format</th>
                    <th style="width:48px;text-align:center">Video</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (emp of candidates; track emp.id) {
                    <tr [class.cl-row--selected]="isSelected(emp.id)">
                      <td>
                        <input type="checkbox" class="cl-table-check"
                          [checked]="isSelected(emp.id)"
                          (change)="toggleSelect(emp.id)">
                      </td>
                      <td>
                        @if (emp.candidate_number) {
                          <span class="autocode-badge">{{ emp.candidate_number }}</span>
                        }
                      </td>
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
                      <td class="small">
                        <div>{{ flagOf(emp.current_country) }} {{ emp.current_city || '' }}{{ emp.current_city && emp.current_country ? ', ' : '' }}{{ emp.current_country || '—' }}</div>
                        @if (emp.nationality) {
                          <div class="text-muted" style="font-size:.7rem">{{ flagOf(emp.nationality) }} {{ emp.nationality }}</div>
                        }
                        @if (firstTarget(emp.target_locations)) {
                          <div class="text-muted" style="font-size:.7rem">→ {{ flagOf(firstTarget(emp.target_locations)) }} {{ firstTarget(emp.target_locations) }}</div>
                        }
                      </td>
                      <td class="small">
                        <div>{{ emp.years_experience != null ? emp.years_experience + ' yrs' : '—' }}</div>
                        @if (emp.english_level) {
                          <span class="badge rounded-pill" style="background:var(--th-info-soft,#e0f2fe);color:var(--th-info,#0284c7);font-size:.6rem;margin-top:2px">
                            EN: {{ englishLabel(emp.english_level) }}
                          </span>
                        }
                      </td>
                      <td>
                        <span class="badge rounded-pill"
                          [class.badge-status-active]="emp.profile_status === 'active'"
                          [class.badge-status-pending]="emp.profile_status === 'pending_edit'"
                          [class.badge-status-inactive]="emp.profile_status === 'inactive'">
                          {{ emp.profile_status | titlecase }}
                        </span>
                      </td>
                      <td>
                        <span class="badge rounded-pill"
                          [class.badge-status-active]="emp.registration_fee_status === 'paid'"
                          [class.badge-status-pending]="emp.registration_fee_status === 'pending_payment'"
                          [class.badge-status-inactive]="emp.registration_fee_status === 'waived'">
                          {{ registrationFeeLabel(emp.registration_fee_status) }}
                        </span>
                      </td>
                      <td class="small">
                        @if (emp.cv_format && emp.cv_format !== 'not_yet_created') {
                          <span class="badge rounded-pill"
                            style="background:var(--th-primary-soft);color:var(--th-primary);font-size:.65rem">
                            {{ cvFormatLabel(emp.cv_format) }}
                          </span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                      <td style="text-align:center">
                        @if (emp.intro_video_url) {
                          <i class="bi bi-camera-video-fill" style="color:var(--th-emerald,#10b981)" title="Intro video available"></i>
                        } @else {
                          <i class="bi bi-camera-video-off" style="color:var(--th-muted,#9ca3af)" title="No intro video"></i>
                        }
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
                <div class="card-table-row border-bottom p-3" [class.cl-row--selected]="isSelected(emp.id)">
                  <div class="d-flex align-items-center gap-3 mb-2">
                    <input type="checkbox" class="cl-table-check flex-shrink-0"
                      [checked]="isSelected(emp.id)"
                      (change)="toggleSelect(emp.id)">
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
                    <div class="d-flex flex-column gap-1 align-items-end flex-shrink-0">
                      <span class="badge rounded-pill"
                        [class.badge-status-active]="emp.profile_status === 'active'"
                        [class.badge-status-pending]="emp.profile_status === 'pending_edit'"
                        [class.badge-status-inactive]="emp.profile_status === 'inactive'">
                        {{ emp.profile_status | titlecase }}
                      </span>
                      <span class="badge rounded-pill"
                        [class.badge-status-active]="emp.registration_fee_status === 'paid'"
                        [class.badge-status-pending]="emp.registration_fee_status === 'pending_payment'"
                        [class.badge-status-inactive]="emp.registration_fee_status === 'waived'">
                        {{ registrationFeeLabel(emp.registration_fee_status) }}
                      </span>
                      @if (emp.cv_format && emp.cv_format !== 'not_yet_created') {
                        <span class="badge rounded-pill"
                          style="background:var(--th-primary-soft);color:var(--th-primary);font-size:.65rem">
                          {{ cvFormatLabel(emp.cv_format) }}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="d-flex flex-wrap gap-2 small text-muted mb-2">
                    @if (emp.job_title) { <span><i class="bi bi-briefcase me-1"></i>{{ emp.job_title }}</span> }
                    @if (emp.current_country) { <span><i class="bi bi-geo-alt me-1"></i>{{ flagOf(emp.current_country) }} {{ emp.current_city ? emp.current_city + ', ' : '' }}{{ emp.current_country }}</span> }
                    @if (emp.years_experience != null) { <span><i class="bi bi-clock-history me-1"></i>{{ emp.years_experience }} yrs</span> }
                    @if (emp.nationality) { <span>{{ flagOf(emp.nationality) }} {{ emp.nationality }}</span> }
                    @if (firstTarget(emp.target_locations)) { <span>→ {{ flagOf(firstTarget(emp.target_locations)) }} {{ firstTarget(emp.target_locations) }}</span> }
                    @if (emp.english_level) { <span><i class="bi bi-translate me-1"></i>EN: {{ englishLabel(emp.english_level) }}</span> }
                    <span>
                      @if (emp.intro_video_url) {
                        <i class="bi bi-camera-video-fill" style="color:var(--th-emerald,#10b981)"></i> Video
                      } @else {
                        <i class="bi bi-camera-video-off" style="color:var(--th-muted,#9ca3af)"></i> No video
                      }
                    </span>
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

        <!-- ══ GRID VIEW ════════════════════════════════════════════════════ -->
        @if (viewMode === 'grid') {
          <div class="cl-grid">
            @for (emp of candidates; track emp.id) {
              <app-candidate-card
                [candidate]="emp"
                [selected]="isSelected(emp.id)"
                (selectedChange)="toggleSelect(emp.id)"
                (resendCreds)="resendCreds(emp)"
                (deleteCandidate)="deleteCandidate(emp)"
                (forwardToEmployer)="forwardToEmployer(emp)">
              </app-candidate-card>
            }
          </div>

          <!-- Grid pagination -->
          @if (pagination.pages > 1) {
            <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
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
        }

      }

    </div><!-- /cfs-results -->

  `,
})
export class CandidateListComponent implements OnInit {
  @ViewChild('filterSidebar') filterSidebar!: CandidateFilterSidebarComponent;

  candidates: Candidate[] = [];
  pagination = { page: 1, limit: 20, total: 0, pages: 1 };
  loading = true;
  exporting = false;
  sidebarVisible = true;
  sidebarActiveCount = 0;
  hasActiveFilters = false;

  viewMode: 'list' | 'grid' = 'list';
  selectedIds = new Set<string>();
  bulkProcessing = false;
  statusDropOpen = false;

  readonly PROFILE_STATUSES = [
    { value: 'active',       label: 'Active',       color: 'var(--th-success)' },
    { value: 'inactive',     label: 'Inactive',     color: 'var(--th-muted)'   },
    { value: 'pending_edit', label: 'Pending Edit', color: 'var(--th-warning)' },
  ];

  searchCtrl = this.fb.control('');
  sortCtrl   = this.fb.control('newest');
  readonly SORT_OPTIONS = SORT_OPTIONS;
  private sidebarFilters: CandidateFilters = {};

  constructor(
    private empSvc: CandidateService,
    private fb: FormBuilder,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
    private master: MasterDataService,
  ) {}

  ngOnInit(): void {
    this.master.loadAll();
    this.loadCandidates();
  }

  // ── View mode ────────────────────────────────────────────────────────────────
  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
    this.statusDropOpen = false;
  }

  // ── Selection ────────────────────────────────────────────────────────────────
  isSelected(id: string): boolean { return this.selectedIds.has(id); }

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  isAllSelected(): boolean {
    return this.candidates.length > 0 && this.candidates.every(c => this.selectedIds.has(c.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) this.candidates.forEach(c => this.selectedIds.delete(c.id));
    else this.candidates.forEach(c => this.selectedIds.add(c.id));
  }

  clearSelection(): void { this.selectedIds.clear(); this.statusDropOpen = false; }

  get selectionCount(): number { return this.selectedIds.size; }

  // ── Bulk actions ──────────────────────────────────────────────────────────────
  toggleStatusDrop(e: Event): void {
    e.stopPropagation();
    this.statusDropOpen = !this.statusDropOpen;
  }

  bulkMarkFeePaid(): void {
    const ids = Array.from(this.selectedIds);
    this.confirm.confirm({
      title: 'Mark Fee as Paid',
      message: `Mark registration fee as Paid for ${ids.length} candidate${ids.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Mark Paid',
      confirmClass: 'btn-success',
    }).then(ok => {
      if (!ok) return;
      this.bulkProcessing = true;
      this.empSvc.bulkAction(ids, 'mark_fee_paid').subscribe({
        next: (res) => {
          this.toast.show(res.message, 'success');
          this.bulkProcessing = false;
          this.selectedIds.clear();
          this.loadCandidates();
        },
        error: (err) => {
          this.toast.show(err?.error?.message ?? 'Bulk update failed', 'error');
          this.bulkProcessing = false;
        },
      });
    });
  }

  bulkChangeStatus(status: string): void {
    this.statusDropOpen = false;
    const ids = Array.from(this.selectedIds);
    const label = this.PROFILE_STATUSES.find(s => s.value === status)?.label ?? status;
    this.confirm.confirm({
      title: 'Change Profile Status',
      message: `Set status to "${label}" for ${ids.length} candidate${ids.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Apply',
      confirmClass: 'btn-primary',
    }).then(ok => {
      if (!ok) return;
      this.bulkProcessing = true;
      this.empSvc.bulkAction(ids, 'change_status', { profile_status: status }).subscribe({
        next: (res) => {
          this.toast.show(res.message, 'success');
          this.bulkProcessing = false;
          this.selectedIds.clear();
          this.loadCandidates();
        },
        error: (err) => {
          this.toast.show(err?.error?.message ?? 'Bulk update failed', 'error');
          this.bulkProcessing = false;
        },
      });
    });
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────────
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

  onSortChange(): void {
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

  // ── Data ─────────────────────────────────────────────────────────────────────
  loadCandidates(): void {
    this.loading = true;
    this.selectedIds.clear();
    const params: CandidateFilters = {
      ...this.sidebarFilters,
      search:  this.searchCtrl.value || undefined,
      sortBy:  this.sortCtrl.value   || 'newest',
      page:    this.pagination.page,
      limit:   20,
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

  // ── Export ───────────────────────────────────────────────────────────────────
  exportCsv(): void {
    if (this.exporting) return;
    this.exporting = true;
    const params: CandidateFilters = {
      ...this.sidebarFilters,
      search: this.searchCtrl.value || undefined,
    };
    this.empSvc.exportCsv(params).subscribe({
      next: (blob) => {
        this._downloadBlob(blob, `candidates-${new Date().toISOString().slice(0, 10)}.csv`);
        this.exporting = false;
      },
      error: () => {
        this.toast.show('Export failed. Please try again.', 'error');
        this.exporting = false;
      },
    });
  }

  exportSelectedCsv(): void {
    const selected = this.candidates.filter(c => this.selectedIds.has(c.id));
    if (!selected.length) return;
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return (s.includes('"') || s.includes(',') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const CV_LABELS: Record<string, string> = {
      uk_format: 'UK Format', european_format: 'European Format',
      canadian_format: 'Canadian Format', australian_format: 'Australian Format',
      gulf_format: 'Gulf Format', asian_format: 'Asian Format',
      not_yet_created: 'Not Yet Created',
    };
    const headers = [
      'Candidate No', 'First Name', 'Last Name', 'Email', 'Phone',
      'Current Country', 'Target Countries', 'Profile Status',
      'Registration Fee Status', 'CV Format', 'Created Date',
    ];
    const rows = selected.map(c => [
      esc(c.candidate_number),
      esc(c.first_name),
      esc(c.last_name),
      esc(c.email),
      esc(c.phone),
      esc(c.current_country),
      esc(Array.isArray(c.target_locations) ? c.target_locations.join('; ') : c.target_locations),
      esc(c.profile_status),
      esc(c.registration_fee_status),
      esc(c.cv_format ? (CV_LABELS[c.cv_format] ?? c.cv_format) : ''),
      esc(c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : ''),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this._downloadBlob(blob, `candidates-selected-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private _downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  forwardToEmployer(emp: Candidate): void {
    this.toast.show(`Shortlisting ${emp.first_name} ${emp.last_name} — coming soon.`, 'info');
  }

  resendCreds(emp: Candidate): void {
    this.confirm.confirm({
      title: 'Resend Credentials',
      message: `Resend login credentials to ${emp.email}?`,
      confirmLabel: 'Send',
      confirmClass: 'btn-primary',
    }).then(ok => {
      if (!ok) return;
      this.empSvc.resendCredentials(emp.id).subscribe({
        next:  () => this.toast.show('Credentials sent!', 'success'),
        error: (err) => this.toast.show(err?.error?.message ?? 'Failed to send', 'error'),
      });
    });
  }

  deleteCandidate(emp: Candidate): void {
    this.confirm.confirm({
      title: 'Delete Candidate',
      message: `Delete ${emp.first_name} ${emp.last_name}? This cannot be undone.`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    }).then(ok => {
      if (!ok) return;
      this.empSvc.delete(emp.id).subscribe({
        next:  () => { this.toast.show('Candidate deleted', 'success'); this.loadCandidates(); },
        error: (err) => this.toast.show(err?.error?.message ?? 'Delete failed', 'error'),
      });
    });
  }

  // ── Label helpers ────────────────────────────────────────────────────────────
  private readonly cvFormatLabels: Record<string, string> = {
    uk_format:         'UK',
    european_format:   'EU',
    canadian_format:   'CA',
    australian_format: 'AU',
    gulf_format:       'Gulf',
    asian_format:      'Asia',
    not_yet_created:   '—',
  };

  cvFormatLabel(val?: string): string {
    return val ? (this.cvFormatLabels[val] ?? val) : '—';
  }

  registrationFeeLabel(status?: string): string {
    const map: Record<string, string> = { paid: 'Paid', pending_payment: 'Pending', waived: 'Waived' };
    return status ? (map[status] ?? '—') : '—';
  }

  private readonly flagMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    this.master.countries().forEach(c => map.set(c.name.toLowerCase(), c.flag_emoji));
    return map;
  });

  flagOf(name: string | undefined): string {
    if (!name) return '';
    return this.flagMap().get(name.toLowerCase()) ?? '';
  }

  firstTarget(targets: string[] | undefined): string {
    return targets?.[0] ?? '';
  }

  private readonly englishLabels: Record<string, string> = {
    basic: 'Basic', conversational: 'Conversational', fluent: 'Fluent', native: 'Native',
  };

  englishLabel(level: string | undefined): string {
    if (!level) return '';
    return this.englishLabels[level.toLowerCase()] ?? level;
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
