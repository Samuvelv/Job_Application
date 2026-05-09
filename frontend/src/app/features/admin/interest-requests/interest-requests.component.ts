// src/app/features/admin/interest-requests/interest-requests.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { InterestRequestService, InterestRequest, PaginatedInterestRequests } from '../../../core/services/interest-request.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-interest-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PageHeaderComponent, EmptyStateComponent],
  styles: [`
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
          <select class="filter-bar__select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    @if (loading) {
      <div class="text-center py-5">
        <div class="spinner-border" style="color:var(--th-primary)"></div>
      </div>
    } @else if (requests.length === 0) {
      <app-empty-state icon="bi-inbox" title="No interest requests found"
        message="When recruitment agencies submit interest requests, they will appear here." />
    } @else {
      @for (r of requests; track r.id) {
        <div class="request-card">
          <div class="request-card__header">
            <div class="request-card__info">
              <div class="request-card__agency">{{ r.recruiter_company }} <span style="font-weight:400;color:var(--th-muted);">({{ r.recruiter_name }})</span></div>
              <div class="request-card__meta">{{ r.recruiter_email }} · Submitted {{ r.created_at | date:'dd MMM yyyy, HH:mm' }}</div>
            </div>
            <span class="status-badge status-badge--{{ r.status }}">
              <i class="bi" [class.bi-hourglass-split]="r.status === 'pending'"
                           [class.bi-check-circle-fill]="r.status === 'approved'"
                           [class.bi-x-circle-fill]="r.status === 'rejected'"></i>
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

    <!-- Review modal -->
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
            <button class="btn btn-sm" [class.btn-success]="reviewAction === 'approved'" [class.btn-danger]="reviewAction === 'rejected'"
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

  searchTerm = '';
  statusFilter = '';

  reviewTarget: InterestRequest | null = null;
  reviewAction: 'approved' | 'rejected' = 'approved';
  adminNote = '';
  submitting = false;

  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  constructor(
    private svc: InterestRequestService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 1; this.load(); });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(val: string): void {
    this.search$.next(val);
  }

  load(): void {
    this.loading = true;
    this.svc.list({ status: this.statusFilter || undefined, search: this.searchTerm || undefined, page: this.page })
      .subscribe({
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

  goToPage(p: number): void {
    this.page = p;
    this.load();
  }

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
        },
        error: (err) => {
          this.submitting = false;
          this.toast.error(err?.error?.message ?? 'Failed to review request');
        },
      });
  }
}
