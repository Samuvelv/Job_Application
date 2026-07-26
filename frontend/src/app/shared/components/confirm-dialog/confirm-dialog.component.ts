// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import {
  Component,
  signal,
  OnInit,
  ElementRef,
  HostListener,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmDialogService, ConfirmOptions, ConfirmResult } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    @if (visible()) {
      <!-- Backdrop — click to dismiss (Stay / cancel) -->
      <div
        class="modal-backdrop-animated"
        aria-hidden="true"
        (click)="resolve(false)"
      ></div>

      <!-- Dialog wrapper — keyboard trap root -->
      <div
        class="modal d-block confirm-dialog-modal"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="dialogTitleId"
        [attr.aria-describedby]="dialogBodyId"
      >
        <div class="modal-dialog modal-dialog-centered confirm-dialog-panel">
          <div
            class="modal-content confirm-dialog confirm-dialog--{{ variant() }}"
            (click)="$event.stopPropagation()"
          >

            <!-- Header -->
            <div class="modal-header border-0 pb-0">
              <div class="d-flex align-items-center gap-3">
                <!-- Variant icon circle -->
                <div class="confirm-dialog__icon" aria-hidden="true">
                  <i class="bi" [ngClass]="icon()"></i>
                </div>
                <h5
                  class="modal-title fw-bold mb-0"
                  [id]="dialogTitleId"
                >{{ title() }}</h5>
              </div>
              <!-- Close × button — resolves as cancel (Stay) -->
              <button
                type="button"
                class="btn-close"
                [attr.aria-label]="('CONFIRM_DIALOG.close_dialog' | translate)"
                (click)="resolve(false)"
              ></button>
            </div>

            <!-- Body -->
            <div class="modal-body pt-2" [id]="dialogBodyId">
              <p class="text-muted mb-3" style="line-height:1.65">{{ message() }}</p>

              @if (showDurationField()) {
                <div class="mb-3">
                  <label class="note-label">{{ durationLabel() }} <span class="text-danger">*</span></label>
                  <div class="d-flex gap-2 align-items-center mb-1">
                    <input
                      type="number"
                      class="form-control form-control-sm"
                      [(ngModel)]="durationValue"
                      [placeholder]="'COMMON.example' | translate"
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
                      <option value="" disabled selected>{{ 'CONFIRM_DIALOG.select_unit' | translate }}</option>
                      <option value="hours">{{ 'CONFIRM_DIALOG.hours' | translate }}</option>
                      <option value="days">{{ 'CONFIRM_DIALOG.days' | translate }}</option>
                      <option value="weeks">{{ 'CONFIRM_DIALOG.weeks' | translate }}</option>
                      <option value="months">{{ 'CONFIRM_DIALOG.months' | translate }}</option>
                      <option value="years">{{ 'CONFIRM_DIALOG.years' | translate }}</option>
                    </select>
                  </div>
                  @if (expiryPreview) {
                    <div class="form-text text-info">
                      <i class="bi bi-calendar-check me-1"></i>{{ 'CONFIRM_DIALOG.new_expiry' | translate }} <strong>{{ expiryPreview }}</strong>
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

            <!-- Footer -->
            <div class="modal-footer border-0 pt-0 gap-2">
              <!-- Cancel — "Stay on Page" in the nav-guard context -->
              <button
                type="button"
                class="btn btn-sm"
                [ngClass]="cancelClass()"
                (click)="resolve(false)"
              >
                {{ cancelLabel() }}
              </button>
              <!-- Confirm action button -->
              <button
                #confirmBtn
                type="button"
                class="btn btn-sm"
                [ngClass]="confirmClass()"
                (click)="resolve(true)"
              >
                {{ confirmLabel() }}
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Animated backdrop ──────────────────────────────────────────────────── */
    .modal-backdrop-animated {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 1050;
      animation: backdrop-fade-in 0.2s ease forwards;
    }

    /* ── Modal positioning ──────────────────────────────────────────────────── */
    .confirm-dialog-modal {
      z-index: 1055;
    }

    .confirm-dialog-panel {
      max-width: 480px;
    }

    /* ── Entry animation on the card ────────────────────────────────────────── */
    .confirm-dialog {
      animation: dialog-scale-in 0.22s cubic-bezier(0.34, 1.26, 0.64, 1) forwards;
    }

    @keyframes backdrop-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes dialog-scale-in {
      from { opacity: 0; transform: scale(0.93) translateY(12px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);    }
    }

    /* Respect reduced-motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .modal-backdrop-animated,
      .confirm-dialog {
        animation: none;
      }
    }

    /* ── Form controls ──────────────────────────────────────────────────────── */
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

    .form-control,
    .form-select {
      border-color: var(--th-border, #e5e7eb);
      font-size: 0.875rem;
      font-family: inherit;
    }

    .form-control:focus,
    .form-select:focus {
      border-color: var(--th-primary, #5046e5);
      box-shadow: 0 0 0 0.2rem rgba(80, 70, 229, 0.2);
    }
  `],
})
export class ConfirmDialogComponent implements OnInit, AfterViewInit {
  // ── Signals ─────────────────────────────────────────────────────────────────
  visible          = signal(false);
  title            = signal('Are you sure?');
  message          = signal('This action cannot be undone.');
  confirmLabel     = signal('Confirm');
  cancelLabel      = signal('Cancel');
  confirmClass     = signal('btn-danger');
  cancelClass      = signal('btn-outline-secondary');
  variant          = signal<string>('danger');
  showNoteField    = signal(false);
  noteLabel        = signal('Admin Notes (Optional)');
  notePlaceholder  = signal('Add any additional notes...');
  showDurationField = signal(false);
  durationLabel    = signal('Extend Access Duration');
  icon             = signal('bi-exclamation-triangle-fill');

  // ── Local state ─────────────────────────────────────────────────────────────
  noteText      = '';
  durationValue: number | null = null;
  durationUnit  = '';
  expiryPreview = '';
  durationError = '';

  /** Unique IDs for ARIA attributes */
  readonly dialogTitleId = `confirm-dialog-title-${Math.random().toString(36).slice(2)}`;
  readonly dialogBodyId  = `confirm-dialog-body-${Math.random().toString(36).slice(2)}`;

  private resolveFn!: (value: ConfirmResult) => void;

  private readonly dialogService = inject(ConfirmDialogService);
  private readonly el            = inject(ElementRef);

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.dialogService.register(this);
  }

  ngAfterViewInit(): void { /* intentionally empty — focus handled in open() */ }

  // ── ESC key — dismiss as cancel ─────────────────────────────────────────────
  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.visible()) {
      event.preventDefault();
      this.resolve(false);
    }
  }

  // ── Tab key — focus trap within the modal ───────────────────────────────────
  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: KeyboardEvent): void {
    if (!this.visible()) return;

    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  // ── Public API (called by ConfirmDialogService) ──────────────────────────────
  open(options: ConfirmOptions = {}): Promise<ConfirmResult> {
    this.title.set(options.title ?? 'Are you sure?');
    this.message.set(options.message ?? 'This action cannot be undone.');
    this.confirmLabel.set(options.confirmLabel ?? 'Confirm');
    this.cancelLabel.set(options.cancelLabel ?? 'Cancel');
    this.confirmClass.set(options.confirmClass ?? 'btn-danger');
    this.cancelClass.set(options.cancelClass ?? 'btn-outline-secondary');
    this.variant.set(options.variant ?? 'danger');
    this.showNoteField.set(options.showNoteField ?? false);
    this.noteLabel.set(options.noteLabel ?? 'Admin Notes (Optional)');
    this.notePlaceholder.set(options.notePlaceholder ?? 'Add any additional notes...');
    this.showDurationField.set(options.showDurationField ?? false);
    this.durationLabel.set(options.durationLabel ?? 'Extend Access Duration');
    this.icon.set(options.icon ?? 'bi-exclamation-triangle-fill');

    // Reset transient state
    this.noteText      = '';
    this.durationValue = null;
    this.durationUnit  = '';
    this.expiryPreview = '';
    this.durationError = '';

    this.visible.set(true);

    // Move focus into the modal on the next tick (after @if renders)
    setTimeout(() => this.focusFirstElement(), 0);

    return new Promise<ConfirmResult>(resolve => { this.resolveFn = resolve; });
  }

  // ── Duration preview helper ──────────────────────────────────────────────────
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

  // ── Resolution ───────────────────────────────────────────────────────────────
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
      notes:         this.showNoteField()    && this.noteText     ? this.noteText                    : undefined,
      durationValue: this.showDurationField() ? (this.durationValue || null)                         : null,
      durationUnit:  this.showDurationField() ? (this.durationUnit  || null)                         : null,
    };
    this.resolveFn?.(result);
  }

  // ── Focus helpers ────────────────────────────────────────────────────────────
  private focusFirstElement(): void {
    const elements = this.getFocusableElements();
    if (elements.length > 0) elements[0].focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const panel = this.el.nativeElement.querySelector('.confirm-dialog-panel') as HTMLElement | null;
    if (!panel) return [];

    const nodes = panel.querySelectorAll(selector);
    return Array.from(nodes)
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node.offsetParent !== null);
  }
}
