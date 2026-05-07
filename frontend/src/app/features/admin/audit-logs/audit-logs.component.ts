// src/app/features/admin/audit-logs/audit-logs.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuditLogService, PaginatedAuditLogs } from '../../../core/services/audit-log.service';
import { AuditLog } from '../../../core/models/audit-log.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <!-- Header -->
    <app-page-header
      title="Audit Logs"
      [subtitle]="pagination.total + ' total entries'"
      icon="bi-shield-check"
    >
      <button class="btn btn-sm btn-outline-secondary" (click)="clearFilters()">
        <i class="bi bi-x-circle me-1"></i>Clear Filters
      </button>
    </app-page-header>

        <!-- Filters -->
        <div class="filter-card">
          <div class="filter-card__title"><i class="bi bi-funnel"></i> Filters</div>
          <form [formGroup]="filterForm" class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label small mb-1">Action</label>
              <select class="form-select form-select-sm" formControlName="action">
                <option value="">All actions</option>
                @for (a of knownActions; track a) {
                  <option [value]="a">{{ a }}</option>
                }
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">Resource</label>
              <input type="text" class="form-control form-control-sm"
                formControlName="resource" placeholder="e.g. candidate">
            </div>
            <div class="col-md-3">
              <label class="form-label small mb-1">User</label>
              <input type="text" class="form-control form-control-sm"
                formControlName="userSearch" placeholder="Search by user ID…">
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">From</label>
              <input type="date" class="form-control form-control-sm" formControlName="from">
            </div>
            <div class="col-md-2">
              <label class="form-label small mb-1">To</label>
              <input type="date" class="form-control form-control-sm" formControlName="to">
            </div>
          </form>
        </div>

        <!-- Loading -->
        @if (loading) {
          <div class="loading-state">
            <div class="spinner-border"></div>
            <div class="loading-state__text">Loading logs…</div>
          </div>
        }

        <!-- Empty -->
        @if (!loading && logs.length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <i class="bi bi-clipboard-x"></i>
            </div>
            <h5 class="empty-state-title">No audit log entries found</h5>
            <p class="empty-state-message">Try adjusting your filters.</p>
          </div>
        }

        <!-- Table -->
        @if (!loading && logs.length > 0) {
          <div class="section-card">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 small">
                <thead class="table-light">
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Resource ID</th>
                    <th>IP Address</th>
                    <th>Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of logs; track log.id) {
                    <tr>
                      <td class="text-nowrap text-muted" style="font-size:.75rem">
                        {{ log.created_at | date:'dd MMM yyyy, HH:mm:ss' }}
                      </td>
                      <td class="fw-semibold">
                        {{ log.user_name || 'Admin' }}
                      </td>
                      <td>
                        <span class="badge rounded-pill"
                          [class]="actionBadgeClass(log.action)">
                          {{ log.action }}
                        </span>
                      </td>
                      <td>{{ log.resource || '—' }}</td>
                      <td class="text-muted" style="font-size:.7rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        {{ log.resource_id || '—' }}
                      </td>
                      <td class="text-muted" style="font-size:.75rem">
                        {{ log.ip_address || '—' }}
                      </td>
                      <td style="max-width:220px">
                        @if (log.metadata) {
                          <button class="btn btn-link btn-sm p-0 text-decoration-none"
                            (click)="toggleMeta(log.id)">
                            {{ expandedId === log.id ? 'Hide' : 'Show' }}
                          </button>
                          @if (expandedId === log.id) {
                            <pre class="mt-1 bg-light rounded p-2 small mb-0"
                              style="max-height:120px;overflow:auto;font-size:.7rem">{{ log.metadata | json }}</pre>
                          }
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (pagination.pages > 1) {
              <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                <small class="text-muted">
                  Page {{ pagination.page }} of {{ pagination.pages }}
                  ({{ pagination.total }} entries)
                </small>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-secondary"
                    [disabled]="pagination.page === 1"
                    (click)="goToPage(pagination.page - 1)">&laquo;</button>
                  @for (pg of pageRange(); track pg) {
                    <button class="btn btn-sm"
                      [class.btn-primary]="pg === pagination.page"
                      [class.btn-outline-secondary]="pg !== pagination.page"
                      (click)="goToPage(pg)">{{ pg }}</button>
                  }
                  <button class="btn btn-sm btn-outline-secondary"
                    [disabled]="pagination.page === pagination.pages"
                    (click)="goToPage(pagination.page + 1)">&raquo;</button>
                </div>
              </div>
            }
          </div>
        }
  `,
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[]   = [];
  knownActions: string[] = [];
  pagination = { page: 1, limit: 50, total: 0, pages: 1 };
  loading    = true;
  expandedId: string | null = null;

  filterForm!: FormGroup;

  constructor(
    private auditSvc: AuditLogService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      action:     [''],
      resource:   [''],
      userSearch: [''],
      from:       [''],
      to:         [''],
    });

    // Load distinct actions for the dropdown
    this.auditSvc.getDistinctActions().subscribe({
      next: (res) => (this.knownActions = res.actions),
    });

    // Debounce filter changes
    this.filterForm.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(() => {
      this.pagination.page = 1;
      this.load();
    });

    this.load();
  }

  load(): void {
    this.loading = true;
    const v = this.filterForm.value;
    const filters: Record<string, unknown> = {
      page:  this.pagination.page,
      limit: this.pagination.limit,
    };
    if (v.action)     filters['action']   = v.action;
    if (v.resource)   filters['resource'] = v.resource;
    if (v.userSearch) filters['userId']   = v.userSearch;
    if (v.from)       filters['from']     = v.from;
    if (v.to)         filters['to']       = v.to;

    this.auditSvc.list(filters).subscribe({
      next: (res) => {
        this.logs       = res.data;
        this.pagination = res.pagination;
        this.loading    = false;
      },
      error: () => (this.loading = false),
    });
  }

  clearFilters(): void {
    this.filterForm.reset({ action: '', resource: '', userSearch: '', from: '', to: '' });
    this.pagination.page = 1;
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.load();
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  toggleMeta(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  actionBadgeClass(action: string): string {
    const a = action.toLowerCase();
    if (a.startsWith('login') || a.startsWith('logout'))
      return 'badge-action badge-action--login';
    if (a.includes('delete') || a.includes('deactivate'))
      return 'badge-action badge-action--delete';
    if (a.includes('add') || a.includes('create') || a.includes('register') || a.includes('request') || a.includes('submit') || a.includes('invite'))
      return 'badge-action badge-action--create';
    if (a.includes('update') || a.includes('approve') || a.includes('reject') || a.includes('review') || a.includes('reviewed') || a.includes('bulk'))
      return 'badge-action badge-action--update';
    return 'badge-action badge-action--default';
  }
}
