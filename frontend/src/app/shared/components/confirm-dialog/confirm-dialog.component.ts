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
                  <i class="bi" [ngClass]="icon()"></i>
                </div>
                <h5 class="modal-title fw-semibold">{{ title() }}</h5>
              </div>
            </div>
            <div class="modal-body pt-2">
              <p class="text-muted mb-3">{{ message() }}</p>

              @if (showDurationField()) {
                <div class="mb-3">
                  <label class="note-label">{{ durationLabel() }} <span class="text-danger">*</span></label>
                  <div class="d-flex gap-2 align-items-center mb-1">
                    <input
                      type="number"
                      class="form-control form-control-sm"
                      [(ngModel)]="durationValue"
                      placeholder="e.g. 6"
                      min="1"
                      style="width:100px;flex-shrink:0"
                      (ngModelChange)="updateExpiryPreview()"
                    >
                    <select
                      class="form-select form-select-sm"
                      [(ngModel)]="durationUnit"
                      style="max-width:140px"
                      (ngModelChange)="updateExpiryPreview()"
                    >
                      <option value="" disabled selected>— Unit —</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  @if (expiryPreview) {
                    <div class="form-text text-info">
                      <i class="bi bi-calendar-check me-1"></i>New expiry: <strong>{{ expiryPreview }}</strong>
                    </div>
                  }
                  @if (durationError) {
                    <div class="text-danger small mt-1">{{ durationError }}</div>
                  }
                </div>
              }

              @if (showNoteField()) {
                <div class="note-field-container">
                  <label class="note-label">{{ noteLabel() }}</label>
                  <textarea
                    class="form-control form-control-sm"
                    [placeholder]="notePlaceholder()"
                    [(ngModel)]="noteText"
                    rows="3">
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

    .form-control, .form-select {
      border-color: var(--th-border, #e5e7eb);
      font-size: 0.875rem;
      font-family: inherit;
    }

    .form-control:focus, .form-select:focus {
      border-color: #5046e5;
      box-shadow: 0 0 0 0.2rem rgba(80, 70, 229, 0.25);
    }
  `],
})
export class ConfirmDialogComponent implements OnInit {
  visible          = signal(false);
  title            = signal('Are you sure?');
  message          = signal('This action cannot be undone.');
  confirmLabel     = signal('Confirm');
  cancelLabel      = signal('Cancel');
  confirmClass     = signal('btn-danger');
  showNoteField    = signal(false);
  noteLabel        = signal('Admin Notes (Optional)');
  notePlaceholder  = signal('Add any additional notes...');
  showDurationField = signal(false);
  durationLabel    = signal('Extend Access Duration');
  icon             = signal('bi-exclamation-triangle-fill');

  noteText      = '';
  durationValue: number | null = null;
  durationUnit  = '';
  expiryPreview = '';
  durationError = '';

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
    this.showDurationField.set(options.showDurationField ?? false);
    this.durationLabel.set(options.durationLabel ?? 'Extend Access Duration');
    this.icon.set(options.icon ?? 'bi-exclamation-triangle-fill');
    this.noteText      = '';
    this.durationValue = null;
    this.durationUnit  = '';
    this.expiryPreview = '';
    this.durationError = '';
    this.visible.set(true);
    return new Promise<ConfirmResult>(resolve => { this.resolveFn = resolve; });
  }

  updateExpiryPreview(): void {
    this.durationError = '';
    if (!this.durationValue || !this.durationUnit || this.durationValue < 1) {
      this.expiryPreview = '';
      return;
    }
    const dt = this.computeExpiry(this.durationValue, this.durationUnit);
    this.expiryPreview = dt.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  private computeExpiry(value: number, unit: string): Date {
    const dt = new Date();
    switch (unit) {
      case 'hours':  dt.setHours(dt.getHours() + value);       break;
      case 'days':   dt.setDate(dt.getDate() + value);          break;
      case 'weeks':  dt.setDate(dt.getDate() + value * 7);      break;
      case 'months': dt.setMonth(dt.getMonth() + value);        break;
      case 'years':  dt.setFullYear(dt.getFullYear() + value);  break;
    }
    return dt;
  }

  resolve(value: boolean): void {
    if (value && this.showDurationField()) {
      if (!this.durationValue || this.durationValue < 1) {
        this.durationError = 'Please enter a duration value.';
        return;
      }
      if (!this.durationUnit) {
        this.durationError = 'Please select a unit.';
        return;
      }
    }
    this.visible.set(false);
    const result: ConfirmResult = {
      confirmed: value,
      notes: this.showNoteField() && this.noteText ? this.noteText : undefined,
      durationValue: this.showDurationField() ? (this.durationValue || null) : null,
      durationUnit:  this.showDurationField() ? (this.durationUnit  || null) : null,
    };
    this.resolveFn?.(result);
  }
}
