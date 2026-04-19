// src/app/features/admin/recruiter-create/recruiter-create.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

function durationRequiredValidator(g: AbstractControl): ValidationErrors | null {
  const val  = g.get('duration_value')?.value;
  const unit = g.get('duration_unit')?.value;
  if (val && val >= 1 && unit) return null;
  return { durationRequired: true };
}

@Component({
  selector: 'app-recruiter-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent],
  template: `
    <div class="mb-3">
      <a routerLink="/admin/recruiters" class="back-btn">
        <i class="bi bi-arrow-left"></i>Back to Recruiters
      </a>
    </div>

    <app-page-header title="Add Recruiter" icon="bi-person-plus" subtitle="Create a new recruiter account" />

    <div class="form-card" style="max-width:600px;">

      @if (success) {
        <div class="reg-success-banner">
          <div class="reg-success-banner__icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <div class="reg-success-banner__body">
            <div class="reg-success-banner__title">Recruiter created! Login credentials have been emailed.</div>
            @if (createdRecruiterNumber) {
              <div class="reg-success-banner__code-row">
                Recruiter ID: <span class="reg-success-banner__code">{{ createdRecruiterNumber }}</span>
              </div>
            }
            <div class="mt-3 d-flex gap-2">
              <a routerLink="/admin/recruiters" class="btn btn-sm btn-primary">View Recruiters</a>
              <button class="btn btn-sm btn-outline-secondary" (click)="reset()">Add Another</button>
            </div>
          </div>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">

          <div class="mb-3">
            <label class="form-label fw-semibold">Contact Name <span class="text-danger">*</span></label>
            <input formControlName="contact_name" class="form-control"
              [class.is-invalid]="invalid('contact_name')" placeholder="Jane Smith">
            @if (invalid('contact_name')) {
              <div class="invalid-feedback">Contact name is required.</div>
            }
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Email <span class="text-danger">*</span></label>
            <input formControlName="email" type="email" class="form-control"
              [class.is-invalid]="invalid('email')" placeholder="recruiter@company.com">
            @if (invalid('email')) {
              <div class="invalid-feedback">Valid email is required.</div>
            }
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold">Company Name</label>
            <input formControlName="company_name" class="form-control" placeholder="Acme Corp (optional)">
          </div>

          <!-- Password -->
          <div class="mb-3">
            <label class="form-label fw-semibold">Password <span class="text-danger">*</span></label>
            <div class="input-group">
              <input [type]="showPw ? 'text' : 'password'" formControlName="password"
                class="form-control" placeholder="Min 8 characters"
                [class.is-invalid]="invalid('password')">
              <button type="button" class="btn btn-outline-secondary"
                (click)="showPw = !showPw">
                <i class="bi" [class.bi-eye]="!showPw" [class.bi-eye-slash]="showPw"></i>
              </button>
              @if (invalid('password')) {
                <div class="invalid-feedback">Minimum 8 characters required.</div>
              }
            </div>
          </div>

          <!-- Access Duration -->
          <div class="mb-4">
            <label class="form-label fw-semibold">Access Duration <span class="text-danger">*</span></label>
            <div class="d-flex gap-2">
              <input type="number" formControlName="duration_value" class="form-control"
                placeholder="e.g. 6" min="1" style="width:100px;flex-shrink:0"
                [class.is-invalid]="submitted && form.hasError('durationRequired')">
              <select formControlName="duration_unit" class="form-select"
                [class.is-invalid]="submitted && form.hasError('durationRequired')">
                <option value="">— Unit —</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            @if (submitted && form.hasError('durationRequired')) {
              <div class="text-danger small mt-1">Please enter a valid duration and select a unit.</div>
            }
            @if (expiryPreview) {
              <div class="form-text text-info mt-1">
                <i class="bi bi-clock me-1"></i>Access will expire on: {{ expiryPreview }}
              </div>
            }
          </div>

          @if (error) {
            <div class="alert alert-danger small py-2">{{ error }}</div>
          }

          <button type="submit" class="btn btn-primary w-100" [disabled]="submitting">
            @if (submitting) {
              <span class="spinner-border spinner-border-sm me-2"></span>Creating…
            } @else {
              <i class="bi bi-person-plus me-1"></i>Create Recruiter
            }
          </button>

        </form>
      }
    </div>
  `,
})
export class RecruiterCreateComponent {
  form: FormGroup;
  submitting = false;
  submitted  = false;
  error = '';
  success = false;
  createdRecruiterNumber = '';
  showPw = false;

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      contact_name:   ['', Validators.required],
      email:          ['', [Validators.required, Validators.email]],
      company_name:   [''],
      password:       ['', [Validators.required, Validators.minLength(8)]],
      duration_value: [null as number | null],
      duration_unit:  [''],
    }, { validators: durationRequiredValidator });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  get expiryPreview(): string {
    const val  = this.form.get('duration_value')?.value;
    const unit = this.form.get('duration_unit')?.value;
    if (!val || !unit || val < 1) return '';
    const dt = this.computeExpiry(val, unit);
    return dt.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  private computeExpiry(value: number, unit: string): Date {
    const dt = new Date();
    switch (unit) {
      case 'hours':  dt.setHours(dt.getHours() + value);        break;
      case 'days':   dt.setDate(dt.getDate() + value);           break;
      case 'weeks':  dt.setDate(dt.getDate() + value * 7);       break;
      case 'months': dt.setMonth(dt.getMonth() + value);         break;
      case 'years':  dt.setFullYear(dt.getFullYear() + value);   break;
    }
    return dt;
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error = '';

    const val = this.form.value;
    const accessExpiresAt = this.computeExpiry(val.duration_value, val.duration_unit).toISOString();

    this.recruiterService.create({
      email:             val.email,
      contact_name:      val.contact_name,
      company_name:      val.company_name || undefined,
      password:          val.password,
      access_expires_at: accessExpiresAt,
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.createdRecruiterNumber = res.recruiter?.recruiter_number ?? '';
        this.success    = true;
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message ?? 'Failed to create recruiter.';
      },
    });
  }

  reset(): void {
    this.success   = false;
    this.submitted = false;
    this.createdRecruiterNumber = '';
    this.form.reset({ contact_name: '', email: '', company_name: '', password: '', duration_value: null, duration_unit: '' });
  }
}
