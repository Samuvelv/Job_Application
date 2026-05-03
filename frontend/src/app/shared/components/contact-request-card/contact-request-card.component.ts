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
    <div class="contact-request-card">
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-content">
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

      <!-- Status and Date Section -->
      <div class="card-meta">
        <span class="status-badge" [class]="'status-' + request.status">
          {{ request.status | uppercase }}
        </span>
        <div class="request-date">
          <i class="bi bi-clock"></i>
          {{ request.created_at | date:'dd MMM yyyy, HH:mm' }}
          @if (request.reviewed_at) {
            <span class="reviewed-date">
              Reviewed {{ request.reviewed_at | date:'dd MMM yyyy' }}
            </span>
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
      background: var(--th-background, #fff);
      border: 1px solid var(--th-border, #e5e7eb);
      border-radius: var(--th-radius-lg, 8px);
      box-shadow: var(--th-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1));
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      overflow: hidden;
    }

    .contact-request-card:hover {
      box-shadow: var(--th-shadow-card-hover, 0 4px 12px rgba(0, 0, 0, 0.15));
      transform: translateY(-2px);
    }

    /* ── Header ── */
    .card-header {
      padding: 1rem;
      border-bottom: 1px solid var(--th-border, #e5e7eb);
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
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .party-name {
      font-weight: 600;
      color: var(--th-text, #111827);
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-company {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-title {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .party-email {
      font-size: 0.8rem;
      color: #9ca3af;
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
      background: #e0e7ff;
      color: #4338ca;
    }

    .party-separator {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #d1d5db;
      font-size: 1.25rem;
      padding: 0 0.5rem;
    }

    /* ── Meta Info ── */
    .card-meta {
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border-bottom: 1px solid var(--th-border, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
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
      background-color: #fef3c7;
      color: #92400e;
    }

    .status-approved {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-rejected {
      background-color: #fee2e2;
      color: #7f1d1d;
    }

    .request-date {
      font-size: 0.8rem;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .request-date i {
      font-size: 0.75rem;
    }

    .reviewed-date {
      margin-left: 0.5rem;
      padding-left: 0.5rem;
      border-left: 1px solid #d1d5db;
    }

    /* ── Admin Notes ── */
    .admin-notes-section {
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border-bottom: 1px solid var(--th-border, #e5e7eb);
    }

    .admin-note-label {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 0.375rem;
    }

    .admin-note-text {
      margin: 0;
      font-size: 0.85rem;
      color: var(--th-text, #111827);
      line-height: 1.4;
      word-wrap: break-word;
    }

    /* ── Actions ── */
    .card-actions {
      padding: 1rem;
      display: flex;
      gap: 0.5rem;
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
      background-color: #10b981;
      color: white;
      border-color: #10b981;
    }

    .btn-success:hover:not(:disabled) {
      background-color: #059669;
      border-color: #059669;
    }

    .btn-danger {
      background-color: #f43f5e;
      color: white;
      border-color: #f43f5e;
    }

    .btn-danger:hover:not(:disabled) {
      background-color: #e11d48;
      border-color: #e11d48;
    }

    .btn-secondary {
      background-color: #d1d5db;
      color: var(--th-text, #111827);
      border-color: #d1d5db;
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
  @Output() approved = new EventEmitter<{ id: string; adminNote?: string }>();
  @Output() rejected = new EventEmitter<{ id: string; adminNote?: string }>();
  @Output() cancelled = new EventEmitter<void>();

  isSubmitting = false;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    if (!this.request) {
      console.error('ContactRequestCardComponent: request input is required');
    }
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
