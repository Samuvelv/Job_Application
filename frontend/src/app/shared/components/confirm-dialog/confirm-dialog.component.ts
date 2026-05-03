// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogService, ConfirmOptions, ConfirmResult } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <!-- Backdrop -->
      <div class="modal-backdrop fade show" style="z-index:1050"></div>

      <!-- Dialog -->
      <div class="modal d-block" tabindex="-1" style="z-index:1055" role="dialog">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content confirm-dialog">
            <div class="modal-header border-0 pb-0">
              <div>
                <div class="confirm-dialog__icon">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <h5 class="modal-title fw-semibold">{{ title() }}</h5>
              </div>
            </div>
            <div class="modal-body pt-2">
              <p class="text-muted mb-3">{{ message() }}</p>
              
              @if (showNoteField()) {
                <div class="note-field-container">
                  <label class="note-label">{{ noteLabel() }}</label>
                  <textarea 
                    class="form-control form-control-sm"
                    [placeholder]="notePlaceholder()"
                    [(ngModel)]="noteText"
                    rows="4">
                  </textarea>
                </div>
              }
            </div>
            <div class="modal-footer border-0 pt-0 gap-2">
              <button class="btn btn-outline-secondary btn-sm"
                      (click)="resolve(false)">
                {{ cancelLabel() }}
              </button>
              <button class="btn btn-sm"
                      [class]="confirmClass()"
                      (click)="resolve(true)">
                {{ confirmLabel() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .note-field-container {
      margin-bottom: 1rem;
    }

    .note-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: var(--th-text, #111827);
    }

    .form-control {
      border-color: var(--th-border, #e5e7eb);
      font-size: 0.875rem;
      font-family: inherit;
    }

    .form-control:focus {
      border-color: #5046e5;
      box-shadow: 0 0 0 0.2rem rgba(80, 70, 229, 0.25);
    }
  `],
})
export class ConfirmDialogComponent implements OnInit {
  visible      = signal(false);
  title        = signal('Are you sure?');
  message      = signal('This action cannot be undone.');
  confirmLabel = signal('Confirm');
  cancelLabel  = signal('Cancel');
  confirmClass = signal('btn-danger');
  showNoteField = signal(false);
  noteLabel = signal('Admin Notes (Optional)');
  notePlaceholder = signal('Add any additional notes...');

  noteText = '';

  private resolveFn!: (value: ConfirmResult) => void;

  constructor(private dialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.dialogService.register(this);
  }

  open(options: ConfirmOptions = {}): Promise<ConfirmResult> {
    this.title.set(options.title ?? 'Are you sure?');
    this.message.set(options.message ?? 'This action cannot be undone.');
    this.confirmLabel.set(options.confirmLabel ?? 'Confirm');
    this.cancelLabel.set(options.cancelLabel ?? 'Cancel');
    this.confirmClass.set(options.confirmClass ?? 'btn-danger');
    this.showNoteField.set(options.showNoteField ?? false);
    this.noteLabel.set(options.noteLabel ?? 'Admin Notes (Optional)');
    this.notePlaceholder.set(options.notePlaceholder ?? 'Add any additional notes...');
    this.noteText = '';
    this.visible.set(true);
    return new Promise<ConfirmResult>(resolve => { this.resolveFn = resolve; });
  }

  resolve(value: boolean): void {
    this.visible.set(false);
    const result: ConfirmResult = {
      confirmed: value,
      notes: this.showNoteField() && this.noteText ? this.noteText : undefined,
    };
    this.resolveFn?.(result);
  }
}

