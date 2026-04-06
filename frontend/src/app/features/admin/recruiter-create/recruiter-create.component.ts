// src/app/features/admin/recruiter-create/recruiter-create.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

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

      @if (successToken) {
        <div class="alert alert-success">
          <strong><i class="bi bi-check-circle me-1"></i>Recruiter created!</strong>
          @if (form.value.send_email) {
            <p class="mb-0 mt-1 small">Access link has been emailed to the recruiter.</p>
          } @else {
            <p class="mt-2 mb-1 small fw-semibold">Copy this token now — it will not be shown again:</p>
            <code class="d-block p-2 bg-light rounded small" style="word-break:break-all">{{ successToken }}</code>
          }
          <div class="mt-3">
            <a routerLink="/admin/recruiters" class="btn btn-sm btn-primary me-2">View Recruiters</a>
            <button class="btn btn-sm btn-outline-secondary" (click)="reset()">Add Another</button>
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

          <div class="mb-3">
            <label class="form-label fw-semibold">Access Duration</label>
            <select formControlName="access_duration_seconds" class="form-select">
              <option [value]="1 * 24 * 3600">1 day</option>
              <option [value]="3 * 24 * 3600">3 days</option>
              <option [value]="7 * 24 * 3600">7 days (default)</option>
              <option [value]="14 * 24 * 3600">14 days</option>
              <option [value]="30 * 24 * 3600">30 days</option>
            </select>
          </div>

          <div class="mb-4 form-check">
            <input type="checkbox" class="form-check-input" id="sendEmail" formControlName="send_email">
            <label class="form-check-label small" for="sendEmail">
              Send access link by email immediately
            </label>
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
  error = '';
  successToken = '';

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      contact_name:            ['', Validators.required],
      email:                   ['', [Validators.required, Validators.email]],
      company_name:            [''],
      access_duration_seconds: [7 * 24 * 3600],
      send_email:              [true],
    });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error = '';

    const val = this.form.value;
    this.recruiterService.create({
      email:                   val.email,
      contact_name:            val.contact_name,
      company_name:            val.company_name || undefined,
      access_duration_seconds: val.access_duration_seconds,
      send_email:              val.send_email,
    }).subscribe({
      next: (res) => {
        this.submitting  = false;
        this.successToken = res.token;
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message ?? 'Failed to create recruiter.';
      },
    });
  }

  reset(): void {
    this.successToken = '';
    this.form.reset({
      access_duration_seconds: 7 * 24 * 3600,
      send_email: true,
    });
  }
}
