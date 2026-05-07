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
        <div class="header-content">
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

          <!-- Recruiter Info -->
          <div class="party-info recruiter-info">
            <div class="party-label">Recruiter</div>
            <div class="party-name">{{ request.recruiter_name }}</div>
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
          <div class="party-separator">
            <i class="bi bi-arrow-right"></i>
          </div>

          <!-- Candidate Info -->
          <div class="party-info candidate-info">
            <div class="party-label">Candidate</div>
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

      <!-- Status Section -->
      <div class="card-status-bar">
        <span class="status-badge" [class]="'status-' + request.status">
          {{ request.status | uppercase }}
        </span>
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
          @if (request.status !== 'pending') {
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
        </div>
      </div>

      <!-- Admin Notes (if exists) -->
      @if (request.status !== 'pending' && request.admin_note) {
        <div class="admin-notes-section">
          <p class="admin-note-label">Admin Note</p>
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
      border-radius: var(--th-radius-lg, 8px);
      box-shadow: var(--th-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1));
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      overflow: hidden;
    }

    .contact-request-card:hover {
      box-shadow: var(--th-shadow-card-hover, 0 4px 12px rgba(0, 0, 0, 0.15));
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
      padding: 1rem;
      border-bottom: 1px solid var(--th-border);
      background: var(--th-surface);
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .party-info {
      flex: 1;
      min-width: 0;
      font-size: 0.9rem;
    }

    .party-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--th-muted);
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .party-name {
      font-weight: 600;
      color: var(--th-text);
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-company {
      font-size: 0.85rem;
      color: var(--th-muted);
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-title {
      font-size: 0.85rem;
      color: var(--th-muted);
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-email {
      font-size: 0.8rem;
      color: var(--th-text-secondary);
      display: flex;
      align-items: center;
      gap: 0.375rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-email i {
      font-size: 0.7rem;
      flex-shrink: 0;
    }

    .candidate-number {
      margin-top: 0.25rem;
    }

    .candidate-number .badge {
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
      background: var(--th-primary-soft);
      color: var(--th-primary);
    }

    .party-separator {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--th-border-strong);
      font-size: 1.25rem;
      padding: 0 0.5rem;
    }

    /* ── Status Bar ── */
    .card-status-bar {
      padding: 0.5rem 1rem;
      background: var(--th-surface-2);
      border-bottom: 1px solid var(--th-border);
    }

    .status-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border-radius: var(--th-radius, 4px);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-pending {
      background-color: var(--th-warning-soft);
      color: var(--th-warning);
    }

    .status-approved {
      background-color: var(--th-success-soft);
      color: var(--th-success);
    }

    .status-rejected {
      background-color: var(--th-danger-soft);
      color: var(--th-danger);
    }

    /* ── Audit Trail ── */
    .audit-trail {
      border-top: 1px solid var(--th-border);
      background: var(--th-surface-2);
      padding: 0.625rem 1rem;
    }

    .audit-trail__title {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--th-muted);
      margin-bottom: 0.5rem;
    }

    .audit-trail__title i {
      font-size: 0.75rem;
    }

    .audit-trail__rows {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .audit-trail__row {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      font-size: 0.78rem;
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
      gap: 0.3rem;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .audit-trail__value i {
      font-size: 0.72rem;
      color: var(--th-success);
      flex-shrink: 0;
    }

    .audit-trail__unknown {
      color: var(--th-muted);
    }
    /* ── Admin Notes ── */
    .admin-notes-section {
      padding: 0.75rem 1rem;
      background: var(--th-surface-2);
      border-bottom: 1px solid var(--th-border);
    }

    .admin-note-label {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--th-muted);
      letter-spacing: 0.5px;
      margin-bottom: 0.375rem;
    }

    .admin-note-text {
      margin: 0;
      font-size: 0.85rem;
      color: var(--th-text);
      line-height: 1.4;
      word-wrap: break-word;
    }

    /* ── Actions ── */
    .card-actions {
      padding: 1rem;
      display: flex;
      gap: 0.5rem;
      background: var(--th-surface);
    }

    .btn-action {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      font-weight: 500;
      border-radius: var(--th-radius, 4px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-action i {
      font-size: 0.85rem;
    }

    .btn-success {
      background-color: var(--th-success, #10b981);
      color: white;
      border-color: var(--th-success, #10b981);
    }

    .btn-success:hover:not(:disabled) {
      filter: brightness(0.9);
    }

    .btn-danger {
      background-color: var(--th-danger, #f43f5e);
      color: white;
      border-color: var(--th-danger, #f43f5e);
    }

    .btn-danger:hover:not(:disabled) {
      filter: brightness(0.9);
    }

    .btn-secondary {
      background-color: var(--th-surface-2);
      color: var(--th-text-secondary);
      border-color: var(--th-border-strong);
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: var(--th-surface-raised);
    }

    .btn-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spinner-border-sm {
      width: 0.9rem;
      height: 0.9rem;
      border-width: 0.2em;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 0.5rem;
      }

      .party-separator {
        display: none;
      }

      .card-meta {
        flex-direction: column;
        align-items: flex-start;
      }

      .card-header,
      .card-meta,
      .admin-notes-section,
      .card-actions {
        padding: 0.75rem;
      }

      .party-name,
      .party-company,
      .party-title {
        white-space: normal;
      }
    }

    @media (max-width: 576px) {
      .party-info {
        font-size: 0.85rem;
      }

      .party-label {
        font-size: 0.7rem;
      }

      .btn-action {
        padding: 0.5rem;
        font-size: 0.8rem;
      }
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
