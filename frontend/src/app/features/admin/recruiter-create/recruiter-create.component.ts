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

      @if (success) {
        <div class="alert alert-success">
          <strong><i class="bi bi-check-circle me-1"></i>Recruiter created!</strong>
          <p class="mb-0 mt-1 small">Login credentials have been emailed to the recruiter.</p>
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

          <div class="mb-4">
            <label class="form-label fw-semibold">Company Name</label>
            <input formControlName="company_name" class="form-control" placeholder="Acme Corp (optional)">
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
  success = false;

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      contact_name: ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      company_name: [''],
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
      email:        val.email,
      contact_name: val.contact_name,
      company_name: val.company_name || undefined,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.success    = true;
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message ?? 'Failed to create recruiter.';
      },
    });
  }

  reset(): void {
    this.success = false;
    this.form.reset();
  }
}
