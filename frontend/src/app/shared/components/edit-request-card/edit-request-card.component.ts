// src/app/shared/components/edit-request-card/edit-request-card.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { EditChangesModalComponent } from './edit-changes-modal.component';

interface FieldChange {
  key: string;
  label: string;
  oldValue: string;
  newValue: string;
}

@Component({
  selector: 'app-edit-request-card',
  standalone: true,
  imports: [CommonModule, EditChangesModalComponent],
  template: `
    <div class="edit-request-card">
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-content">
          <!-- Avatar -->
          <div class="avatar-section">
            @if (request.profile_photo_url) {
              <img [src]="request.profile_photo_url" alt="{{ request.first_name }}" class="avatar">
            } @else {
              <div class="avatar avatar-placeholder">
                <i class="bi bi-person-fill"></i>
              </div>
            }
          </div>

          <!-- Candidate Info -->
          <div class="candidate-info">
            <h5 class="candidate-name">{{ request.first_name }} {{ request.last_name }}</h5>
            <p class="candidate-email">{{ request.email }}</p>
          </div>

          <!-- Status Badge -->
          <div class="status-section">
            <span class="status-badge" [class]="'status-' + request.status">
              {{ request.status | uppercase }}
            </span>
          </div>
        </div>
      </div>

      <!-- Card Body -->
      <div class="card-body">
        <!-- Reason Section -->
        @if (request.reason) {
          <div class="reason-section">
            <p class="reason-label">Reason for Changes</p>
            <p class="reason-text">{{ request.reason }}</p>
          </div>
        }

        <!-- Changes List Section -->
        @if (getVisibleChanges().length > 0) {
          <div class="changes-list-section">
            <p class="changes-list-label">Changes</p>
            <div class="changes-list">
              @for (change of getVisibleChanges(); track change.key) {
                <div class="change-item">
                  <div class="change-label">{{ change.label }}</div>
                  <div class="change-values">
                    <span class="old-value">{{ change.oldValue || '—' }}</span>
                    <span class="arrow">→</span>
                    <span class="new-value">{{ change.newValue || '—' }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Show More Button -->
            @if (getChangeCount() > 2) {
              <button class="btn-show-more" (click)="onViewAllChanges()">
                <i class="bi bi-plus-lg"></i>
                Show {{ getChangeCount() - 2 }} more change{{ getChangeCount() - 2 !== 1 ? 's' : '' }}
              </button>
            }
          </div>
        }

        <!-- Admin Notes (if approved/rejected) -->
        @if (request.status !== 'pending' && request.admin_note) {
          <div class="admin-notes-section">
            <p class="admin-note-label">Admin Note</p>
            <p class="admin-note-text">{{ request.admin_note }}</p>
          </div>
        }
      </div>

      <!-- Card Footer (Action Buttons) -->
      @if (request.status === 'pending' && (isAdmin || isRecruiter) && !isSubmitting) {
        <div class="card-footer">
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
        <div class="card-footer">
          <button class="btn btn-secondary btn-action" disabled>
            <span class="spinner-border spinner-border-sm me-2"></span>
            Processing...
          </button>
        </div>
      }
    </div>

    <!-- Changes Modal (Outside card due to fixed positioning) -->
    <app-edit-changes-modal 
      [isOpen]="showChangesModal" 
      [changes]="getFormattedChanges()"
      (closed)="showChangesModal = false">
    </app-edit-changes-modal>
  `,
  styles: [`
    .edit-request-card {
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

    .edit-request-card:hover {
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
      align-items: center;
      gap: 1rem;
    }

    .avatar-section {
      flex-shrink: 0;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      background: #f3f4f6;
      border: 2px solid var(--th-border, #e5e7eb);
    }

    .avatar-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 1.5rem;
    }

    .candidate-info {
      flex: 1;
      min-width: 0;
    }

    .candidate-name {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--th-text, #111827);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .candidate-email {
      margin: 0.25rem 0 0 0;
      font-size: 0.85rem;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-section {
      flex-shrink: 0;
    }

    .status-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border-radius: var(--th-radius, 4px);
      font-size: 0.75rem;
      font-weight: 600;
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

    /* ── Body ── */
    .card-body {
      flex: 1;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .reason-section {
      margin: 0;
    }

    .reason-label {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
    }

    .reason-text {
      margin: 0.375rem 0 0 0;
      font-size: 0.9rem;
      color: var(--th-text, #111827);
      line-height: 1.4;
      word-wrap: break-word;
    }

    /* ── Changes List Section ── */
    .changes-list-section {
      margin: 0;
    }

    .changes-list-label {
      margin: 0 0 0.5rem 0;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
    }

    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .change-item {
      padding: 0.625rem;
      background-color: #f9fafb;
      border: 1px solid var(--th-border, #e5e7eb);
      border-radius: var(--th-radius, 4px);
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .change-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #374151;
      padding: 0.25rem 0.5rem;
      background-color: white;
      border-left: 3px solid #3b82f6;
      border-radius: 2px;
      display: inline-block;
      width: fit-content;
    }

    .change-values {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      overflow: hidden;
    }

    .old-value {
      flex: 0 1 auto;
      padding: 0.375rem 0.5rem;
      background-color: #fef2f2;
      border: 1px solid #f3e8e8;
      color: #7f1d1d;
      border-radius: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .arrow {
      flex-shrink: 0;
      color: #9ca3af;
      font-weight: bold;
    }

    .new-value {
      flex: 0 1 auto;
      padding: 0.375rem 0.5rem;
      background-color: #f0fdf4;
      border: 1px solid #e8f5e9;
      color: #15803d;
      border-radius: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-show-more {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background-color: #f3f4f6;
      border: 1px solid var(--th-border, #e5e7eb);
      border-radius: var(--th-radius, 4px);
      color: var(--th-text, #111827);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease, border-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .btn-show-more:hover {
      background-color: #e5e7eb;
      border-color: #d1d5db;
    }

    .btn-show-more i {
      font-size: 0.75rem;
    }

    .admin-notes-section {
      margin: 0;
      padding: 0.75rem;
      background-color: #f9fafb;
      border-left: 3px solid var(--th-border, #e5e7eb);
      border-radius: var(--th-radius, 4px);
    }

    .admin-note-label {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
    }

    .admin-note-text {
      margin: 0.375rem 0 0 0;
      font-size: 0.85rem;
      color: var(--th-text, #111827);
      line-height: 1.4;
      word-wrap: break-word;
    }

    /* ── Footer ── */
    .card-footer {
      padding: 1rem;
      border-top: 1px solid var(--th-border, #e5e7eb);
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
    @media (max-width: 576px) {
      .header-content {
        gap: 0.75rem;
      }

      .avatar {
        width: 40px;
        height: 40px;
      }

      .candidate-name {
        font-size: 0.9rem;
      }

      .candidate-email {
        font-size: 0.8rem;
      }

      .card-header,
      .card-body,
      .card-footer {
        padding: 0.75rem;
      }

      .card-body {
        gap: 0.5rem;
      }

      .btn-action {
        padding: 0.5rem;
        font-size: 0.8rem;
      }

      .change-values {
        font-size: 0.75rem;
      }

      .old-value,
      .new-value {
        padding: 0.3rem 0.375rem;
      }
    }
  `],
})
export class EditRequestCardComponent implements OnInit {
  @Input() request!: EditRequest;
  @Input() isAdmin: boolean = false;
  @Input() isRecruiter: boolean = false;
  @Output() approved = new EventEmitter<{ id: string; adminNote?: string }>();
  @Output() rejected = new EventEmitter<{ id: string; adminNote?: string }>();
  @Output() cancelled = new EventEmitter<void>();

  isSubmitting = false;
  showChangesModal = false;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    if (!this.request) {
      console.error('EditRequestCardComponent: request input is required');
    }
  }

  /**
   * Get the total number of actual changes (only count modified fields)
   */
  getChangeCount(): number {
    return this.getFormattedChanges().length;
  }

  /**
   * Get the first 2 changes for display
   */
  getVisibleChanges(): FieldChange[] {
    return this.getFormattedChanges().slice(0, 2);
  }

  /**
   * Convert requested_data to FieldChange format for display
   * Only include fields that have actually changed
   */
  getFormattedChanges(): FieldChange[] {
    if (!this.request?.requested_data) return [];
    
    return Object.entries(this.request.requested_data)
      .filter(([key, newValue]) => {
        // Only include if the value actually changed
        const oldValue = this.request.old_values?.[key];
        return this.formatValue(oldValue) !== this.formatValue(newValue);
      })
      .map(([key, newValue]) => {
        const oldValue = this.request.old_values?.[key];
        return {
          key,
          label: this.formatFieldLabel(key),
          oldValue: this.formatValue(oldValue),
          newValue: this.formatValue(newValue),
        };
      });
  }

  /**
   * Format field name to readable label
   */
  private formatFieldLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format value for display
   * Handles arrays, objects, booleans, and primitives
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    
    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      
      // Check if array contains objects with known fields
      if (typeof value[0] === 'object' && value[0] !== null) {
        const firstItem = value[0] as Record<string, unknown>;
        
        // Format skills
        if ('proficiency' in firstItem && 'skill_name' in firstItem) {
          return value
            .map(item => {
              const skill = item as any;
              return `${skill.skill_name} (${skill.proficiency})`;
            })
            .join(', ');
        }
        
        // Format education
        if ('degree' in firstItem && 'institution' in firstItem) {
          return value
            .map(item => {
              const edu = item as any;
              return `${edu.degree} from ${edu.institution} (${edu.start_year}-${edu.end_year})`;
            })
            .join(', ');
        }
        
        // Format languages
        if ('language' in firstItem && 'proficiency' in firstItem) {
          return value
            .map(item => {
              const lang = item as any;
              return `${lang.language} (${lang.proficiency})`;
            })
            .join(', ');
        }
        
        // Generic object array formatting
        return value
          .map(item => {
            const obj = item as Record<string, unknown>;
            return Object.values(obj)
              .filter(v => v !== null && v !== undefined)
              .join(' - ');
          })
          .join('; ');
      }
      
      // Simple array of primitives
      return value.join(', ');
    }
    
    // Handle objects
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${this.formatFieldLabel(k)}: ${v}`);
      return entries.length > 0 ? entries.join(', ') : '';
    }
    
    return String(value);
  }

  /**
   * Open modal to view all changes
   */
  onViewAllChanges(): void {
    this.showChangesModal = true;
  }

  /**
   * Handle approve button click
   */
  onApproveClick(): void {
    this.confirmDialogService.confirm({
      title: 'Approve Request?',
      message: 'Are you sure you want to approve this edit request? This action cannot be undone.',
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      confirmClass: 'btn-success',
      showNoteField: true,
      noteLabel: 'Admin Notes (Optional)',
      notePlaceholder: 'Add any additional notes about this approval...',
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
      title: 'Reject Request?',
      message: 'Are you sure you want to reject this edit request? This action cannot be undone.',
      confirmLabel: 'Reject',
      cancelLabel: 'Cancel',
      confirmClass: 'btn-danger',
      showNoteField: true,
      noteLabel: 'Admin Notes (Optional)',
      notePlaceholder: 'Please explain why you are rejecting this request...',
    }).then(result => {
      if (result.confirmed) {
        this.rejected.emit({ id: this.request.id, adminNote: result.notes });
      }
    });
  }
}
