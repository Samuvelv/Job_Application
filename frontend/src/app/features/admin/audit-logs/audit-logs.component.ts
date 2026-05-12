// src/app/features/admin/audit-logs/audit-logs.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { AuditLog } from '../../../core/models/audit-log.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  providers: [DatePipe],
  template: `
    <!-- Header -->
    <app-page-header
      title="Audit Logs"
      [subtitle]="pagination.total + ' total entries'"
      icon="bi-shield-check"
    >
      <button class="btn btn-sm btn-outline-success"
        [disabled]="exporting || logs.length === 0"
        (click)="exportCsv()">
        <i class="bi bi-download me-1"></i>
        {{ exporting ? 'Exporting…' : 'Export CSV' }}
      </button>
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
        <div class="empty-state__icon"><i class="bi bi-clipboard-x"></i></div>
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
                <th style="width:36px"></th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Entity</th>
                <th>IP Address</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs; track log.id) {

                <!-- ── Summary row ── -->
                <tr class="audit-log-row" [class.is-expanded]="expandedId === log.id"
                  (click)="toggleExpand(log.id)">
                  <td class="text-center" style="width:36px;padding-right:0">
                    <i class="bi bi-chevron-right audit-chevron text-muted"
                      [class.rotated]="expandedId === log.id"
                      style="font-size:.7rem"></i>
                  </td>
                  <td class="text-nowrap text-muted" style="font-size:.75rem">
                    {{ log.created_at | date:'dd MMM yyyy, HH:mm:ss' }}
                  </td>
                  <td class="fw-semibold">
                    {{ log.user_name || 'System' }}
                  </td>
                  <td>
                    <span class="badge rounded-pill" [class]="actionBadgeClass(log.action)">
                      {{ log.action }}
                    </span>
                  </td>
                  <td>{{ log.resource || '—' }}</td>
                  <td class="text-muted"
                    style="font-size:.75rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                    [title]="log.resource_id || ''">
                    {{ resolveResourceLabel(log) }}
                  </td>
                  <td class="text-muted" style="font-size:.75rem">
                    {{ log.ip_address || '—' }}
                  </td>
                  <td style="max-width:240px">
                    @if (log.metadata) {
                      <span class="text-truncate d-inline-block"
                        style="max-width:220px;font-size:.75rem;cursor:default"
                        [title]="metaTooltip(log.metadata)">
                        {{ formatMetadata(log.action, log.metadata) }}
                      </span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                </tr>

                <!-- ── Expanded detail row ── -->
                @if (expandedId === log.id) {
                  <tr class="audit-detail-row">
                    <td colspan="8">
                      <div class="audit-detail">

                        <!-- Column 1: Event Details -->
                        <div class="audit-detail__col">
                          <div class="audit-detail__section-title">
                            <i class="bi bi-clock me-1"></i>Event Details
                          </div>
                          <div class="audit-detail__field">
                            <div class="audit-detail__label">Timestamp</div>
                            <div class="audit-detail__value">
                              {{ log.created_at | date:'dd MMM yyyy' }}<br>
                              <span class="text-muted" style="font-size:.75rem">
                                {{ log.created_at | date:'HH:mm:ss' }} UTC
                              </span>
                            </div>
                          </div>
                          <div class="audit-detail__field mt-2">
                            <div class="audit-detail__label">Action</div>
                            <div class="audit-detail__value">
                              <span class="badge rounded-pill mb-1" [class]="actionBadgeClass(log.action)">
                                {{ log.action }}
                              </span><br>
                              <span class="audit-detail__action-desc">
                                {{ describeAction(log.action) }}
                              </span>
                            </div>
                          </div>
                          @if (log.resource) {
                            <div class="audit-detail__field mt-2">
                              <div class="audit-detail__label">Resource Type</div>
                              <div class="audit-detail__value text-capitalize">
                                {{ log.resource.replace('_', ' ') }}
                              </div>
                            </div>
                          }
                          <div class="audit-detail__field mt-2">
                            <div class="audit-detail__label">Entity</div>
                            <div class="audit-detail__value">{{ resolveResourceLabel(log) }}</div>
                          </div>
                          @if (log.resource_id) {
                            <div class="audit-detail__field mt-2">
                              <div class="audit-detail__label">Resource ID</div>
                              <div class="audit-detail__value audit-detail__uuid">{{ log.resource_id }}</div>
                            </div>
                          }
                        </div>

                        <!-- Column 2: Actor Details -->
                        <div class="audit-detail__col">
                          <div class="audit-detail__section-title">
                            <i class="bi bi-person me-1"></i>Actor Details
                          </div>
                          <div class="audit-detail__field">
                            <div class="audit-detail__label">Name</div>
                            <div class="audit-detail__value fw-semibold">
                              {{ log.user_name || 'System / Automated' }}
                            </div>
                          </div>
                          @if (log.user_email) {
                            <div class="audit-detail__field mt-2">
                              <div class="audit-detail__label">Email</div>
                              <div class="audit-detail__value">{{ log.user_email }}</div>
                            </div>
                          }
                          <div class="audit-detail__field mt-2">
                            <div class="audit-detail__label">Role</div>
                            <div class="audit-detail__value">
                              <span class="badge rounded-pill audit-detail__role-badge">
                                {{ log.user_role || 'System' }}
                              </span>
                            </div>
                          </div>
                          @if (log.user_id) {
                            <div class="audit-detail__field mt-2">
                              <div class="audit-detail__label">User ID</div>
                              <div class="audit-detail__value audit-detail__uuid">{{ log.user_id }}</div>
                            </div>
                          }
                          <div class="audit-detail__field mt-2">
                            <div class="audit-detail__label">IP Address</div>
                            <div class="audit-detail__value">
                              {{ log.ip_address || '—' }}
                            </div>
                          </div>
                        </div>

                        <!-- Column 3: Full Metadata -->
                        <div class="audit-detail__col">
                          <div class="audit-detail__section-title">
                            <i class="bi bi-card-list me-1"></i>Metadata
                          </div>
                          @if (metadataEntries(log.metadata).length > 0) {
                            <table class="audit-detail__meta-table">
                              <tbody>
                                @for (entry of metadataEntries(log.metadata); track entry.key) {
                                  <tr>
                                    <td>{{ entry.label }}</td>
                                    <td>{{ entry.value }}</td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          } @else {
                            <span class="text-muted" style="font-size:.75rem">No metadata recorded</span>
                          }
                        </div>

                      </div>
                    </td>
                  </tr>
                }

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
  logs: AuditLog[]       = [];
  knownActions: string[] = [];
  pagination = { page: 1, limit: 25, total: 0, pages: 1 };
  loading    = true;
  exporting  = false;
  expandedId: string | null = null;

  filterForm!: FormGroup;

  constructor(
    private auditSvc: AuditLogService,
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      action:     [''],
      resource:   [''],
      userSearch: [''],
      from:       [''],
      to:         [''],
    });

    this.auditSvc.getDistinctActions().subscribe({
      next: (res) => (this.knownActions = res.actions),
    });

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
    this.expandedId = null;
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.pages) return;
    this.pagination.page = page;
    this.expandedId = null;
    this.load();
  }

  pageRange(): number[] {
    const { page, pages } = this.pagination;
    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────

  exportCsv(): void {
    if (this.logs.length === 0) {
      this.toast.show('No audit logs available to export.', 'warning');
      return;
    }
    this.exporting = true;
    const v = this.filterForm.value;
    const filters: Record<string, unknown> = {};
    if (v.action)     filters['action']   = v.action;
    if (v.resource)   filters['resource'] = v.resource;
    if (v.userSearch) filters['userId']   = v.userSearch;
    if (v.from)       filters['from']     = v.from;
    if (v.to)         filters['to']       = v.to;

    this.auditSvc.exportCsv(filters).subscribe({
      next: (blob) => {
        const date = new Date().toISOString().slice(0, 10);
        this._downloadBlob(blob, `audit-logs-${date}.csv`);
        this.exporting = false;
      },
      error: () => {
        this.toast.show('Export failed. Please try again.', 'error');
        this.exporting = false;
      },
    });
  }

  private _downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Expand / collapse ──────────────────────────────────────────────────────

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  // ── Resource label ─────────────────────────────────────────────────────────

  resolveResourceLabel(log: AuditLog): string {
    const a = (log.action ?? '').toUpperCase();
    const m = log.metadata ?? {};

    if (a === 'LOGIN' || a === 'LOGOUT' || a.startsWith('AUTH_')) return '—';

    if (a.includes('EMPLOYEE') || a === 'INVITE_VOLUNTEER' || a === 'RESEND_CREDENTIALS') {
      const name = m['candidate_name'];
      if (name && typeof name === 'string' && name.trim()) return name.trim();
      return 'Unknown Candidate';
    }

    if (a.includes('RECRUITER')) {
      const company = m['company_name'];
      if (company && typeof company === 'string' && company.trim()) return company.trim();
      const contact = m['contact_name'];
      if (contact && typeof contact === 'string' && contact.trim()) return contact.trim();
      return 'Unknown Recruiter';
    }

    if (a.includes('AGENCY_REFERRAL')) {
      const agency = m['agency_name'];
      if (agency && typeof agency === 'string' && agency.trim()) return agency.trim();
      return 'Unknown Agency';
    }

    if (a.includes('EDIT_REQUEST') || a === 'SUBMIT_EDIT_REQUEST') {
      const rid = log.resource_id;
      return rid ? `Req #${rid.slice(0, 8)}` : 'Edit Request';
    }

    if (a.startsWith('BULK_')) {
      const count = m['count'];
      if (a.includes('RECRUITER')) return count != null ? `${count} recruiters` : 'Bulk Action';
      if (a.includes('CANDIDATE') || a.includes('ACTIVATE') || a.includes('DEACTIVATE'))
        return count != null ? `${count} candidates` : 'Bulk Action';
      return count != null ? `${count} records` : 'Bulk Action';
    }

    const rid = log.resource_id;
    if (!rid) return '—';
    return rid.length > 12 ? `${rid.slice(0, 8)}…` : rid;
  }

  // ── Human-readable action description ─────────────────────────────────────

  describeAction(action: string): string {
    const map: Record<string, string> = {
      LOGIN:                           'User logged into the platform',
      LOGOUT:                          'User logged out of the platform',
      CREATE_EMPLOYEE:                 'Created a new candidate profile',
      UPDATE_EMPLOYEE:                 'Updated candidate profile details',
      DELETE_EMPLOYEE:                 'Deleted a candidate profile',
      RESEND_CREDENTIALS:              'Resent login credentials to candidate',
      INVITE_VOLUNTEER:                'Invited candidate to volunteer programme',
      BULK_ACTIVATE:                   'Bulk activated candidate accounts',
      BULK_DEACTIVATE:                 'Bulk deactivated candidate accounts',
      CREATE_RECRUITER:                'Created a new recruiter account',
      UPDATE_RECRUITER:                'Updated recruiter account details',
      DELETE_RECRUITER:                'Deleted a recruiter account',
      RESEND_RECRUITER_CREDENTIALS:    'Resent login credentials to recruiter',
      BULK_ACTIVATE_RECRUITERS:        'Bulk activated recruiter accounts',
      BULK_DEACTIVATE_RECRUITERS:      'Bulk deactivated recruiter accounts',
      SUBMIT_EDIT_REQUEST:             'Candidate submitted a profile edit request',
      EDIT_REQUEST_APPROVED:           'Edit request was approved',
      EDIT_REQUEST_REJECTED:           'Edit request was rejected',
      EDIT_REQUEST_BULK_APPROVED:      'Bulk approved profile edit requests',
      EDIT_REQUEST_BULK_REJECTED:      'Bulk rejected profile edit requests',
      CREATE_AGENCY_REFERRAL:          'Added an agency referral record',
      UPDATE_AGENCY_REFERRAL:          'Updated an agency referral record',
      DELETE_AGENCY_REFERRAL:          'Deleted an agency referral record',
      INTEREST_REQUEST_REVOKED:        'Agency interest request was revoked',
      NEW_IP_LOGIN_DETECTED:           'New IP address detected on admin login',
      OTP_GENERATED:                   'One-time passcode generated for admin login',
      OTP_VERIFIED:                    'Admin two-factor authentication verified',
      OTP_FAILED:                      'Incorrect OTP entered during admin login',
      OTP_RESENT:                      'One-time passcode resent to admin',
      OTP_LOCKED:                      'Admin OTP verification locked after too many attempts',
    };
    if (map[action]) return map[action];
    // Fallback: convert SNAKE_CASE → Title Case
    return action
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ── Metadata: one-liner summary ────────────────────────────────────────────

  formatMetadata(action: string, meta: Record<string, unknown> | null): string {
    if (!meta) return '';
    const a = (action ?? '').toUpperCase();

    if (a === 'LOGIN') {
      const browser = meta['browser'] ?? '';
      const os      = meta['os'] ?? '';
      return [browser, os].filter(Boolean).join(' / ');
    }
    if (a === 'LOGOUT') {
      const dur = meta['session_duration_minutes'];
      return dur != null ? `Session: ${dur} min` : '';
    }
    if (a.includes('CREATE') && meta['candidate_name']) return String(meta['candidate_name']);
    if (a.includes('DELETE')) {
      return String(meta['candidate_name'] ?? meta['company_name'] ?? meta['agency_name'] ?? '');
    }
    if (a.includes('UPDATE')) {
      const fields = meta['updated_fields'];
      const name   = meta['candidate_name'] ?? meta['company_name'] ?? meta['agency_name'] ?? null;
      const label  = name ? `${name}: ` : '';
      if (Array.isArray(fields) && fields.length) return `${label}${fields.join(', ')}`;
      if (typeof fields === 'string') return `${label}${fields}`;
      return name ? String(name) : '';
    }
    if (a.includes('BULK')) {
      const count  = meta['count'];
      const status = meta['status'];
      return [count != null ? `${count} records` : '', status].filter(Boolean).join(' → ');
    }
    if (a.includes('EDIT_REQUEST') || a.includes('SUBMIT_EDIT')) {
      const fields      = meta['fields'];
      const candidateId = meta['candidate_id'];
      const status      = meta['status'];
      const label       = candidateId ? `Candidate ${candidateId}` : '';
      if (status) return [label, status].filter(Boolean).join(' → ');
      if (Array.isArray(fields) && fields.length) return [label, fields.join(', ')].filter(Boolean).join(': ');
      return label;
    }
    if (a.includes('AGENCY_REFERRAL')) {
      const name   = meta['agency_name'];
      const fields = meta['updated_fields'];
      if (Array.isArray(fields) && fields.length) return `${name ?? ''}: ${fields.join(', ')}`;
      return name ? String(name) : '';
    }
    if (a.includes('RESEND') || a.includes('INVITE')) {
      return String(meta['candidate_name'] ?? meta['candidate_id'] ?? meta['recruiter_id'] ?? '');
    }
    const keys = Object.keys(meta);
    if (keys.length) return `${keys[0]}: ${meta[keys[0]]}`;
    return '';
  }

  // ── Metadata: structured key-value pairs for detail panel ─────────────────

  metadataEntries(meta: Record<string, unknown> | null): Array<{ key: string; label: string; value: string }> {
    if (!meta) return [];

    const labelMap: Record<string, string> = {
      candidate_name:           'Candidate',
      candidate_id:             'Candidate ID',
      company_name:             'Company',
      contact_name:             'Contact',
      agency_name:              'Agency',
      updated_fields:           'Changed Fields',
      fields:                   'Fields',
      count:                    'Record Count',
      status:                   'Status',
      action:                   'Action Type',
      request_id:               'Request ID',
      browser:                  'Browser',
      os:                       'Operating System',
      session_duration_minutes: 'Session Duration',
      recruiter_id:             'Recruiter ID',
      candidate_id_ref:         'Candidate Ref',
    };

    return Object.entries(meta)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([key, value]) => {
        let display: string;
        if (Array.isArray(value)) {
          display = value.join(', ');
        } else if (typeof value === 'object') {
          display = JSON.stringify(value);
        } else {
          display = String(value);
        }
        // Append unit for duration
        if (key === 'session_duration_minutes') display += ' min';
        return {
          key,
          label: labelMap[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: display,
        };
      });
  }

  // ── Tooltip: raw JSON ──────────────────────────────────────────────────────

  metaTooltip(meta: Record<string, unknown> | null): string {
    if (!meta) return '';
    try { return JSON.stringify(meta, null, 2); } catch { return ''; }
  }

  // ── Badge class ────────────────────────────────────────────────────────────

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
