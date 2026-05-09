// src/app/features/admin/recruiter-create/recruiter-create.component.ts
import { Component, OnInit, computed, signal } from '@angular/core';
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

    <div class="form-card" style="max-width:760px;">

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
          <h6 class="form-section-heading">
            <i class="bi bi-person-vcard me-2"></i>Contact Person Details
          </h6>
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
              <label class="form-label fw-semibold">Recruiter Type</label>
              <select formControlName="type" class="form-select" (change)="onTypeChange()">
                <option value="direct_employer">Direct Employer</option>
                <option value="recruitment_agency">Recruitment Agency</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Job Title / Role</label>
              <input formControlName="contact_job_title" class="form-control"
                placeholder="e.g. HR Manager, Director, Owner">
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
              <label class="form-label fw-semibold">Phone Number</label>
              <input formControlName="phone" class="form-control" placeholder="+44 7700 900000">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">WhatsApp Number</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-whatsapp text-success"></i></span>
                <input formControlName="whatsapp_number" class="form-control" placeholder="+44 7700 900000"
                  [class.bg-light]="form.get('whatsapp_same_as_phone')?.value"
                  [attr.readonly]="form.get('whatsapp_same_as_phone')?.value ? true : null">
              </div>
              <div class="form-check mt-1">
                <input class="form-check-input" type="checkbox" formControlName="whatsapp_same_as_phone"
                  id="whatsappSameAsPhone">
                <label class="form-check-label small text-muted" for="whatsappSameAsPhone">
                  Same as phone number
                </label>
              </div>
            </div>

          </div>

          <!-- ── Section 2: Company Details ─────────────────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-building me-2"></i>Company Details
          </h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Name</label>
              <input formControlName="company_name" class="form-control" placeholder="Acme Recruiting Ltd">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Website</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-globe"></i></span>
                <input formControlName="company_website" class="form-control" placeholder="https://example.com">
              </div>
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
              <app-searchable-select
                formControlName="company_city"
                [options]="companyCityOpts()"
                placeholder="Select city" />
              <div class="form-text">Select a country first to load cities.</div>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Industry / Sector</label>
              <select formControlName="industry" class="form-select">
                <option value="">— Select industry —</option>
                <option value="Healthcare">Healthcare</option>
                <option value="IT">IT</option>
                <option value="Engineering">Engineering</option>
                <option value="Care">Care</option>
                <option value="Education">Education</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Construction">Construction</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Size</label>
              <select formControlName="company_size" class="form-select">
                <option value="">— Select size —</option>
                <option value="1-10">1 – 10 employees</option>
                <option value="11-50">11 – 50 employees</option>
                <option value="51-200">51 – 200 employees</option>
                <option value="201-500">201 – 500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
            </div>

          </div>

          <!-- ── Section 3: Recruitment Agency Details ──────────────── -->
          @if (isAgency) {
            <h6 class="form-section-heading">
              <i class="bi bi-diagram-3 me-2"></i>Recruitment Agency Details
            </h6>
            <div class="row g-3 mb-4">

              <div class="col-12">
                <label class="form-label fw-semibold">Sectors They Recruit For</label>
                <app-chip-multi-select
                  formControlName="sectors_recruit_for"
                  [options]="industryChipOpts"
                  placeholder="Select sectors" />
              </div>

              <div class="col-12">
                <label class="form-label fw-semibold">Countries They Place In</label>
                <app-chip-multi-select
                  formControlName="countries_place_in"
                  [options]="nationalityOpts()"
                  placeholder="Select countries" />
              </div>

            </div>
          }

          <!-- ── Section 4: Sponsor Licence ─────────────────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-shield-check me-2"></i>Sponsor Licence Details
            <span class="badge bg-danger ms-2" style="font-size:.65rem;font-weight:600;letter-spacing:.04em">CRITICAL</span>
          </h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Holds Sponsor Licence</label>
              <select formControlName="has_sponsor_licence" class="form-select">
                <option value="">— Select —</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="applied">Applied</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            @if (sponsorYes) {
              <div class="col-md-6">
                <label class="form-label fw-semibold">Licence Number</label>
                <input formControlName="sponsor_licence_number" class="form-control"
                  placeholder="e.g. 1Z3GF3C...">
                <div class="form-text">Verifiable at gov.uk</div>
              </div>

              <div class="col-12">
                <label class="form-label fw-semibold">Sponsor Licence Country</label>
                <app-chip-multi-select
                  formControlName="sponsor_licence_countries"
                  [options]="sponsorCountryOpts"
                  placeholder="Select countries covered by licence" />
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold">Licence Rating</label>
                <select formControlName="licence_rating" class="form-select">
                  <option value="">— Select rating —</option>
                  <option value="A-Rating">A-Rating</option>
                  <option value="B-Rating">B-Rating</option>
                  <option value="Not Applicable">Not Applicable</option>
                </select>
                @if (form.get('licence_rating')?.value === 'A-Rating') {
                  <div class="form-text text-success fw-semibold">
                    <i class="bi bi-check-circle-fill me-1"></i>A-Rating — valid for approvals
                  </div>
                }
                @if (form.get('licence_rating')?.value === 'B-Rating') {
                  <div class="form-text text-warning fw-semibold">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i>B-Rating — not valid for approvals
                  </div>
                }
              </div>

              <div class="col-md-6">
                <label class="form-label fw-semibold d-block">Licence Verified by Admin</label>
                <div class="d-flex align-items-center gap-3 mt-1">
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" role="switch"
                      formControlName="licence_verified" id="licenceVerifiedToggle"
                      style="width:2.5rem;height:1.25rem">
                    <label class="form-check-label ms-2 fw-semibold" for="licenceVerifiedToggle"
                      [style.color]="form.get('licence_verified')?.value ? 'var(--bs-success)' : 'var(--bs-warning)'">
                      {{ form.get('licence_verified')?.value ? 'Verified' : 'Not Verified' }}
                    </label>
                  </div>
                  @if (form.get('licence_verified')?.value) {
                    <i class="bi bi-patch-check-fill text-success"></i>
                  }
                </div>
                <div class="form-text">Admin confirms after gov.uk verification.</div>
              </div>
            }

          </div>

          <!-- ── Section 5: Hiring Preferences ─────────────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-people me-2"></i>Hiring Preferences
          </h6>
          <div class="row g-3 mb-4">

            <div class="col-12">
              <label class="form-label fw-semibold">Which Nationalities Looking to Hire</label>
              <app-chip-multi-select
                formControlName="target_nationalities"
                [options]="nationalityOpts()"
                placeholder="Select nationalities to hire" />
            </div>

            <div class="col-12">
              <label class="form-label fw-semibold">Target Candidate Countries</label>
              <app-chip-multi-select
                formControlName="countries_place_in"
                [options]="nationalityOpts()"
                placeholder="Where they want candidates from" />
            </div>

            <div class="col-12">
              <label class="form-label fw-semibold">Sectors Hiring For</label>
              <app-chip-multi-select
                formControlName="sectors_recruit_for"
                [options]="industryChipOpts"
                placeholder="Select sectors" />
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Typical Hires Per Year</label>
              <select formControlName="hires_per_year" class="form-select">
                <option value="">— Select —</option>
                <option value="1-5">1 – 5</option>
                <option value="6-20">6 – 20</option>
                <option value="21-50">21 – 50</option>
                <option value="50+">50+</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Job Types Offered</label>
              <app-chip-multi-select
                formControlName="job_types"
                [options]="jobTypeOpts"
                placeholder="Select job types" />
            </div>

          </div>

          <!-- ── Section 6: Access & Account Settings ───────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-gear me-2"></i>Access &amp; Account Settings
          </h6>
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
              <select formControlName="account_status" class="form-select">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Access Start Date</label>
              <input type="date" formControlName="access_start_date" class="form-control">
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

            <div class="col-md-6">
              <label class="form-label fw-semibold d-block">Free Account</label>
              <div class="d-flex align-items-center gap-3 mt-1">
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" role="switch"
                    formControlName="free_account" id="freeAccountToggle"
                    style="width:2.5rem;height:1.25rem">
                  <label class="form-check-label ms-2 fw-semibold" for="freeAccountToggle"
                    [style.color]="form.get('free_account')?.value ? 'var(--bs-success)' : 'var(--bs-secondary)'">
                    {{ form.get('free_account')?.value ? 'Free Account' : 'Paid Account' }}
                  </label>
                </div>
              </div>
            </div>

          </div>

          <!-- ── Section 7: Admin Notes ──────────────────────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-journal-text me-2"></i>Admin Notes
          </h6>
          <div class="mb-4">
            <textarea formControlName="admin_notes" class="form-control" rows="3"
              placeholder="Internal notes — not visible to the recruiter"></textarea>
          </div>

          <!-- ── Section 8: Verification Checklist ──────────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-clipboard2-check me-2"></i>Verification Checklist
            <span class="badge bg-warning text-dark ms-2" style="font-size:.65rem;font-weight:600;letter-spacing:.04em">MANDATORY</span>
          </h6>

          @if (!isAgency) {
            <!-- ── Direct Employer Verification ── -->
            <p class="small fw-semibold text-muted mb-2" style="letter-spacing:.03em">Direct Employer Verification</p>
            <div class="mb-4" style="border:1px solid var(--th-border);border-radius:var(--th-radius);overflow:hidden">

              <!-- DE Row 1 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_de_website')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_de_website" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-globe fs-5"
                  [style.color]="form.get('verify_de_website')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Company website verified</strong> — real company confirmed
                </span>
                @if (form.get('verify_de_website')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- DE Row 2 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_de_licence')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_de_licence" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-patch-check fs-5"
                  [style.color]="form.get('verify_de_licence')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Sponsor Licence checked on gov.uk</strong> — A-Rating confirmed
                </span>
                @if (form.get('verify_de_licence')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- DE Row 3 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_de_linkedin')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_de_linkedin" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-linkedin fs-5"
                  [style.color]="form.get('verify_de_linkedin')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Contact person LinkedIn verified</strong>
                </span>
                @if (form.get('verify_de_linkedin')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- DE Row 4 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;transition:background .15s"
                [style.background]="form.get('verify_de_briefed')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_de_briefed" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-info-circle fs-5"
                  [style.color]="form.get('verify_de_briefed')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Recruiter briefed on platform rules</strong>
                </span>
                @if (form.get('verify_de_briefed')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

            </div>
          } @else {
            <!-- ── Recruitment Agency Verification ── -->
            <p class="small fw-semibold text-muted mb-2" style="letter-spacing:.03em">Recruitment Agency Verification</p>
            <div class="mb-4" style="border:1px solid var(--th-border);border-radius:var(--th-radius);overflow:hidden">

              <!-- RA Row 1 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_ra_website')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_ra_website" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-globe fs-5"
                  [style.color]="form.get('verify_ra_website')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Agency website verified</strong> — legitimate agency confirmed
                </span>
                @if (form.get('verify_ra_website')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- RA Row 2 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_ra_ch')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_ra_ch" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-building fs-5"
                  [style.color]="form.get('verify_ra_ch')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Agency Companies House registration checked</strong>
                </span>
                @if (form.get('verify_ra_ch')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- RA Row 3 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_ra_rec')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_ra_rec" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-award fs-5"
                  [style.color]="form.get('verify_ra_rec')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>REC membership verified</strong> (if applicable)
                </span>
                @if (form.get('verify_ra_rec')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- RA Row 4 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_ra_sponsor')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_ra_sponsor" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-patch-check fs-5"
                  [style.color]="form.get('verify_ra_sponsor')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Confirmed their employer clients can sponsor visas</strong>
                </span>
                @if (form.get('verify_ra_sponsor')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- RA Row 5 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_ra_linkedin')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_ra_linkedin" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-linkedin fs-5"
                  [style.color]="form.get('verify_ra_linkedin')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Contact person LinkedIn verified</strong>
                </span>
                @if (form.get('verify_ra_linkedin')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

              <!-- RA Row 6 -->
              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;transition:background .15s"
                [style.background]="form.get('verify_ra_briefed')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_ra_briefed" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-info-circle fs-5"
                  [style.color]="form.get('verify_ra_briefed')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Agency briefed on platform rules</strong>
                </span>
                @if (form.get('verify_ra_briefed')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

            </div>
          }

          <!-- Checklist warning footer -->
          @if (!allChecked) {
            <div class="alert alert-warning d-flex align-items-center gap-2 py-2 mb-3">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span class="small">Complete all {{ isAgency ? '6' : '4' }} verification checks before saving this recruiter account.</span>
            </div>
          }

          @if (error) {
            <div class="alert alert-danger small py-2">{{ error }}</div>
          }

          <button type="submit" class="btn btn-primary w-100"
            [disabled]="submitting || !allChecked">
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

  // ── Computed signals from master data ──────────────────────────────────────
  countryOpts = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  companyCityOpts = computed<SelectOption[]>(() =>
    this.master.cities().map(c => ({ value: c.name, label: c.name }))
  );

  nationalityOpts = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  // ── Static option arrays ────────────────────────────────────────────────────
  readonly industryChipOpts: ChipOption[] = [
    { value: 'Healthcare',    label: 'Healthcare' },
    { value: 'IT',            label: 'IT' },
    { value: 'Engineering',   label: 'Engineering' },
    { value: 'Care',          label: 'Care' },
    { value: 'Education',     label: 'Education' },
    { value: 'Hospitality',   label: 'Hospitality' },
    { value: 'Construction',  label: 'Construction' },
    { value: 'Finance',       label: 'Finance' },
    { value: 'Other',         label: 'Other' },
  ];

  readonly sponsorCountryOpts: ChipOption[] = [
    { value: 'United Kingdom',  label: '🇬🇧 United Kingdom' },
    { value: 'Germany',         label: '🇩🇪 Germany' },
    { value: 'Netherlands',     label: '🇳🇱 Netherlands' },
    { value: 'Canada',          label: '🇨🇦 Canada' },
    { value: 'Australia',       label: '🇦🇺 Australia' },
  ];

  readonly jobTypeOpts: ChipOption[] = [
    { value: 'Full Time',   label: 'Full Time' },
    { value: 'Part Time',   label: 'Part Time' },
    { value: 'Contract',    label: 'Contract' },
    { value: 'Internship',  label: 'Internship' },
  ];

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
      type:              ['direct_employer'],
      email:             ['', [Validators.required, Validators.email]],
      phone:             [''],
      whatsapp_number:   [''],
      whatsapp_same_as_phone: [false],
      // Section 2: Company
      company_name:      [''],
      company_website:   [''],
      company_country:   [null],
      company_city:      [null],
      industry:          [''],
      company_size:      [''],
      // Section 4: Sponsor Licence
      has_sponsor_licence:       [''],
      sponsor_licence_number:    [''],
      sponsor_licence_countries: [[]],
      licence_rating:            [''],
      licence_verified:          [false],
      // Section 3a: Agency-only (also used in Hiring Preferences)
      sectors_recruit_for:  [[]],
      countries_place_in:   [[]],
      // Section 5: Hiring Preferences
      target_nationalities: [[]],
      hires_per_year:       [''],
      job_types:            [[]],
      // Section 6: Account Setup
      password:           ['', [Validators.required, Validators.minLength(8)]],
      account_status:     ['active'],
      access_start_date:  [''],
      duration_value:     [null as number | null],
      duration_unit:      [''],
      free_account:       [false],
      // Section 7: Notes
      admin_notes: [''],
      // Section 8: Verification checklist (not sent to backend)
      // Direct Employer checks
      verify_de_website:  [false],
      verify_de_licence:  [false],
      verify_de_linkedin: [false],
      verify_de_briefed:  [false],
      // Recruitment Agency checks
      verify_ra_website:  [false],
      verify_ra_ch:       [false],
      verify_ra_rec:      [false],
      verify_ra_sponsor:  [false],
      verify_ra_linkedin: [false],
      verify_ra_briefed:  [false],
    }, { validators: durationRequiredValidator });
  }

  async ngOnInit(): Promise<void> {
    await this.master.loadAll();

    // Cascade: company country → load company cities
    this.form.get('company_country')!.valueChanges.subscribe(v => this.onCompanyCountryChange(v));

    // WhatsApp same-as-phone sync
    this.form.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        const phone = this.form.get('phone')?.value ?? '';
        this.form.patchValue({ whatsapp_number: phone }, { emitEvent: false });
      }
    });
    this.form.get('phone')!.valueChanges.subscribe((phone: string) => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        this.form.patchValue({ whatsapp_number: phone }, { emitEvent: false });
      }
    });
  }

  onCompanyCountryChange(countryName: string | null): void {
    this.form.patchValue({ company_city: null }, { emitEvent: false });
    if (!countryName) { this.master.cities.set([]); return; }
    const country = this.master.countries().find(c => c.name === String(countryName));
    if (country) this.master.loadCities(country.id);
  }

  get sponsorYes(): boolean {
    return this.form.get('has_sponsor_licence')?.value === 'yes';
  }

  get isAgency(): boolean {
    return this.form.get('type')?.value === 'recruitment_agency';
  }

  get allChecked(): boolean {
    if (this.isAgency) {
      return !!(
        this.form.get('verify_ra_website')?.value &&
        this.form.get('verify_ra_ch')?.value &&
        this.form.get('verify_ra_rec')?.value &&
        this.form.get('verify_ra_sponsor')?.value &&
        this.form.get('verify_ra_linkedin')?.value &&
        this.form.get('verify_ra_briefed')?.value
      );
    }
    return !!(
      this.form.get('verify_de_website')?.value &&
      this.form.get('verify_de_licence')?.value &&
      this.form.get('verify_de_linkedin')?.value &&
      this.form.get('verify_de_briefed')?.value
    );
  }

  onTypeChange(): void {
    this.form.patchValue({
      verify_de_website:  false,
      verify_de_licence:  false,
      verify_de_linkedin: false,
      verify_de_briefed:  false,
      verify_ra_website:  false,
      verify_ra_ch:       false,
      verify_ra_rec:      false,
      verify_ra_sponsor:  false,
      verify_ra_linkedin: false,
      verify_ra_briefed:  false,
    }, { emitEvent: false });
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
    if (!this.allChecked) return;
    this.submitting = true;
    this.error = '';

    const v = this.form.value;
    const accessExpiresAt = this.computeExpiry(v.duration_value, v.duration_unit).toISOString();

    this.recruiterService.create({
      email:             v.email,
      contact_name:      v.contact_name,
      type:              v.type || 'direct_employer',
      contact_job_title: v.contact_job_title || undefined,
      phone:             v.phone || undefined,
      whatsapp_number:   v.whatsapp_number || undefined,
      company_name:      v.company_name || undefined,
      company_website:   v.company_website || undefined,
      company_country:   v.company_country || undefined,
      company_city:      v.company_city || undefined,
      industry:          v.industry || undefined,
      company_size:      v.company_size || undefined,
      has_sponsor_licence:       (v.has_sponsor_licence as 'yes' | 'no' | 'applied' | 'unknown') || undefined,
      sponsor_licence_number:    v.sponsor_licence_number || undefined,
      sponsor_licence_countries: v.sponsor_licence_countries?.length ? v.sponsor_licence_countries : undefined,
      licence_rating:            v.licence_rating || undefined,
      licence_verified:          v.licence_verified ?? false,
      target_nationalities:      v.target_nationalities?.length ? v.target_nationalities : undefined,
      countries_place_in:        v.countries_place_in?.length ? v.countries_place_in : undefined,
      sectors_recruit_for:       v.sectors_recruit_for?.length ? v.sectors_recruit_for : undefined,
      hires_per_year:            v.hires_per_year || undefined,
      job_types:                 v.job_types?.length ? v.job_types : undefined,
      account_status:            v.account_status as 'active' | 'pending' | 'suspended',
      is_active:                 v.account_status === 'active',
      access_start_date:         v.access_start_date || undefined,
      free_account:              v.free_account ?? false,
      admin_notes:               v.admin_notes || undefined,
      password:                  v.password,
      access_expires_at:         accessExpiresAt,
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
    this.master.cities.set([]);
    this.form.reset({
      contact_name: '', contact_job_title: '', type: 'direct_employer',
      email: '', phone: '', whatsapp_number: '', whatsapp_same_as_phone: false,
      company_name: '', company_website: '', company_country: null, company_city: null,
      industry: '', company_size: '',
      has_sponsor_licence: '', sponsor_licence_number: '', sponsor_licence_countries: [],
      licence_rating: '', licence_verified: false,
      sectors_recruit_for: [], countries_place_in: [],
      target_nationalities: [], hires_per_year: '', job_types: [],
      password: '', account_status: 'active', access_start_date: '',
      duration_value: null, duration_unit: '',
      free_account: false, admin_notes: '',
      verify_company: false, verify_licence: false, verify_linkedin: false, verify_briefed: false,
    });
  }
}
