// src/app/features/admin/admin-management/admin-management-form-modal.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../core/services/toast.service';

function emailValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return ok ? null : { invalidEmail: true };
  };
}

@Component({
  selector: 'app-admin-management-form-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule],
  template: `
    @if (visible) {
      <!-- Backdrop -->
      <div class="modal-backdrop fade show" style="z-index:1050" (click)="onCancel()"></div>

      <!-- Modal -->
      <div class="modal d-block" tabindex="-1" style="z-index:1055" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered" style="max-width:520px">
          <div class="modal-content amfm-modal">

            <!-- Header -->
            <div class="modal-header amfm-header border-0 pb-0">
              <div class="d-flex align-items-center gap-2">
                <div class="amfm-header__icon">
                  <i class="bi bi-person-gear"></i>
                </div>
                <div>
                  <h5 class="modal-title fw-semibold mb-0">Add Admin</h5>
                  <p class="text-muted small mb-0">Create a new admin account for your team</p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="onCancel()" [disabled]="saving"></button>
            </div>

            <!-- Body -->
            <div class="modal-body pt-3">
              <form [formGroup]="form" (ngSubmit)="onSave()" id="admin-management-form" autocomplete="off">
                <div class="mb-3">
                  <label class="form-label small fw-medium mb-1">First Name <span class="text-danger">*</span></label>
                  <input type="text" class="form-control form-control-sm"
                    formControlName="first_name" [class.is-invalid]="isInvalid('first_name')">
                  @if (isInvalid('first_name')) {
                    <div class="invalid-feedback d-block">First name is required.</div>
                  }
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-medium mb-1">Last Name</label>
                  <input type="text" class="form-control form-control-sm" formControlName="last_name">
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-medium mb-1">Email <span class="text-danger">*</span></label>
                  <input type="email" class="form-control form-control-sm"
                    formControlName="email" [class.is-invalid]="isInvalid('email')">
                  @if (isInvalid('email')) {
                    @if (form.get('email')?.errors?.['required']) {
                      <div class="invalid-feedback d-block">Email is required.</div>
                    } @else if (form.get('email')?.errors?.['invalidEmail']) {
                      <div class="invalid-feedback d-block">Please enter a valid email address.</div>
                    }
                  }
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-medium mb-1">Password <span class="text-danger">*</span></label>
                  <div class="input-group input-group-sm">
                    <input [type]="showPw ? 'text' : 'password'" class="form-control form-control-sm"
                      formControlName="password" [class.is-invalid]="isInvalid('password')">
                    <button type="button" class="btn btn-outline-secondary" (click)="showPw = !showPw">
                      <i class="bi" [class.bi-eye]="!showPw" [class.bi-eye-slash]="showPw"></i>
                    </button>
                  </div>
                  @if (isInvalid('password')) {
                    @if (form.get('password')?.errors?.['required']) {
                      <div class="invalid-feedback d-block">Password is required.</div>
                    } @else if (form.get('password')?.errors?.['minlength']) {
                      <div class="invalid-feedback d-block">Minimum 8 characters required.</div>
                    }
                  }
                </div>

                @if (serverError) {
                  <div class="alert alert-danger py-2 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>{{ serverError }}
                  </div>
                }
              </form>
            </div>

            <!-- Footer -->
            <div class="modal-footer border-0 pt-0 gap-2">
              <button type="button" class="btn btn-outline-secondary btn-sm"
                (click)="onCancel()" [disabled]="saving">
                Cancel
              </button>
              <button type="submit" form="admin-management-form" class="btn btn-primary btn-sm"
                [disabled]="saving || form.invalid">
                @if (saving) {
                  <span class="spinner-border spinner-border-sm me-1"></span>Creating…
                } @else {
                  <i class="bi bi-person-plus me-1"></i>Save Admin
                }
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .amfm-modal { border: none; border-radius: var(--th-radius-xl, 14px); box-shadow: var(--th-shadow-xl); }
    .amfm-header { background: var(--th-surface, #fff); padding: 1.25rem 1.5rem 0; }
    .amfm-header__icon {
      width: 40px; height: 40px; border-radius: var(--th-radius, 8px);
      background: var(--th-primary-soft, #eef2ff);
      display: flex; align-items: center; justify-content: center;
      color: var(--th-primary, #5046e5); font-size: 1.1rem;
    }
    .modal-body { padding: 1rem 1.5rem; }
    .modal-footer { padding: .75rem 1.5rem 1.25rem; }
  `],
})
export class AdminManagementFormModalComponent implements OnChanges {
  @Input() visible = false;
  @Output() saved  = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form: FormGroup;
  saving = false;
  serverError = '';
  showPw = false;

  constructor(
    private fb: FormBuilder,
    private svc: AdminManagementService,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      first_name: ['', [Validators.required, Validators.maxLength(100)]],
      last_name:  ['', [Validators.maxLength(100)]],
      email:      ['', [Validators.required, emailValidator()]],
      password:   ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.serverError = '';
      this.showPw = false;
      this.form.reset({ first_name: '', last_name: '', email: '', password: '' });
    }
  }

  isInvalid(key: string): boolean {
    const ctrl = this.form.get(key);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.serverError = '';

    const v = this.form.value;
    this.svc.create({
      email: v.email,
      first_name: v.first_name,
      last_name: v.last_name || undefined,
      password: v.password,
    }).subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.success(`${res.admin.first_name} created successfully!`);
        this.saved.emit();
      },
      error: (err) => {
        this.saving = false;
        this.serverError = err?.error?.message ?? 'Failed to create admin.';
      },
    });
  }

  onCancel(): void {
    if (this.saving) return;
    this.closed.emit();
  }
}
