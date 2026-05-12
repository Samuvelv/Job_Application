// src/app/shared/components/contact-request-card/contact-request-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactRequest } from '../../../core/models/contact-request.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-contact-request-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="contact-request-card" [class.is-selected]="selected">
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-top">
          <!-- Selection checkbox -->
          @if (selectable && request.status === 'pending') {
            <div class="card-checkbox-wrap" (click)="$event.stopPropagation()">
              <input
                type="checkbox"
                class="card-checkbox"
                [checked]="selected"
                (change)="onCheckboxChange($event)"
              />
            </div>
          }
          <!-- Status badge inline in header -->
          <span class="status-badge ms-auto" [class]="'status-' + request.status">
            @if (request.status === 'pending') { <i class="bi bi-hourglass-split me-1"></i> }
            @else if (request.status === 'approved') { <i class="bi bi-check-circle-fill me-1"></i> }
            @else if (request.status === 'rejected') { <i class="bi bi-x-circle-fill me-1"></i> }
            @else if (request.status === 'revoked') { <i class="bi bi-shield-x-fill me-1"></i> }
            {{ request.status | uppercase }}
          </span>
        </div>

        <div class="header-content">
          <!-- Recruiter Info -->
          <div class="party-block recruiter-block">
            <div class="party-label"><i class="bi bi-briefcase-fill me-1"></i>Recruiter</div>
            <div class="party-name">{{ request.recruiter_name ?? '—' }}</div>
            @if (request.recruiter_company) {
              <div class="party-company">{{ request.recruiter_company }}</div>
            }
            @if (request.recruiter_email) {
              <div class="party-email">
                <i class="bi bi-envelope-fill"></i>
                {{ request.recruiter_email }}
              </div>
            }
          </div>

          <!-- Arrow Separator -->
          <div class="party-separator" aria-hidden="true">
            <i class="bi bi-arrow-right-circle-fill"></i>
          </div>

          <!-- Candidate Info -->
          <div class="party-block candidate-block">
            <div class="party-label"><i class="bi bi-person-fill me-1"></i>Candidate</div>
            <div class="party-name">{{ request.candidate_first_name }} {{ request.candidate_last_name }}</div>
            @if (request.candidate_number) {
              <div class="candidate-number">
                <span class="badge">#{{ request.candidate_number }}</span>
              </div>
            }
            @if (request.candidate_job_title) {
              <div class="party-title">{{ request.candidate_job_title }}</div>
            }
            @if (request.candidate_email) {
              <div class="party-email">
                <i class="bi bi-envelope-fill"></i>
                {{ request.candidate_email }}
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Audit Trail -->
      <div class="audit-trail">
        <div class="audit-trail__title">
          <i class="bi bi-journal-text"></i>
          Audit Trail
        </div>
        <div class="audit-trail__rows">
          <div class="audit-trail__row">
            <span class="audit-trail__label">Submitted</span>
            <span class="audit-trail__value">{{ request.created_at | date:'dd MMM yyyy, HH:mm' }}</span>
          </div>
          @if (request.status !== 'pending' && request.status !== 'revoked') {
            <div class="audit-trail__row">
              <span class="audit-trail__label">Reviewed by</span>
              <span class="audit-trail__value">
                @if (request.reviewed_by_name) {
                  <i class="bi bi-person-check"></i>
                  {{ request.reviewed_by_name }}
                } @else {
                  <span class="audit-trail__unknown">—</span>
                }
              </span>
            </div>
            <div class="audit-trail__row">
              <span class="audit-trail__label">Decision made</span>
              <span class="audit-trail__value">{{ request.reviewed_at | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
          }
          @if (request.status === 'revoked') {
            <div class="audit-trail__row">
              <span class="audit-trail__label">Revoked by</span>
              <span class="audit-trail__value">
                @if (request.revoked_by_name) {
                  <i class="bi bi-person-x" style="color:var(--th-danger)"></i>
                  {{ request.revoked_by_name }}
                } @else {
                  <span class="audit-trail__unknown">—</span>
                }
              </span>
            </div>
            <div class="audit-trail__row">
              <span class="audit-trail__label">Revoked at</span>
              <span class="audit-trail__value">{{ request.revoked_at | date:'dd MMM yyyy, HH:mm' }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Request Reason (if provided) -->
      @if (request.request_reason) {
        <div class="request-reason-section">
          <p class="request-reason-label"><i class="bi bi-chat-left-text-fill me-1"></i>Reason for Request</p>
          <p class="request-reason-text">{{ request.request_reason }}</p>
        </div>
      }

      <!-- Admin Notes (if exists) -->
      @if (request.status !== 'pending' && request.admin_note) {
        <div class="admin-notes-section">
          <p class="admin-note-label"><i class="bi bi-sticky-fill me-1"></i>Admin Note</p>
          <p class="admin-note-text">{{ request.admin_note }}</p>
        </div>
      }

      <!-- Action Buttons (for pending requests) -->
      @if (request.status === 'pending' && (isAdmin || isRecruiter) && !isSubmitting) {
        <div class="card-actions">
          <button class="btn btn-success btn-action" (click)="onApproveClick()">
            <i class="bi bi-check-circle"></i>
            Approve
          </button>
          <button class="btn btn-danger btn-action" (click)="onRejectClick()">
            <i class="bi bi-x-circle"></i>
            Reject
          </button>
        </div>
      }

      <!-- Revoke Button (for approved requests, admin only) -->
      @if (request.status === 'approved' && isAdmin && !isSubmitting) {
        <div class="card-actions">
          <button class="btn btn-warning btn-action" (click)="onRevokeClick()">
            <i class="bi bi-shield-x"></i>
            Revoke Access
          </button>
        </div>
      }

      <!-- Revocation info (revoked rows) -->
      @if (request.status === 'revoked' && request.revocation_reason) {
        <div class="admin-notes-section admin-notes-section--revoked">
          <p class="admin-note-label"><i class="bi bi-shield-exclamation me-1"></i>Revocation Reason</p>
          <p class="admin-note-text">{{ request.revocation_reason }}</p>
        </div>
      }

      <!-- Loading State -->
      @if (isSubmitting) {
        <div class="card-actions">
          <button class="btn btn-secondary btn-action" disabled>
            <span class="spinner-border spinner-border-sm me-2"></span>
            Processing...
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .contact-request-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-lg, 10px);
      box-shadow: var(--th-shadow-card, 0 1px 3px rgba(0,0,0,.08));
      transition: box-shadow .2s ease, transform .2s ease;
      overflow: hidden;
    }

    .contact-request-card:hover {
      box-shadow: var(--th-shadow-card-hover, 0 4px 14px rgba(0,0,0,.13));
      transform: translateY(-2px);
    }

    .contact-request-card.is-selected {
      border-color: var(--th-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--th-primary) 25%, transparent);
    }

    /* ── Checkbox ── */
    .card-checkbox-wrap {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .card-checkbox {
      width: 18px;
      height: 18px;
      accent-color: var(--th-primary);
      cursor: pointer;
      border-radius: 4px;
    }

    /* ── Header ── */
    .card-header {
      padding: .875rem 1rem .75rem;
      border-bottom: 1px solid var(--th-border);
      background: var(--th-surface);
    }

    /* Top row: checkbox (optional) + status badge */
    .header-top {
      display: flex;
      align-items: center;
      margin-bottom: .625rem;
      min-height: 1.5rem;
    }

    /* Two-column party layout */
    .header-content {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: start;
      gap: .5rem;
    }

    /* Individual party block */
    .party-block {
      padding: .625rem .75rem;
      border-radius: var(--th-radius, 6px);
      border: 1px solid var(--th-border);
      font-size: .875rem;
      min-width: 0;
    }

    .recruiter-block {
      background: color-mix(in srgb, var(--th-primary) 5%, var(--th-surface));
      border-color: color-mix(in srgb, var(--th-primary) 15%, var(--th-border));
    }

    .candidate-block {
      background: color-mix(in srgb, var(--th-success, #10b981) 5%, var(--th-surface));
      border-color: color-mix(in srgb, var(--th-success, #10b981) 15%, var(--th-border));
    }

    .party-label {
      font-size: .7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--th-muted);
      letter-spacing: .5px;
      margin-bottom: .25rem;
      display: flex;
      align-items: center;
    }

    .party-name {
      font-weight: 600;
      color: var(--th-text);
      margin-bottom: .2rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .party-company,
    .party-title {
      font-size: .8rem;
      color: var(--th-muted);
      margin-bottom: .15rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .party-email {
      font-size: .775rem;
      color: var(--th-text-secondary);
      display: flex;
      align-items: center;
      gap: .3rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: .2rem;
    }

    .party-email i { font-size: .68rem; flex-shrink: 0; }

    .candidate-number { margin-top: .2rem; }
    .candidate-number .badge {
      font-size: .68rem;
      padding: .2rem .45rem;
      background: var(--th-primary-soft);
      color: var(--th-primary);
      border-radius: var(--th-radius-sm, 4px);
    }

    /* Arrow separator */
    .party-separator {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--th-border-strong);
      font-size: 1.1rem;
      padding: 0 .25rem;
      margin-top: 1.5rem;
    }

    /* ── Status badge (now inline in header-top) ── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: .25rem .65rem;
      border-radius: 99px;
      font-size: .68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .4px;
    }

    .status-pending  { background: var(--th-warning-soft);  color: var(--th-warning); }
    .status-approved { background: var(--th-success-soft);  color: var(--th-success); }
    .status-rejected { background: var(--th-danger-soft);   color: var(--th-danger);  }
    .status-revoked  {
      background: var(--th-surface-raised, #f3f4f6);
      color: var(--th-muted, #6b7280);
      border: 1px solid var(--th-border);
    }

    /* ── Audit Trail ── */
    .audit-trail {
      border-top: 1px solid var(--th-border);
      background: var(--th-surface-2);
      padding: .625rem 1rem;
      border-left: 3px solid var(--th-border-strong);
    }

    .audit-trail__title {
      display: flex;
      align-items: center;
      gap: .375rem;
      font-size: .68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--th-muted);
      margin-bottom: .4rem;
    }

    .audit-trail__title i { font-size: .72rem; }

    .audit-trail__rows { display: flex; flex-direction: column; gap: .25rem; }

    .audit-trail__row {
      display: flex;
      align-items: baseline;
      gap: .5rem;
      font-size: .78rem;
    }

    .audit-trail__label {
      flex-shrink: 0;
      width: 6.5rem;
      color: var(--th-muted);
      font-weight: 500;
    }

    .audit-trail__value {
      color: var(--th-text-secondary);
      display: flex;
      align-items: center;
      gap: .3rem;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .audit-trail__value i { font-size: .72rem; color: var(--th-success); flex-shrink: 0; }
    .audit-trail__unknown { color: var(--th-muted); }

    /* ── Request Reason ── */
    .request-reason-section {
      padding: .625rem 1rem;
      background: var(--th-surface-2);
      border-top: 1px solid var(--th-border);
      border-left: 3px solid var(--th-primary);
    }

    .request-reason-label {
      margin: 0 0 .3rem;
      font-size: .7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--th-muted);
      letter-spacing: .5px;
      display: flex;
      align-items: center;
    }

    .request-reason-text {
      margin: 0;
      font-size: .85rem;
      color: var(--th-text);
      line-height: 1.45;
      word-break: break-word;
    }

    /* ── Admin Notes ── */
    .admin-notes-section {
      padding: .625rem 1rem;
      background: var(--th-surface-2);
      border-top: 1px solid var(--th-border);
      border-left: 3px solid var(--th-warning, #f59e0b);
    }

    .admin-notes-section--revoked {
      border-left-color: var(--th-danger, #f43f5e);
    }

    .admin-note-label {
      margin: 0 0 .3rem;
      font-size: .7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--th-muted);
      letter-spacing: .5px;
      display: flex;
      align-items: center;
    }

    .admin-note-text {
      margin: 0;
      font-size: .85rem;
      color: var(--th-text);
      line-height: 1.45;
      word-break: break-word;
    }

    /* ── Actions ── */
    .card-actions {
      padding: .75rem 1rem;
      display: flex;
      gap: .5rem;
      background: var(--th-surface);
      border-top: 1px solid var(--th-border);
      margin-top: auto;
    }

    .btn-action {
      flex: 1;
      padding: .5rem .75rem;
      font-size: .85rem;
      font-weight: 500;
      border-radius: var(--th-radius, 4px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .375rem;
      transition: all .2s ease;
      border: 1px solid transparent;
    }

    .btn-action i { font-size: .85rem; }

    .btn-success { background-color: var(--th-success, #10b981); color: #fff; border-color: var(--th-success, #10b981); }
    .btn-success:hover:not(:disabled) { filter: brightness(.9); }

    .btn-danger  { background-color: var(--th-danger, #f43f5e);  color: #fff; border-color: var(--th-danger, #f43f5e); }
    .btn-danger:hover:not(:disabled)  { filter: brightness(.9); }

    .btn-warning { background-color: #f59e0b; color: #fff; border-color: #f59e0b; }
    .btn-warning:hover:not(:disabled) { filter: brightness(.9); }

    .btn-secondary { background-color: var(--th-surface-2); color: var(--th-text-secondary); border-color: var(--th-border-strong); }
    .btn-secondary:hover:not(:disabled) { background-color: var(--th-surface-raised); }

    .btn-action:disabled { opacity: .6; cursor: not-allowed; }

    .spinner-border-sm { width: .9rem; height: .9rem; border-width: .2em; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .header-content {
        grid-template-columns: 1fr;
        gap: .5rem;
      }
      .party-separator { display: none; }
      .card-header,
      .admin-notes-section,
      .card-actions { padding-left: .75rem; padding-right: .75rem; }
      .party-name, .party-company, .party-title { white-space: normal; }
    }

    @media (max-width: 576px) {
      .party-block { font-size: .825rem; }
      .party-label { font-size: .68rem; }
      .btn-action  { padding: .45rem; font-size: .8rem; }
    }
  `],
})
export class ContactRequestCardComponent implements OnInit {
  @Input() request!: ContactRequest;
  @Input() isAdmin: boolean = false;
  @Input() isRecruiter: boolean = false;
  @Input() selectable: boolean = false;
  @Input() selected: boolean = false;
  @Output() approved = new EventEmitter<{ id: string; adminNote?: string }>();
  @Output() rejected = new EventEmitter<{ id: string; adminNote?: string }>();
  @Output() revoked  = new EventEmitter<{ id: string }>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() selectionChange = new EventEmitter<boolean>();

  isSubmitting = false;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    if (!this.request) {
      console.error('ContactRequestCardComponent: request input is required');
    }
  }

  onCheckboxChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionChange.emit(checked);
  }

  /**
   * Handle revoke button click
   */
  onRevokeClick(): void {
    this.revoked.emit({ id: this.request.id });
  }

  /**
   * Handle approve button click
   */
  onApproveClick(): void {
    this.confirmDialogService.confirm({
      title: 'Approve Contact Request?',
      message: 'Recruiter will be able to see the candidate\'s contact details. This action cannot be undone.',
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      confirmClass: 'btn-success',
      showNoteField: true,
      noteLabel: 'Admin Notes (Optional)',
      notePlaceholder: 'Add any comments about this approval...',
    }).then(result => {
      if (result.confirmed) {
        this.approved.emit({ id: this.request.id, adminNote: result.notes });
      }
    });
  }

  /**
   * Handle reject button click
   */
  onRejectClick(): void {
    this.confirmDialogService.confirm({
      title: 'Reject Contact Request?',
      message: 'Recruiter will be notified that the request was not approved. This action cannot be undone.',
      confirmLabel: 'Reject',
      cancelLabel: 'Cancel',
      confirmClass: 'btn-danger',
      showNoteField: true,
      noteLabel: 'Reason for Rejection (Optional)',
      notePlaceholder: 'Explain why you are rejecting this request...',
    }).then(result => {
      if (result.confirmed) {
        this.rejected.emit({ id: this.request.id, adminNote: result.notes });
      }
    });
  }
}
