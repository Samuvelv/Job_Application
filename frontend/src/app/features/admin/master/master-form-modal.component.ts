// src/app/features/admin/master/master-form-modal.component.ts
// Reusable modal form for create/edit of any master data record.
// Driven entirely by MasterTableConfig — no per-table code needed.
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MasterTableConfig, MasterFieldDef } from './master-table.config';
import { AdminMasterService, MasterRecord } from '../../../core/services/admin-master.service';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';

// Re-export for convenience
export type { MasterRecord } from '../../../core/services/admin-master.service';

@Component({
  selector: 'app-master-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (visible) {
      <!-- Backdrop -->
      <div class="modal-backdrop fade show" style="z-index:1050" (click)="onCancel()"></div>

      <!-- Modal -->
      <div class="modal d-block" tabindex="-1" style="z-index:1055" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:520px">
          <div class="modal-content mfm-modal">

            <!-- Header -->
            <div class="modal-header mfm-header border-0 pb-0">
              <div class="d-flex align-items-center gap-2">
                <div class="mfm-header__icon">
                  <i class="bi" [class]="config.icon"></i>
                </div>
                <div>
                  <h5 class="modal-title fw-semibold mb-0">
                    {{ isEdit ? 'Edit' : 'Add New' }} {{ config.label | slice:0:-1 }}
                  </h5>
                  <p class="text-muted small mb-0">{{ config.labelPlural }}</p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="onCancel()" [disabled]="saving"></button>
            </div>

            <!-- Body -->
            <div class="modal-body pt-3">
              @if (form) {
                <form [formGroup]="form" (ngSubmit)="onSave()" id="master-form" autocomplete="off">
                  @for (field of config.fields; track field.key) {
                    <div class="mb-3">
                      <label class="form-label small fw-medium mb-1">
                        {{ field.label }}
                        @if (field.required) { <span class="text-danger ms-1">*</span> }
                      </label>

                      <!-- Select field -->
                      @if (field.type === 'select') {
                        <select class="form-select form-select-sm"
                          [formControlName]="field.key"
                          [class.is-invalid]="isInvalid(field.key)">
                          <option value="" disabled>— Select {{ field.label }} —</option>
                          @for (opt of getSelectOptions(field); track opt.id) {
                            <option [value]="opt.id">{{ opt.label }}</option>
                          }
                        </select>
                      }

                      <!-- Number field -->
                      @if (field.type === 'number') {
                        <input type="number"
                          class="form-control form-control-sm"
                          [formControlName]="field.key"
                          [placeholder]="field.placeholder || ''"
                          [min]="field.min ?? 0"
                          [class.is-invalid]="isInvalid(field.key)">
                      }

                      <!-- Text field -->
                      @if (field.type === 'text') {
                        <input type="text"
                          class="form-control form-control-sm"
                          [formControlName]="field.key"
                          [placeholder]="field.placeholder || ''"
                          [maxlength]="field.maxLength || 255"
                          [class.is-invalid]="isInvalid(field.key)">
                      }

                      <!-- Validation errors -->
                      @if (isInvalid(field.key)) {
                        <div class="invalid-feedback d-block">
                          @if (form.get(field.key)?.errors?.['required']) {
                            {{ field.label }} is required.
                          }
                          @if (form.get(field.key)?.errors?.['maxlength']) {
                            Maximum {{ field.maxLength }} characters allowed.
                          }
                          @if (form.get(field.key)?.errors?.['min']) {
                            Value must be {{ field.min ?? 0 }} or greater.
                          }
                        </div>
                      }
                    </div>
                  }

                  <!-- Server error -->
                  @if (serverError) {
                    <div class="alert alert-danger py-2 small">
                      <i class="bi bi-exclamation-triangle me-1"></i>{{ serverError }}
                    </div>
                  }
                </form>
              }
            </div>

            <!-- Footer -->
            <div class="modal-footer border-0 pt-0 gap-2">
              <button type="button" class="btn btn-outline-secondary btn-sm"
                (click)="onCancel()" [disabled]="saving">
                Cancel
              </button>
              <button type="submit" form="master-form" class="btn btn-primary btn-sm"
                [disabled]="saving || form.invalid">
                @if (saving) {
                  <span class="spinner-border spinner-border-sm me-1"></span>Saving…
                } @else {
                  <i class="bi bi-check-lg me-1"></i>{{ isEdit ? 'Save Changes' : 'Create Record' }}
                }
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .mfm-modal { border: none; border-radius: var(--th-radius-xl, 14px); box-shadow: var(--th-shadow-xl); overflow: hidden; }
    .mfm-header { background: var(--th-surface, #fff); padding: 1.25rem 1.5rem 0; }
    .mfm-header__icon {
      width: 40px; height: 40px; border-radius: var(--th-radius, 8px);
      background: var(--th-primary-soft, #eef2ff);
      display: flex; align-items: center; justify-content: center;
      color: var(--th-primary, #5046e5); font-size: 1.1rem;
    }
    .form-control, .form-select {
      border-color: var(--th-border, #e5e7eb);
      font-size: .875rem;
    }
    .form-control:focus, .form-select:focus {
      border-color: var(--th-primary, #5046e5);
      box-shadow: 0 0 0 0.2rem rgba(80,70,229,.15);
    }
    .modal-body { padding: 1rem 1.5rem; }
    .modal-footer { padding: .75rem 1.5rem 1.25rem; }
  `],
})
export class MasterFormModalComponent implements OnInit, OnChanges {
  @Input() config!:  MasterTableConfig;
  @Input() record:   MasterRecord | null = null;   // null = create mode
  @Input() visible = false;
  @Output() saved   = new EventEmitter<MasterRecord>();
  @Output() closed  = new EventEmitter<void>();

  form!:        FormGroup;
  saving      = false;
  serverError = '';

  get isEdit(): boolean { return !!this.record; }

  constructor(
    private fb:         FormBuilder,
    private adminSvc:   AdminMasterService,
    private masterData: MasterDataService,
    private toast:      ToastService,
  ) {}

  ngOnInit(): void { this.buildForm(); }

  ngOnChanges(): void {
    if (this.visible) {
      this.serverError = '';
      this.buildForm();
    }
  }

  buildForm(): void {
    if (!this.config) return;
    const group: Record<string, any> = {};
    for (const field of this.config.fields) {
      const existing = this.record?.[field.key] ?? '';
      const validators = [];
      if (field.required)   validators.push(Validators.required);
      if (field.maxLength)  validators.push(Validators.maxLength(field.maxLength));
      if (field.type === 'number' && field.min != null) validators.push(Validators.min(field.min));
      group[field.key] = [existing === null ? '' : existing, validators];
    }
    this.form = this.fb.group(group);
  }

  isInvalid(key: string): boolean {
    const ctrl = this.form?.get(key);
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  getSelectOptions(field: MasterFieldDef): { id: number; label: string }[] {
    if (!field.selectSource) return [];
    if (field.selectSource === 'countries') {
      return this.masterData.countries().map((c) => ({ id: c.id, label: `${c.flag_emoji ?? ''} ${c.name}`.trim() }));
    }
    if (field.selectSource === 'occupations') {
      return this.masterData.occupations().map((o) => ({ id: o.id, label: o.name }));
    }
    return [];
  }

  onSave(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving      = true;
    this.serverError = '';

    const payload = { ...this.form.value };
    // Coerce numeric select values
    for (const field of this.config.fields) {
      if (field.type === 'select' && payload[field.key] !== '') {
        payload[field.key] = Number(payload[field.key]);
      }
      if (field.type === 'number' && payload[field.key] !== '') {
        payload[field.key] = Number(payload[field.key]);
      }
    }

    const obs = this.isEdit
      ? this.adminSvc.update(this.config.table, this.record!.id, payload)
      : this.adminSvc.create(this.config.table, payload);

    obs.subscribe({
      next: (res) => {
        this.saving = false;
        this.toast.show(
          this.isEdit ? 'Record updated successfully.' : 'Record created successfully.',
          'success',
        );
        this.saved.emit(res.data);
      },
      error: (err) => {
        this.saving      = false;
        this.serverError = err?.error?.message ?? 'Save failed. Please try again.';
      },
    });
  }

  onCancel(): void {
    if (this.saving) return;
    this.closed.emit();
  }
}
