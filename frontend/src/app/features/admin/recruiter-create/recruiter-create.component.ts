// src/app/features/admin/recruiter-create/recruiter-create.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MasterDataService } from '../../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';

function durationRequiredValidator(g: AbstractControl): ValidationErrors | null {
  const val  = g.get('duration_value')?.value;
  const unit = g.get('duration_unit')?.value;
  if (val && val >= 1 && unit) return null;
  return { durationRequired: true };
}

@Component({
  selector: 'app-recruiter-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, SearchableSelectComponent, ChipMultiSelectComponent],
  template: `
    <div class="mb-3">
      <a routerLink="/admin/recruiters" class="back-btn">
        <i class="bi bi-arrow-left"></i>Back to Recruiters
      </a>
    </div>

    <app-page-header title="Add Recruiter" icon="bi-person-plus" subtitle="Create a new recruiter account" />

    <div class="form-card" style="max-width:720px;">

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

          <!-- ── Section 1: Contact Details ─────────────────────────── -->
          <h6 class="form-section-heading">Contact Details</h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
              <input formControlName="contact_name" class="form-control"
                [class.is-invalid]="invalid('contact_name')" placeholder="Jane Smith">
              @if (invalid('contact_name')) {
                <div class="invalid-feedback">Contact name is required.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Job Title / Role</label>
              <input formControlName="contact_job_title" class="form-control"
                placeholder="e.g. Talent Acquisition Manager">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Work Email <span class="text-danger">*</span></label>
              <input formControlName="email" type="email" class="form-control"
                [class.is-invalid]="invalid('email')" placeholder="recruiter@company.com">
              @if (invalid('email')) {
                <div class="invalid-feedback">Valid email is required.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Phone / WhatsApp</label>
              <input formControlName="phone" class="form-control" placeholder="+44 7700 900000">
            </div>

          </div>

          <!-- ── Section 2: Company Details ─────────────────────────── -->
          <h6 class="form-section-heading">Company Details</h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Name</label>
              <input formControlName="company_name" class="form-control" placeholder="Acme Recruiting Ltd">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Website</label>
              <input formControlName="company_website" class="form-control" placeholder="https://example.com">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Country</label>
              <app-searchable-select
                formControlName="company_country"
                [options]="countryOpts()"
                placeholder="Select country" />
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company City</label>
              <input formControlName="company_city" class="form-control" placeholder="London">
            </div>

            <div class="col-12">
              <label class="form-label fw-semibold">Industry / Sector</label>
              <app-searchable-select
                formControlName="industry"
                [options]="industryOpts()"
                placeholder="Select industry" />
            </div>

          </div>

          <!-- ── Section 3: Sponsor Licence ─────────────────────────── -->
          <h6 class="form-section-heading">Sponsor Licence</h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Holds Sponsor Licence</label>
              <select formControlName="has_sponsor_licence" class="form-select">
                <option value="">— Select —</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            @if (sponsorYes) {
              <div class="col-md-6">
                <label class="form-label fw-semibold">Licence Number</label>
                <input formControlName="sponsor_licence_number" class="form-control"
                  placeholder="e.g. 1Z3GF3C...">
              </div>

              <div class="col-12">
                <label class="form-label fw-semibold">Licence Countries</label>
                <app-chip-multi-select
                  formControlName="sponsor_licence_countries"
                  [options]="nationalityOpts()"
                  placeholder="Select countries covered by licence" />
              </div>
            }

          </div>

          <!-- ── Section 4: Hiring Preferences ─────────────────────── -->
          <h6 class="form-section-heading">Hiring Preferences</h6>
          <div class="row g-3 mb-4">

            <div class="col-12">
              <label class="form-label fw-semibold">Target Nationalities</label>
              <app-chip-multi-select
                formControlName="target_nationalities"
                [options]="nationalityOpts()"
                placeholder="Select nationalities to hire" />
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Hires Per Year</label>
              <select formControlName="hires_per_year" class="form-select">
                <option value="">— Select —</option>
                <option value="1-5">1 – 5</option>
                <option value="6-10">6 – 10</option>
                <option value="11-20">11 – 20</option>
                <option value="21-50">21 – 50</option>
                <option value="51+">51+</option>
              </select>
            </div>

          </div>

          <!-- ── Section 5: Account Setup ───────────────────────────── -->
          <h6 class="form-section-heading">Account Setup</h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Password <span class="text-danger">*</span></label>
              <div class="input-group">
                <input [type]="showPw ? 'text' : 'password'" formControlName="password"
                  class="form-control" placeholder="Min 8 characters"
                  [class.is-invalid]="invalid('password')">
                <button type="button" class="btn btn-outline-secondary" (click)="showPw = !showPw">
                  <i class="bi" [class.bi-eye]="!showPw" [class.bi-eye-slash]="showPw"></i>
                </button>
                @if (invalid('password')) {
                  <div class="invalid-feedback">Minimum 8 characters required.</div>
                }
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Account Status</label>
              <select formControlName="is_active_str" class="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div class="col-12">
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

          </div>

          <!-- ── Section 6: Admin Notes ──────────────────────────────── -->
          <h6 class="form-section-heading">Admin Notes</h6>
          <div class="mb-4">
            <textarea formControlName="admin_notes" class="form-control" rows="3"
              placeholder="Internal notes — not visible to the recruiter"></textarea>
          </div>

          @if (error) {
            <div class="alert alert-danger small py-2">{{ error }}</div>
          }

          <button type="submit" class="btn btn-primary w-100" [disabled]="submitting">
            @if (submitting) {
              <span class="spinner-border spinner-border-sm me-2"></span>Creating…
            } @else {
              <i class="bi bi-person-plus me-1"></i>Save Recruiter
            }
          </button>

        </form>
      }
    </div>
  `,
})
export class RecruiterCreateComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  submitted  = false;
  error = '';
  success = false;
  createdRecruiterNumber = '';
  showPw = false;

  countryOpts = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  industryOpts = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name }))
  );

  nationalityOpts = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private router: Router,
    private master: MasterDataService,
  ) {
    this.form = this.fb.group({
      // Section 1: Contact
      contact_name:      ['', Validators.required],
      contact_job_title: [''],
      email:             ['', [Validators.required, Validators.email]],
      phone:             [''],
      // Section 2: Company
      company_name:      [''],
      company_website:   [''],
      company_country:   [null],
      company_city:      [''],
      industry:          [null],
      // Section 3: Sponsor
      has_sponsor_licence:       [''],
      sponsor_licence_number:    [''],
      sponsor_licence_countries: [[]],
      // Section 4: Hiring
      target_nationalities: [[]],
      hires_per_year:       [''],
      // Section 5: Account
      password:       ['', [Validators.required, Validators.minLength(8)]],
      is_active_str:  ['active'],
      duration_value: [null as number | null],
      duration_unit:  [''],
      // Section 6: Notes
      admin_notes: [''],
    }, { validators: durationRequiredValidator });
  }

  async ngOnInit(): Promise<void> {
    await this.master.loadAll();
  }

  get sponsorYes(): boolean {
    return this.form.get('has_sponsor_licence')?.value === 'yes';
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  get expiryPreview(): string {
    const val  = this.form.get('duration_value')?.value;
    const unit = this.form.get('duration_unit')?.value;
    if (!val || !unit || val < 1) return '';
    return this.computeExpiry(val, unit).toLocaleDateString('en-GB', {
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

    const v = this.form.value;
    const accessExpiresAt = this.computeExpiry(v.duration_value, v.duration_unit).toISOString();

    this.recruiterService.create({
      email:             v.email,
      contact_name:      v.contact_name,
      contact_job_title: v.contact_job_title || undefined,
      company_name:      v.company_name || undefined,
      company_country:   v.company_country || undefined,
      company_city:      v.company_city || undefined,
      company_website:   v.company_website || undefined,
      industry:          v.industry || undefined,
      phone:             v.phone || undefined,
      has_sponsor_licence:       (v.has_sponsor_licence as 'yes' | 'no' | 'unknown') || undefined,
      sponsor_licence_number:    v.sponsor_licence_number || undefined,
      sponsor_licence_countries: v.sponsor_licence_countries?.length ? v.sponsor_licence_countries : undefined,
      target_nationalities:      v.target_nationalities?.length ? v.target_nationalities : undefined,
      hires_per_year:    v.hires_per_year || undefined,
      is_active:         v.is_active_str !== 'inactive',
      admin_notes:       v.admin_notes || undefined,
      password:          v.password,
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
    this.form.reset({
      contact_name: '', contact_job_title: '', email: '', phone: '',
      company_name: '', company_website: '', company_country: null, company_city: '', industry: null,
      has_sponsor_licence: '', sponsor_licence_number: '', sponsor_licence_countries: [],
      target_nationalities: [], hires_per_year: '',
      password: '', is_active_str: 'active', duration_value: null, duration_unit: '',
      admin_notes: '',
    });
  }
}
