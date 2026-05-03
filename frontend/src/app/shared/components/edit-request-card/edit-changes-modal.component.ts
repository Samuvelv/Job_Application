import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FieldChange {
  key: string;
  label: string;
  oldValue: string;
  newValue: string;
}

@Component({
  selector: 'app-edit-changes-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <!-- Backdrop -->
      <div class="edit-changes-modal__backdrop" (click)="onClose()"></div>

      <!-- Modal -->
      <div class="edit-changes-modal">
        <!-- Header -->
        <div class="edit-changes-modal__header">
          <div class="edit-changes-modal__header-content">
            <h2 class="edit-changes-modal__title">
              <i class="bi bi-arrow-left-right me-2"></i>Requested Changes
            </h2>
            <p class="edit-changes-modal__subtitle">
              Review all {{ changes.length }} change{{ changes.length !== 1 ? 's' : '' }}
            </p>
          </div>
          <button class="edit-changes-modal__close-btn" (click)="onClose()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

      <!-- Content -->
      <div class="edit-changes-modal__content">
        @if (changes.length === 0) {
          <div class="edit-changes-modal__empty-state">
            <i class="bi bi-inbox"></i>
            <p>No changes found</p>
          </div>
        } @else {
          <div class="edit-changes-modal__changes-list">
            @for (change of changes; track change.key) {
              <div class="edit-changes-modal__change-item">
                <div class="edit-changes-modal__field-label">{{ change.label }}</div>
                <div class="edit-changes-modal__value-comparison">
                  <div class="edit-changes-modal__value-old">
                    <span class="value-badge">{{ change.oldValue || '—' }}</span>
                  </div>
                  <span class="edit-changes-modal__arrow">→</span>
                  <div class="edit-changes-modal__value-new">
                    <span class="value-badge">{{ change.newValue || '—' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

        <!-- Footer -->
        <div class="edit-changes-modal__footer">
          <button class="edit-changes-modal__btn edit-changes-modal__btn--primary" (click)="onClose()">
            <i class="bi bi-check-lg me-2"></i>Got it
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .edit-changes-modal__backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .edit-changes-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      max-height: 85vh;
      width: 90%;
      max-width: 700px;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);

      @media (max-width: 768px) {
        width: 95%;
        max-height: 80vh;
        max-width: 90vw;
      }

      @media (max-width: 480px) {
        width: 100%;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transform: none;
        max-width: none;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, -45%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    .edit-changes-modal__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      gap: 1rem;
      flex-shrink: 0;
    }

    .edit-changes-modal__header-content {
      flex: 1;
    }

    .edit-changes-modal__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
    }

    .edit-changes-modal__subtitle {
      font-size: 0.9rem;
      color: #6b7280;
      margin: 0;
    }

    .edit-changes-modal__close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #9ca3af;
      cursor: pointer;
      padding: 0.5rem;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .edit-changes-modal__close-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .edit-changes-modal__content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      min-height: 0;
    }

    .edit-changes-modal__empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #9ca3af;

      i {
        display: block;
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 1rem;
      }
    }

    .edit-changes-modal__changes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .edit-changes-modal__change-item {
      padding: 1rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .edit-changes-modal__change-item:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    .edit-changes-modal__field-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: #374151;
      padding: 0.5rem 0.75rem;
      background: white;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    .edit-changes-modal__value-comparison {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 0.75rem;
      align-items: center;

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .edit-changes-modal__value-old,
    .edit-changes-modal__value-new {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .value-badge {
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
      word-break: break-word;
      line-height: 1.5;
      font-family: 'Menlo', 'Monaco', monospace;
      text-align: center;
      max-width: 100%;
      overflow-wrap: break-word;
    }

    .edit-changes-modal__value-old .value-badge {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      color: #7f1d1d;
    }

    .edit-changes-modal__value-new .value-badge {
      background: #f0fdf4;
      border: 1px solid #dcfce7;
      color: #15803d;
    }

    .edit-changes-modal__arrow {
      font-weight: bold;
      color: #d1d5db;
      font-size: 1.25rem;

      @media (max-width: 480px) {
        display: none;
      }
    }

    .edit-changes-modal__footer {
      display: flex;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      flex-shrink: 0;
    }

    .edit-changes-modal__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      gap: 0.5rem;

      &--primary {
        background: #10b981;
        color: white;

        &:hover {
          background: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    /* Scrollbar Styling */
    .edit-changes-modal__content {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6;

      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;

        &:hover {
          background: #94a3b8;
        }
      }
    }

    @media (max-width: 480px) {
      .edit-changes-modal__header {
        padding: 1rem;
      }

      .edit-changes-modal__content {
        padding: 1rem;
      }

      .edit-changes-modal__footer {
        padding: 1rem;
      }

      .edit-changes-modal__title {
        font-size: 1.25rem;
      }
    }
  `],
})
export class EditChangesModalComponent {
  @Input() isOpen = false;
  @Input() changes: FieldChange[] = [];
  @Input() recordBalance?: number;
  @Output() closed = new EventEmitter<void>();

  onClose(): void {
    this.closed.emit();
  }
}
