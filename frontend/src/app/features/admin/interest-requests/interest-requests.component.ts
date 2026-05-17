// src/app/features/admin/interest-requests/interest-requests.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InterestRequestService, InterestRequest, InterestRequestCounts, PaginatedInterestRequests } from '../../../core/services/interest-request.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-interest-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  styles: [`
    /* ── Filter bar ───────────────────────────────────────────── */
    .filter-bar {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .filter-bar__row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: flex-end;
    }
    .filter-bar__group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1 1 160px;
      min-width: 140px;
    }
    .filter-bar__group--wide { flex: 2 1 220px; }
    .filter-bar__label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--th-muted);
    }
    .filter-bar__input,
    .filter-bar__select {
      height: 38px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 0 10px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
      width: 100%;
    }
    .filter-bar__input:focus,
    .filter-bar__select:focus {
      outline: none;
      border-color: var(--th-primary);
      background: var(--th-surface);
    }
    .filter-bar__clear {
      height: 38px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      background: transparent;
      color: var(--th-muted);
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .filter-bar__clear:hover {
      border-color: var(--th-danger);
      color: var(--th-danger);
      background: var(--th-danger-soft);
    }
    .filter-bar__clear:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .filter-bar__active-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--th-primary);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }

    /* ── Tabs ─────────────────────────────────────────────────── */
    .tabs-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid var(--th-border);
      background: var(--th-surface);
      color: var(--th-muted);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .tab-btn:hover {
      border-color: var(--th-primary);
      color: var(--th-primary);
    }
    .tab-btn--active {
      background: var(--th-primary);
      border-color: var(--th-primary);
      color: #fff;
    }
    .tab-btn--active:hover {
      opacity: 0.9;
      color: #fff;
    }
    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(0,0,0,.12);
      color: inherit;
    }
    .tab-btn--active .tab-count { background: rgba(255,255,255,.25); }

    /* ── Request cards ────────────────────────────────────────── */
    .request-card {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 14px;
    }
    .request-card__header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .request-card__info { flex: 1; }
    .request-card__agency { font-weight: 600; font-size: 15px; color: var(--th-text); }
    .request-card__meta { font-size: 13px; color: var(--th-muted); margin-top: 2px; }
    .request-card__message {
      margin-top: 12px;
      padding: 12px;
      background: var(--th-surface-2);
      border-radius: 8px;
      font-size: 13px;
      color: var(--th-text);
      white-space: pre-wrap;
    }
    .request-card__fields {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .request-card__field { font-size: 13px; color: var(--th-muted); }
    .request-card__field strong { color: var(--th-text); }
    .request-card__actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
      flex-wrap: wrap;
    }

    /* ── Status badges ────────────────────────────────────────── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge--pending  { background: var(--th-amber-soft,  #fef3c7); color: var(--th-amber,  #d97706); }
    .status-badge--approved { background: var(--th-emerald-soft, #d1fae5); color: var(--th-emerald,#059669); }
    .status-badge--rejected { background: var(--th-red-soft,    #fee2e2); color: var(--th-red,    #dc2626); }
    .status-badge--revoked  { background: #f3e8ff;                         color: #7c3aed; }

    /* ── Revocation info strip ────────────────────────────────── */
    .revocation-info {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: 10px;
      padding: 8px 12px;
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      font-size: 12px;
      color: #6d28d9;
    }
    .revocation-info i { margin-top: 1px; flex-shrink: 0; }

    /* ── Review modal ─────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal-box {
      background: var(--th-surface);
      border-radius: 16px;
      padding: 28px 24px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,.2);
    }
    .modal-box h5 { margin: 0 0 16px; font-size: 17px; }
    .modal-label { font-size: 12px; font-weight: 600; color: var(--th-muted); text-transform: uppercase; margin-bottom: 6px; }
    .modal-textarea {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--th-border-strong);
      padding: 10px;
      font-size: 14px;
      background: var(--th-surface-2);
      color: var(--th-text);
      resize: vertical;
    }
  `],
  template: `
    <app-page-header title="Agency Interest Requests" subtitle="Review interest requests submitted by recruitment agencies." />

    <!-- Status tabs -->
    <div class="tabs-row">
      <button class="tab-btn" [class.tab-btn--active]="activeTab === ''"         (click)="setTab('')">
        <i class="bi bi-grid"></i>All
        <span class="tab-count">{{ counts.total }}</span>
      </button>
      <button class="tab-btn" [class.tab-btn--active]="activeTab === 'pending'"  (click)="setTab('pending')">
        <i class="bi bi-hourglass-split"></i>Pending
        <span class="tab-count">{{ counts.pending }}</span>
      </button>
      <button class="tab-btn" [class.tab-btn--active]="activeTab === 'approved'" (click)="setTab('approved')">
        <i class="bi bi-check-circle"></i>Approved
        <span class="tab-count">{{ counts.approved }}</span>
      </button>
      <button class="tab-btn" [class.tab-btn--active]="activeTab === 'rejected'" (click)="setTab('rejected')">
        <i class="bi bi-x-circle"></i>Rejected
        <span class="tab-count">{{ counts.rejected }}</span>
      </button>
      <button class="tab-btn" [class.tab-btn--active]="activeTab === 'revoked'"  (click)="setTab('revoked')">
        <i class="bi bi-slash-circle"></i>Revoked
        <span class="tab-count">{{ counts.revoked }}</span>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="filter-bar__row">
        <div class="filter-bar__group filter-bar__group--wide">
          <label class="filter-bar__label">Search</label>
          <input class="filter-bar__input" type="text" placeholder="Agency name, candidate…"
            [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" />
        </div>
        <div class="filter-bar__group">
          <label class="filter-bar__label">Status</label>
          <select class="filter-bar__select" [(ngModel)]="statusFilter" (ngModelChange)="onStatusFilterChange()">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>

        <!-- Date From -->
        <div class="filter-bar__group">
          <label class="filter-bar__label"><i class="bi bi-calendar me-1"></i>Date from</label>
          <input class="filter-bar__input" type="date"
            [(ngModel)]="dateFrom" (ngModelChange)="onFilterChange()" />
        </div>

        <!-- Date To -->
        <div class="filter-bar__group">
          <label class="filter-bar__label"><i class="bi bi-calendar-check me-1"></i>Date to</label>
          <input class="filter-bar__input" type="date"
            [(ngModel)]="dateTo" (ngModelChange)="onFilterChange()" />
        </div>

        <!-- Export CSV -->
        <div style="display:flex;align-items:flex-end;gap:6px;margin-left:auto">
          <button class="filter-bar__clear" style="border-color:var(--th-success);color:var(--th-success)"
            [disabled]="exporting" (click)="exportCsv()">
            @if (exporting) { <span class="spinner-border spinner-border-sm"></span> }
            @else { <i class="bi bi-download"></i> }
            Export CSV
          </button>
        </div>

        <!-- Clear filters -->
        @if (activeFilterCount > 0) {
          <button class="filter-bar__clear" (click)="clearFilters()">
            <i class="bi bi-x-lg"></i>
            Clear
            <span class="filter-bar__active-badge">{{ activeFilterCount }}</span>
          </button>
        }
      </div>
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border" style="color:var(--th-primary)"></div>
      </div>
    } @else if (requests.length === 0) {
      <app-empty-state icon="bi-inbox"
        [title]="emptyTitle"
        [message]="emptyMessage" />
    } @else {
      @for (r of requests; track r.id) {
        <div class="request-card">
          <div class="request-card__header">
            <div class="request-card__info">
              <div class="request-card__agency">{{ r.recruiter_company }} <span style="font-weight:400;color:var(--th-muted);">({{ r.recruiter_name }})</span></div>
              <div class="request-card__meta">{{ r.recruiter_email }} · Submitted {{ r.created_at | date:'dd MMM yyyy, HH:mm' }}</div>
            </div>
            <span class="status-badge status-badge--{{ r.status }}">
              <i class="bi"
                [class.bi-hourglass-split]="r.status === 'pending'"
                [class.bi-check-circle-fill]="r.status === 'approved'"
                [class.bi-x-circle-fill]="r.status === 'rejected'"
                [class.bi-slash-circle-fill]="r.status === 'revoked'"></i>
              {{ r.status | titlecase }}
            </span>
          </div>

          <div class="request-card__fields">
            <div class="request-card__field">
              <strong>Candidate:</strong> {{ r.candidate_first_name }} {{ r.candidate_last_name }}
              @if (r.candidate_number) { <span style="color:var(--th-muted);">#{{ r.candidate_number }}</span> }
            </div>
            <div class="request-card__field"><strong>Sector:</strong> {{ r.sector }}</div>
            <div class="request-card__field"><strong>Country:</strong> {{ r.country }}</div>
          </div>

          <div class="request-card__message">{{ r.message }}</div>

          @if (r.admin_note) {
            <div class="mt-2 small" style="color:var(--th-muted);">
              <i class="bi bi-chat-left-text me-1"></i><strong>Admin note:</strong> {{ r.admin_note }}
            </div>
          }

          <!-- Revocation details -->
          @if (r.status === 'revoked' && r.revoked_at) {
            <div class="revocation-info">
              <i class="bi bi-slash-circle-fill"></i>
              <span>
                <strong>Revoked</strong> {{ r.revoked_at | date:'dd MMM yyyy, HH:mm' }}
                @if (r.revocation_reason) { · {{ r.revocation_reason }} }
              </span>
            </div>
          }

          <!-- Actions -->
          @if (r.status === 'pending') {
            <div class="request-card__actions">
              <button class="btn btn-sm btn-success" (click)="openReview(r, 'approved')">
                <i class="bi bi-check-lg me-1"></i>Approve
              </button>
              <button class="btn btn-sm btn-danger" (click)="openReview(r, 'rejected')">
                <i class="bi bi-x-lg me-1"></i>Reject
              </button>
            </div>
          }
          @if (r.status === 'approved') {
            <div class="request-card__actions">
              <button class="btn btn-sm btn-outline-warning" (click)="onRevokeClick(r)">
                <i class="bi bi-slash-circle me-1"></i>Revoke
              </button>
            </div>
          }
        </div>
      }

      <!-- Pagination -->
      @if (pagination && pagination.pages > 1) {
        <div class="d-flex justify-content-center gap-2 mt-4">
          <button class="btn btn-sm btn-outline-secondary" [disabled]="page <= 1" (click)="goToPage(page - 1)">Previous</button>
          <span class="btn btn-sm disabled">{{ page }} / {{ pagination.pages }}</span>
          <button class="btn btn-sm btn-outline-secondary" [disabled]="page >= pagination.pages" (click)="goToPage(page + 1)">Next</button>
        </div>
      }
    }

    <!-- Review modal (approve / reject) -->
    @if (reviewTarget) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h5>{{ reviewAction === 'approved' ? 'Approve' : 'Reject' }} Interest Request</h5>
          <p class="small text-muted">
            Agency: <strong>{{ reviewTarget.recruiter_company }}</strong><br>
            Candidate: <strong>{{ reviewTarget.candidate_first_name }} {{ reviewTarget.candidate_last_name }}</strong>
          </p>
          <div class="mb-3">
            <div class="modal-label">Admin Note <span style="font-weight:400;text-transform:none;">(optional)</span></div>
            <textarea class="modal-textarea" rows="3" [(ngModel)]="adminNote"
              placeholder="Optional note to the agency…"></textarea>
          </div>
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-sm"
              [class.btn-success]="reviewAction === 'approved'"
              [class.btn-danger]="reviewAction === 'rejected'"
              [disabled]="submitting" (click)="submitReview()">
              @if (submitting) { <span class="spinner-border spinner-border-sm me-1"></span> }
              {{ reviewAction === 'approved' ? 'Approve' : 'Reject' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class InterestRequestsComponent implements OnInit, OnDestroy {
  requests: InterestRequest[] = [];
  loading = true;
  page = 1;
  pagination: { page: number; limit: number; total: number; pages: number } | null = null;

  counts: InterestRequestCounts = { pending: 0, approved: 0, rejected: 0, revoked: 0, total: 0 };
  activeTab: '' | 'pending' | 'approved' | 'rejected' | 'revoked' = '';

  searchTerm   = '';
  statusFilter = '';
  dateFrom     = '';
  dateTo       = '';
  exporting    = false;

  get activeFilterCount(): number {
    return [this.searchTerm, this.statusFilter, this.dateFrom, this.dateTo]
      .filter(v => !!v).length;
  }

  get emptyTitle(): string {
    if (this.activeTab === 'pending')  return 'No pending requests';
    if (this.activeTab === 'approved') return 'No approved requests';
    if (this.activeTab === 'rejected') return 'No rejected requests';
    if (this.activeTab === 'revoked')  return 'No revoked requests';
    return 'No interest requests found';
  }

  get emptyMessage(): string {
    if (this.activeTab === 'pending')  return 'There are no pending agency interest requests at this time.';
    if (this.activeTab === 'revoked')  return 'No agency interest requests have been revoked.';
    return 'When recruitment agencies submit interest requests, they will appear here.';
  }

  reviewTarget: InterestRequest | null = null;
  reviewAction: 'approved' | 'rejected' = 'approved';
  adminNote  = '';
  submitting = false;

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();

  constructor(
    private svc:           InterestRequestService,
    private toast:         ToastService,
    private confirmDialog: ConfirmDialogService,
    private notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 1; this.load(); });
    this.loadCounts();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Tab navigation ────────────────────────────────────────────────────────

  setTab(tab: '' | 'pending' | 'approved' | 'rejected' | 'revoked'): void {
    this.activeTab    = tab;
    this.statusFilter = tab;
    this.page         = 1;
    this.load();
  }

  // ── Filter handlers ───────────────────────────────────────────────────────

  onSearchChange(val: string): void {
    this.search$.next(val);
  }

  onFilterChange(): void {
    this.page = 1;
    this.load();
  }

  /** When admin changes the status dropdown, also sync the active tab */
  onStatusFilterChange(): void {
    this.activeTab = this.statusFilter as typeof this.activeTab;
    this.page      = 1;
    this.load();
  }

  clearFilters(): void {
    this.searchTerm   = '';
    this.statusFilter = '';
    this.dateFrom     = '';
    this.dateTo       = '';
    this.activeTab    = '';
    this.page         = 1;
    this.load();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.svc.list({
      status:    this.statusFilter || undefined,
      search:    this.searchTerm   || undefined,
      date_from: this.dateFrom     || undefined,
      date_to:   this.dateTo       || undefined,
      page:      this.page,
    }).subscribe({
      next: (res) => {
        this.requests   = res.data;
        this.pagination = res.pagination;
        this.loading    = false;
      },
      error: () => {
        this.toast.error('Failed to load interest requests');
        this.loading = false;
      },
    });
  }

  loadCounts(): void {
    this.svc.getCounts().subscribe({
      next:  (c) => (this.counts = c),
      error: () => { /* non-fatal — counts are cosmetic */ },
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  goToPage(p: number): void {
    this.page = p;
    this.load();
  }

  // ── Approve / Reject (inline modal) ──────────────────────────────────────

  openReview(r: InterestRequest, action: 'approved' | 'rejected'): void {
    this.reviewTarget = r;
    this.reviewAction = action;
    this.adminNote    = '';
  }

  closeModal(): void {
    this.reviewTarget = null;
  }

  submitReview(): void {
    if (!this.reviewTarget) return;
    this.submitting = true;
    this.svc.review(this.reviewTarget.id, { status: this.reviewAction, admin_note: this.adminNote || undefined })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success(`Request ${this.reviewAction}`);
          this.closeModal();
          this.load();
          this.loadCounts();
          this.notifications.refreshCounts();
        },
        error: (err) => {
          this.submitting = false;
          this.toast.error(err?.error?.message ?? 'Failed to review request');
        },
      });
  }

  // ── Revoke (confirm dialog) ───────────────────────────────────────────────

  onRevokeClick(r: InterestRequest): void {
    const agencyLabel = r.recruiter_company ?? r.recruiter_name ?? 'this agency';
    const candidateLabel = `${r.candidate_first_name ?? ''} ${r.candidate_last_name ?? ''}`.trim() || 'this candidate';

    this.confirmDialog.confirm({
      title:           'Revoke Agency Interest Request?',
      message:         `Are you sure you want to revoke the approved interest request from ${agencyLabel} for ${candidateLabel}? The agency will be notified by email.`,
      confirmLabel:    'Revoke',
      cancelLabel:     'Cancel',
      confirmClass:    'btn-danger',
      showNoteField:   true,
      noteLabel:       'Reason for Revocation (Optional)',
      notePlaceholder: 'Explain why this interest request is being revoked…',
    }).then(result => {
      if (!result.confirmed) return;
      this.svc.revoke(r.id, result.notes || undefined).subscribe({
        next: () => {
          this.toast.success('Interest request revoked');
          this.load();
          this.loadCounts();
          this.notifications.refreshCounts();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Failed to revoke request'),
      });
    });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  exportCsv(): void {
    if (this.exporting) return;
    this.exporting = true;
    this.svc.exportCsv({
      status:    this.statusFilter || undefined,
      search:    this.searchTerm   || undefined,
      date_from: this.dateFrom     || undefined,
      date_to:   this.dateTo       || undefined,
    }).subscribe({
      next: (blob) => {
        this.exporting = false;
        if (blob.size < 10) {
          this.toast.error('No agency interest requests available to export.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `agency-interest-requests-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('CSV exported successfully.');
      },
      error: () => {
        this.exporting = false;
        this.toast.error('Export failed. Please try again.');
      },
    });
  }
}
