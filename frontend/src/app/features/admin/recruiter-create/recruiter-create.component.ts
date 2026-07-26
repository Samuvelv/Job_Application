// src/app/features/admin/recruiter-create/recruiter-create.component.ts
import { Component, OnInit, OnDestroy, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MasterDataService } from '../../../core/services/master-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { ToastService } from '../../../core/services/toast.service';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';

// ── Duration validator ─────────────────────────────────────────────────────
function durationRequiredValidator(g: AbstractControl): ValidationErrors | null {
  const val  = g.get('duration_value')?.value;
  const unit = g.get('duration_unit')?.value;
  if (val && val >= 1 && unit) return null;
  return { durationRequired: true };
}

// ── Phone rules map ────────────────────────────────────────────────────────
interface PhoneRule { minLen: number; maxLen: number; pattern?: RegExp; hint: string; }
const PHONE_RULES: Record<string, PhoneRule> = {
  '+91':  { minLen: 10, maxLen: 10, pattern: /^[6-9]\d{9}$/,   hint: '10 digits starting with 6–9 (India)' },
  '+1':   { minLen: 10, maxLen: 10, pattern: /^\d{10}$/,        hint: '10 digits (US / Canada)' },
  '+44':  { minLen: 10, maxLen: 11, pattern: /^7\d{9}$/,        hint: '10 digits starting with 7 (UK mobile)' },
  '+61':  { minLen: 9,  maxLen: 9,  pattern: /^[4]\d{8}$/,      hint: '9 digits starting with 4 (Australia)' },
  '+971': { minLen: 9,  maxLen: 9,  pattern: /^[5]\d{8}$/,      hint: '9 digits starting with 5 (UAE)' },
  '+234': { minLen: 10, maxLen: 11, pattern: /^[7-9]\d{9,10}$/, hint: '10–11 digits starting with 7–9 (Nigeria)' },
  '+254': { minLen: 9,  maxLen: 9,  pattern: /^[7]\d{8}$/,      hint: '9 digits starting with 7 (Kenya)' },
  '+27':  { minLen: 9,  maxLen: 9,  pattern: /^[6-8]\d{8}$/,    hint: '9 digits starting with 6–8 (South Africa)' },
  '+49':  { minLen: 10, maxLen: 12, pattern: /^\d{10,12}$/,     hint: '10–12 digits (Germany)' },
  '+33':  { minLen: 9,  maxLen: 9,  pattern: /^[6-7]\d{8}$/,    hint: '9 digits starting with 6–7 (France)' },
};
const PHONE_FALLBACK: PhoneRule = { minLen: 5, maxLen: 15, pattern: /^\d{5,15}$/, hint: '5–15 digits' };

function getPhoneRule(dialCode: string): PhoneRule {
  return PHONE_RULES[dialCode] ?? PHONE_FALLBACK;
}

// ── Phone group validator factory ──────────────────────────────────────────
function makePhoneGroupValidator(dialCtrl: string, numCtrl: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const dial = group.get(dialCtrl)?.value as string || '';
    const num  = (group.get(numCtrl)?.value as string || '').replace(/\s+/g, '');
    const numControl = group.get(numCtrl);
    if (!numControl) return null;

    if (!num) {
      const cur = numControl.errors;
      if (cur?.['phoneInvalid']) {
        const { phoneInvalid: _, ...rest } = cur;
        numControl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }

    const rule = getPhoneRule(dial);
    const digitsOnly = /^\d+$/.test(num);
    const lenOk = num.length >= rule.minLen && num.length <= rule.maxLen;
    const patOk = rule.pattern ? rule.pattern.test(num) : true;

    if (!digitsOnly || !lenOk || !patOk) {
      const msg = `Invalid number for ${dial}. Expected: ${rule.hint}.`;
      numControl.setErrors({ ...(numControl.errors || {}), phoneInvalid: msg });
      return { phoneInvalid: true };
    }

    const cur = numControl.errors;
    if (cur?.['phoneInvalid']) {
      const { phoneInvalid: _, ...rest } = cur;
      numControl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

// ── Website URL validator ──────────────────────────────────────────────────
function websiteValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null; // optional field — required handles empty separately
    const ok = /^(https?:\/\/)?(www\.)?[\w-]+(\.[\w-]{2,})(\/\S*)?$/.test(v);
    return ok ? null : { invalidWebsite: true };
  };
}

// ── Email validator (trims before checking) ────────────────────────────────
function emailValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return ok ? null : { invalidEmail: true };
  };
}

@Component({
  selector: 'app-recruiter-create',
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule, RouterLink, PageHeaderComponent, SearchableSelectComponent, ChipMultiSelectComponent],
   template: `
     <div class="mb-3">
       <a routerLink="/admin/recruiters" class="back-btn">
         <i class="bi bi-arrow-left"></i>{{ 'RECRUITER_CREATE.back_to_recruiters' | translate }}
       </a>
     </div>

     <app-page-header [title]="'RECRUITER_CREATE.title' | translate" icon="bi-person-plus" [subtitle]="'RECRUITER_CREATE.subtitle' | translate" />

    <div class="form-card">

      @if (success) {
        <div class="reg-success-banner">
          <div class="reg-success-banner__icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <div class="reg-success-banner__body">
            <div class="reg-success-banner__title">
              {{ createdContactName }}{{ createdCompanyName ? ' from ' + createdCompanyName : '' }} created successfully!
            </div>
             <div class="text-muted small mt-1">
              {{ 'RECRUITER_CREATE.credentials_emailed' | translate }}
               @if (createdWhatsApp) {
                 {{ 'RECRUITER_CREATE.whatsapp_message_sent' | translate }}
               }
             </div>
            @if (createdRecruiterNumber) {
               <div class="reg-success-banner__code-row">
                 {{ 'RECRUITER_CREATE.recruiter_id' | translate }}: <span class="reg-success-banner__code">{{ createdRecruiterNumber }}</span>
               </div>
            }
             <div class="mt-3 d-flex gap-2">
              <a routerLink="/admin/recruiters" class="btn btn-sm btn-primary">{{ 'RECRUITER_CREATE.view_recruiters' | translate }}</a>
              <button class="btn btn-sm btn-outline-secondary" (click)="reset()">{{ 'RECRUITER_CREATE.add_another' | translate }}</button>
             </div>
             <div class="text-muted small mt-2">{{ 'RECRUITER_CREATE.redirecting' | translate }}</div>
          </div>
        </div>
      } @else {
         @if (draftRestored) {
           <div class="alert alert-info alert-dismissible d-flex align-items-center gap-2" role="alert">
             <i class="bi bi-floppy2-fill"></i>
             <span>{{ 'RECRUITER_CREATE.draft_restored' | translate }}</span>
             <button type="button" class="btn-close" (click)="dismissDraftBanner()"></button>
           </div>
         }
        <form [formGroup]="form" (ngSubmit)="submit()">

           <!-- ── Section 1: Contact Details ─────────────────────────── -->
           <h6 class="form-section-heading">
             <i class="bi bi-person-vcard me-2"></i>{{ 'RECRUITER_CREATE.contact_person_details' | translate }}
           </h6>
          <div class="row g-3 mb-4">

             <div class="col-md-6">
              <label class="form-label fw-semibold">{{ 'COMMON.full_name' | translate }} <span class="text-danger">*</span></label>
              <input formControlName="contact_name" class="form-control"
                [class.is-invalid]="invalid('contact_name')" placeholder="Jane Smith">
              @if (invalid('contact_name')) {
                @if (ctrl('contact_name').hasError('required')) {
                  <div class="invalid-feedback">{{ 'RECRUITER_CREATE.full_name_required' | translate }}</div>
                } @else if (ctrl('contact_name').hasError('minlength')) {
                  <div class="invalid-feedback">{{ 'RECRUITER_CREATE.name_min_3_chars' | translate }}</div>
                } @else if (ctrl('contact_name').hasError('maxlength')) {
                  <div class="invalid-feedback">{{ 'RECRUITER_CREATE.name_max_100_chars' | translate }}</div>
                } @else if (ctrl('contact_name').hasError('pattern')) {
                  <div class="invalid-feedback">{{ 'RECRUITER_CREATE.name_pattern_error' | translate }}</div>
                }
              }
             </div>

             <div class="col-md-6">
              <label class="form-label fw-semibold">{{ 'RECRUITER_CREATE.recruiter_type' | translate }}</label>
              <app-searchable-select
                formControlName="type"
                [options]="RECRUITER_TYPE_OPTS"
                [allowClear]="false"
                placeholder="Select type" />
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Job Title / Role</label>
              <input formControlName="contact_job_title" class="form-control"
                [class.is-invalid]="invalid('contact_job_title')"
                placeholder="e.g. HR Manager, Director, Owner">
              @if (invalid('contact_job_title')) {
                @if (ctrl('contact_job_title').hasError('minlength')) {
                  <div class="invalid-feedback">Job title must be at least 2 characters.</div>
                } @else if (ctrl('contact_job_title').hasError('maxlength')) {
                  <div class="invalid-feedback">Job title must be 100 characters or fewer.</div>
                }
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Work Email <span class="text-danger">*</span></label>
              <input formControlName="email" type="email" class="form-control"
                [class.is-invalid]="invalid('email')" placeholder="recruiter@company.com">
              @if (invalid('email')) {
                @if (ctrl('email').hasError('required')) {
                  <div class="invalid-feedback">Work email is required.</div>
                } @else if (ctrl('email').hasError('invalidEmail')) {
                  <div class="invalid-feedback">Please enter a valid email address.</div>
                }
              }
            </div>

            <!-- Phone -->
            <div class="col-md-6">
              <label class="form-label fw-semibold">Phone Number <span class="text-danger">*</span></label>
              <div class="phone-input-group">
                <app-searchable-select
                  formControlName="phone_dial_code"
                  [options]="dialCodeOptions()"
                  [allowClear]="false"
                  placeholder="🌐"
                  class="dial-select" />
                <input type="tel" class="form-control phone-number-input"
                  formControlName="phone_number"
                  placeholder="7700 900000"
                  [class.is-invalid]="invalid('phone_number') || (submitted && ctrl('phone_number').hasError('phoneInvalid'))">
              </div>
              @if (ctrl('phone_number').touched && ctrl('phone_number').errors) {
                <div class="text-danger small mt-1">
                  @if (ctrl('phone_number').errors?.['required']) { Phone number is required. }
                  @else if (ctrl('phone_number').errors?.['phoneInvalid']) { {{ ctrl('phone_number').errors?.['phoneInvalid'] }} }
                </div>
              }
            </div>

            <!-- WhatsApp -->
            <div class="col-md-6">
              <label class="form-label fw-semibold">WhatsApp Number <span class="text-danger">*</span></label>
              <div class="phone-input-group">
                <app-searchable-select
                  formControlName="whatsapp_dial_code"
                  [options]="dialCodeOptions()"
                  [allowClear]="false"
                  placeholder="🌐"
                  class="dial-select"
                  [class.bg-light]="form.get('whatsapp_same_as_phone')?.value" />
                <input type="tel" class="form-control phone-number-input"
                  formControlName="whatsapp_number"
                  placeholder="7700 900000"
                  [class.bg-light]="form.get('whatsapp_same_as_phone')?.value"
                  [class.is-invalid]="invalid('whatsapp_number') || (submitted && ctrl('whatsapp_number').hasError('phoneInvalid'))"
                  [attr.readonly]="form.get('whatsapp_same_as_phone')?.value ? true : null">
              </div>
              <div class="form-check mt-1">
                <input class="form-check-input" type="checkbox"
                  formControlName="whatsapp_same_as_phone" id="whatsappSameAsPhone">
                <label class="form-check-label small text-muted" for="whatsappSameAsPhone">
                  Same as phone number
                </label>
              </div>
              @if (ctrl('whatsapp_number').touched && ctrl('whatsapp_number').errors) {
                <div class="text-danger small mt-1">
                  @if (ctrl('whatsapp_number').errors?.['required']) { WhatsApp number is required. }
                  @else if (ctrl('whatsapp_number').errors?.['phoneInvalid']) { {{ ctrl('whatsapp_number').errors?.['phoneInvalid'] }} }
                </div>
              }
            </div>

          </div>

          <!-- ── Section 2: Company Details ─────────────────────────── -->
          <h6 class="form-section-heading">
            <i class="bi bi-building me-2"></i>Company Details
          </h6>
          <div class="row g-3 mb-4">

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Name</label>
              <input formControlName="company_name" class="form-control"
                [class.is-invalid]="invalid('company_name')" placeholder="Acme Recruiting Ltd">
              @if (invalid('company_name')) {
                @if (ctrl('company_name').hasError('minlength')) {
                  <div class="text-danger mt-1" style="font-size:.875em">Company name must be at least 2 characters.</div>
                } @else if (ctrl('company_name').hasError('maxlength')) {
                  <div class="text-danger mt-1" style="font-size:.875em">Company name must be 150 characters or fewer.</div>
                }
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Website</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-globe"></i></span>
                <input formControlName="company_website" class="form-control"
                  [class.is-invalid]="invalid('company_website')" placeholder="https://example.com">
                @if (invalid('company_website')) {
                  <div class="invalid-feedback">Please enter a valid URL (e.g. https://example.com or www.example.com).</div>
                }
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
              <app-searchable-select
                formControlName="industry"
                [options]="INDUSTRY_OPTS"
                [allowClear]="true"
                placeholder="— Select industry —" />
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Size</label>
              <app-searchable-select
                formControlName="company_size"
                [options]="COMPANY_SIZE_OPTS"
                [allowClear]="true"
                placeholder="— Select size —" />
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
              <app-searchable-select
                formControlName="has_sponsor_licence"
                [options]="SPONSOR_LICENCE_OPTS"
                [allowClear]="true"
                placeholder="— Select —" />
            </div>

            @if (sponsorYes) {
              <div class="col-md-6">
                <label class="form-label fw-semibold">Licence Number <span class="text-danger">*</span></label>
                <input formControlName="sponsor_licence_number" class="form-control"
                  [class.is-invalid]="invalid('sponsor_licence_number')"
                  placeholder="e.g. 1Z3GF3C...">
                @if (invalid('sponsor_licence_number')) {
                  @if (ctrl('sponsor_licence_number').hasError('required')) {
                    <div class="text-danger mt-1" style="font-size:.875em">Licence number is required.</div>
                  } @else if (ctrl('sponsor_licence_number').hasError('minlength')) {
                    <div class="text-danger mt-1" style="font-size:.875em">Licence number must be at least 3 characters.</div>
                  } @else if (ctrl('sponsor_licence_number').hasError('maxlength')) {
                    <div class="text-danger mt-1" style="font-size:.875em">Licence number must be 100 characters or fewer.</div>
                  }
                }
                <div class="form-text">Verifiable via official government registry</div>
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
                <app-searchable-select
                  formControlName="licence_rating"
                  [options]="LICENCE_RATING_OPTS"
                  [allowClear]="true"
                  placeholder="— Select rating —" />
                @if (licenceRatingA) {
                  <div class="form-text text-success fw-semibold">
                    <i class="bi bi-check-circle-fill me-1"></i>A-Rating — valid for approvals
                  </div>
                }
                @if (licenceRatingB) {
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
                <div class="form-text">Admin confirms after official government verification.</div>
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
              <app-searchable-select
                formControlName="hires_per_year"
                [options]="HIRES_PER_YEAR_OPTS"
                [allowClear]="true"
                placeholder="— Select —" />
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
                  class="form-control"
                  placeholder="Min 8 chars, upper + lower + number"
                  [class.is-invalid]="ctrl('password').invalid && ctrl('password').touched">
                <button type="button" class="btn btn-outline-secondary" (click)="showPw = !showPw"
                  [attr.aria-label]="showPw ? 'Hide password' : 'Show password'">
                  <i class="bi" [class.bi-eye]="!showPw" [class.bi-eye-slash]="showPw"></i>
                </button>
              </div>
              @if (ctrl('password').touched) {
                @if (ctrl('password').errors?.['required']) {
                  <div class="text-danger mt-1" style="font-size:.875em">Password is required.</div>
                } @else if (ctrl('password').errors?.['minlength']) {
                  <div class="text-danger mt-1" style="font-size:.875em">Minimum 8 characters required.</div>
                } @else if (ctrl('password').errors?.['pattern']) {
                  <div class="text-danger mt-1" style="font-size:.875em">Must include uppercase, lowercase, and a number.</div>
                }
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Account Status</label>
              <app-searchable-select
                formControlName="account_status"
                [options]="ACCOUNT_STATUS_OPTS"
                [allowClear]="false"
                placeholder="Select status" />
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
                <div style="min-width:140px;flex-shrink:0">
                  <app-searchable-select
                    formControlName="duration_unit"
                    [options]="DURATION_UNIT_OPTS"
                    [allowClear]="false"
                    [invalid]="submitted && form.hasError('durationRequired')"
                    placeholder="— Unit —" />
                </div>
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

            <div class="col-md-6">
              <label class="form-label fw-semibold d-block">Enable Translation</label>
              <div class="d-flex align-items-center gap-3 mt-1">
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" role="switch"
                    formControlName="enable_translation" id="enableTranslationToggle"
                    style="width:2.5rem;height:1.25rem">
                  <label class="form-check-label ms-2 fw-semibold" for="enableTranslationToggle"
                    [style.color]="form.get('enable_translation')?.value ? 'var(--bs-success)' : 'var(--bs-secondary)'">
                    {{ form.get('enable_translation')?.value ? 'Translation Enabled' : 'Translation Disabled' }}
                  </label>
                </div>
              </div>
              <div class="form-text text-muted mt-1">Allow this recruiter to translate candidate profiles.</div>
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

              <label class="d-flex align-items-center gap-3 px-3 py-3 mb-0"
                style="cursor:pointer;border-bottom:1px solid var(--th-border);transition:background .15s"
                [style.background]="form.get('verify_de_licence')?.value ? 'var(--bs-success-bg-subtle)' : 'var(--th-surface-raised)'">
                <input type="checkbox" class="form-check-input flex-shrink-0 mb-0"
                  formControlName="verify_de_licence" style="width:1.1rem;height:1.1rem">
                <i class="bi bi-patch-check fs-5"
                  [style.color]="form.get('verify_de_licence')?.value ? 'var(--bs-success)' : 'var(--th-muted)'"></i>
                <span class="flex-grow-1" style="font-size:.9rem">
                  <strong>Sponsor Licence verified on official registry</strong> — A-Rating confirmed
                </span>
                @if (form.get('verify_de_licence')?.value) {
                  <i class="bi bi-check-circle-fill text-success fs-5"></i>
                }
              </label>

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
export class RecruiterCreateComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  form!: FormGroup;
  submitting    = false;
  submitted     = false;
  error         = '';
  success       = false;
  createdRecruiterNumber = '';
  createdContactName     = '';
  createdCompanyName     = '';
  createdWhatsApp        = false;
  showPw        = false;
  draftSaved    = false;
  draftRestored = false;
  private _submitSuccess = false;
  private draftSub?: Subscription;

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

  dialCodeOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({
      value: c.dial_code,
      label: `${c.flag_emoji} ${c.dial_code}`,
      sublabel: c.name,
    }))
  );

  // ── Static option arrays ────────────────────────────────────────────────────
  readonly RECRUITER_TYPE_OPTS: SelectOption[] = [
    { value: 'direct_employer',    label: 'Direct Employer' },
    { value: 'recruitment_agency', label: 'Recruitment Agency' },
  ];

  readonly INDUSTRY_OPTS: SelectOption[] = [
    { value: 'Healthcare',   label: 'Healthcare' },
    { value: 'IT',           label: 'IT' },
    { value: 'Engineering',  label: 'Engineering' },
    { value: 'Care',         label: 'Care' },
    { value: 'Education',    label: 'Education' },
    { value: 'Hospitality',  label: 'Hospitality' },
    { value: 'Construction', label: 'Construction' },
    { value: 'Finance',      label: 'Finance' },
    { value: 'Other',        label: 'Other' },
  ];

  readonly COMPANY_SIZE_OPTS: SelectOption[] = [
    { value: '1-10',    label: '1–10 employees' },
    { value: '11-50',   label: '11–50 employees' },
    { value: '51-200',  label: '51–200 employees' },
    { value: '201-500', label: '201–500 employees' },
    { value: '500+',    label: '500+ employees' },
  ];

  readonly SPONSOR_LICENCE_OPTS: SelectOption[] = [
    { value: 'yes',     label: 'Yes' },
    { value: 'no',      label: 'No' },
    { value: 'applied', label: 'Applied' },
    { value: 'unknown', label: 'Unknown' },
  ];

  readonly LICENCE_RATING_OPTS: SelectOption[] = [
    { value: 'A-Rating',       label: 'A-Rating' },
    { value: 'B-Rating',       label: 'B-Rating' },
    { value: 'Not Applicable', label: 'Not Applicable' },
  ];

  readonly HIRES_PER_YEAR_OPTS: SelectOption[] = [
    { value: '1-5',   label: '1–5' },
    { value: '6-20',  label: '6–20' },
    { value: '21-50', label: '21–50' },
    { value: '50+',   label: '50+' },
  ];

  readonly ACCOUNT_STATUS_OPTS: SelectOption[] = [
    { value: 'active',    label: 'Active' },
    { value: 'pending',   label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
  ];

  readonly DURATION_UNIT_OPTS: SelectOption[] = [
    { value: 'hours',  label: 'Hours' },
    { value: 'days',   label: 'Days' },
    { value: 'weeks',  label: 'Weeks' },
    { value: 'months', label: 'Months' },
    { value: 'years',  label: 'Years' },
  ];

  readonly industryChipOpts: ChipOption[] = [
    { value: 'Healthcare',   label: 'Healthcare' },
    { value: 'IT',           label: 'IT' },
    { value: 'Engineering',  label: 'Engineering' },
    { value: 'Care',         label: 'Care' },
    { value: 'Education',    label: 'Education' },
    { value: 'Hospitality',  label: 'Hospitality' },
    { value: 'Construction', label: 'Construction' },
    { value: 'Finance',      label: 'Finance' },
    { value: 'Other',        label: 'Other' },
  ];

  readonly sponsorCountryOpts: ChipOption[] = [
    { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
    { value: 'Germany',        label: '🇩🇪 Germany' },
    { value: 'Netherlands',    label: '🇳🇱 Netherlands' },
    { value: 'Canada',         label: '🇨🇦 Canada' },
    { value: 'Australia',      label: '🇦🇺 Australia' },
  ];

  readonly jobTypeOpts: ChipOption[] = [
    { value: 'Full Time',  label: 'Full Time' },
    { value: 'Part Time',  label: 'Part Time' },
    { value: 'Contract',   label: 'Contract' },
    { value: 'Internship', label: 'Internship' },
  ];

  constructor(
    private fb: FormBuilder,
    private recruiterService: RecruiterService,
    private router: Router,
    private master: MasterDataService,
    private auth: AuthService,
    private toast: ToastService,
  ) {
    this.form = this.fb.group({
      // Section 1: Contact
      contact_name:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-\.]+$/)]],
      contact_job_title: ['', [Validators.minLength(2), Validators.maxLength(100)]],
      type:              ['direct_employer'],
      email:             ['', [Validators.required, emailValidator()]],
      phone_dial_code:      ['+44'],
      phone_number:         ['', Validators.required],
      whatsapp_dial_code:   ['+44'],
      whatsapp_number:      ['', Validators.required],
      whatsapp_same_as_phone: [false],
      // Section 2: Company
      company_name:      ['', [Validators.minLength(2), Validators.maxLength(150)]],
      company_website:   ['', [websiteValidator()]],
      company_country:   [null],
      company_city:      [null],
      industry:          [null],
      company_size:      [null],
      // Section 4: Sponsor Licence
      has_sponsor_licence:       [null],
      sponsor_licence_number:    [''],
      sponsor_licence_countries: [[]],
      licence_rating:            [null],
      licence_verified:          [false],
      // Section 3a: Agency-only (also used in Hiring Preferences)
      sectors_recruit_for:  [[]],
      countries_place_in:   [[]],
      // Section 5: Hiring Preferences
      target_nationalities: [[]],
      hires_per_year:       [null],
      job_types:            [[]],
      // Section 6: Account Setup
      password:           ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],
      account_status:     ['active'],
      access_start_date:  [''],
      duration_value:     [null as number | null],
      duration_unit:      [null],
      free_account:       [false],
      enable_translation: [false],
      // Section 7: Notes
      admin_notes: [''],
      // Section 8: Verification checklist (not sent to backend)
      verify_de_website:  [false],
      verify_de_licence:  [false],
      verify_de_linkedin: [false],
      verify_de_briefed:  [false],
      verify_ra_website:  [false],
      verify_ra_ch:       [false],
      verify_ra_rec:      [false],
      verify_ra_sponsor:  [false],
      verify_ra_linkedin: [false],
      verify_ra_briefed:  [false],
    }, {
      validators: [
        durationRequiredValidator,
        makePhoneGroupValidator('phone_dial_code', 'phone_number'),
        makePhoneGroupValidator('whatsapp_dial_code', 'whatsapp_number'),
      ],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.master.loadAll();

    // Cascade: company country → load company cities
    this.form.get('company_country')!.valueChanges.subscribe(v => this.onCompanyCountryChange(v));

    // Sponsor licence conditional: licence number becomes required when 'yes'
    this.form.get('has_sponsor_licence')!.valueChanges.subscribe((v: string | null) => {
      const licCtrl = this.ctrl('sponsor_licence_number');
      if (v === 'yes') {
        licCtrl.addValidators([Validators.required, Validators.minLength(3), Validators.maxLength(100)]);
      } else {
        licCtrl.clearValidators();
      }
      licCtrl.updateValueAndValidity();
    });

    // Recruiter type change → reset verification checklist
    this.form.get('type')!.valueChanges.subscribe(() => this.onTypeChange());

    // WhatsApp "same as phone" — sync both dial code AND number
    this.form.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        const raw = this.form.getRawValue();
        this.form.patchValue({
          whatsapp_dial_code: raw.phone_dial_code || '+44',
          whatsapp_number:    raw.phone_number    || '',
        }, { emitEvent: false });
        this.ctrl('whatsapp_number').updateValueAndValidity();
      }
    });

    this.form.get('phone_number')!.valueChanges.subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form.getRawValue();
        this.form.patchValue({
          whatsapp_dial_code: raw.phone_dial_code || '+44',
          whatsapp_number:    raw.phone_number    || '',
        }, { emitEvent: false });
      }
    });

    this.form.get('phone_dial_code')!.valueChanges.subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_dial_code: raw.phone_dial_code }, { emitEvent: false });
      }
    });

    this.restoreDraft();

    this.draftSub = this.form.valueChanges.pipe(debounceTime(800)).subscribe(() => {
      this.saveDraft();
    });
  }

  ngOnDestroy(): void {
    this.draftSub?.unsubscribe();
    // Flush any pending draft on navigation/destroy — skip if form was successfully submitted
    if (!this._submitSuccess && this.isDirty()) this.saveDraft();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this._submitSuccess && this.isDirty()) {
      this.saveDraft();
      event.preventDefault();
    }
  }

  isDirty(): boolean {
    return this.form?.dirty ?? false;
  }

  // ── Draft helpers ──────────────────────────────────────────────────────────
  private get _draftKey(): string {
    return `th_recruiter_draft_${this.auth.currentUser()?.id ?? 'anon'}`;
  }

  private saveDraft(): void {
    try {
      const raw = this.form.getRawValue();
      localStorage.setItem(this._draftKey, JSON.stringify(raw));
      this.draftSaved = true;
      setTimeout(() => (this.draftSaved = false), 3000);
    } catch { /* storage full */ }
  }

  private restoreDraft(): void {
    try {
      const stored = localStorage.getItem(this._draftKey);
      if (!stored) return;
      const draft = JSON.parse(stored);
      // Only restore non-sensitive scalar fields; skip verification checkboxes and password
      const skip = new Set([
        'password',
        'verify_de_website','verify_de_licence','verify_de_linkedin','verify_de_briefed',
        'verify_ra_website','verify_ra_ch','verify_ra_rec','verify_ra_sponsor','verify_ra_linkedin','verify_ra_briefed',
      ]);
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(draft)) {
        if (!skip.has(k) && v !== undefined && v !== null && v !== '') patch[k] = v;
      }
      this.form.patchValue(patch, { emitEvent: false });
      this.draftRestored = true;
    } catch { /* corrupted */ }
  }

  private clearDraft(): void { localStorage.removeItem(this._draftKey); }

  dismissDraftBanner(): void { this.draftRestored = false; }

  onCompanyCountryChange(countryName: string | null): void {
    this.form.patchValue({ company_city: null }, { emitEvent: false });
    if (!countryName) { this.master.cities.set([]); return; }
    const country = this.master.countries().find(c => c.name === String(countryName));
    if (country) this.master.loadCities(country.id);
  }

  // ── Getters ────────────────────────────────────────────────────────────────
  ctrl(name: string) { return this.form.get(name)!; }

  get sponsorYes(): boolean {
    return this.form.get('has_sponsor_licence')?.value === 'yes';
  }

  get isAgency(): boolean {
    return this.form.get('type')?.value === 'recruitment_agency';
  }

  get licenceRatingA(): boolean {
    return this.form.get('licence_rating')?.value === 'A-Rating';
  }

  get licenceRatingB(): boolean {
    return this.form.get('licence_rating')?.value === 'B-Rating';
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

  get expiryPreview(): string {
    const val  = this.form.get('duration_value')?.value;
    const unit = this.form.get('duration_unit')?.value;
    if (!val || !unit || val < 1) return '';
    return this.computeExpiry(val, unit).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
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

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.allChecked) return;
    this.submitting = true;
    this.error = '';

    const v = this.form.value;
    const phone        = `${v.phone_dial_code}${v.phone_number}`;
    const whatsapp     = v.whatsapp_same_as_phone ? phone : `${v.whatsapp_dial_code}${v.whatsapp_number}`;
    const accessExpiresAt = this.computeExpiry(v.duration_value, v.duration_unit).toISOString();

    this.recruiterService.create({
      email:             v.email,
      contact_name:      v.contact_name,
      type:              v.type || 'direct_employer',
      contact_job_title: v.contact_job_title || undefined,
      phone:             phone || undefined,
      whatsapp_number:   whatsapp || undefined,
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
      enable_translation:        v.enable_translation ?? false,
      admin_notes:               v.admin_notes || undefined,
      password:                  v.password,
      access_expires_at:         accessExpiresAt,
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        this.createdRecruiterNumber = res.recruiter?.recruiter_number ?? '';
        this.createdContactName     = res.recruiter?.contact_name     ?? 'Recruiter';
        this.createdCompanyName     = (res.recruiter as any)?.company_name ?? '';
        this.createdWhatsApp        = !!(res.recruiter as any)?.whatsapp_number;
        this.success = true;
        this.clearDraft();
        this.form.markAsPristine();   // Clear dirty state so the route guard allows navigation
        this._submitSuccess = true;   // Prevent ngOnDestroy/beforeunload from re-saving draft
        this.draftSub?.unsubscribe(); // Stop auto-save during the redirect delay
        this.draftRestored = false;   // Dismiss the draft-restored banner if visible

        const name    = this.createdContactName;
        const company = this.createdCompanyName ? ` from ${this.createdCompanyName}` : '';
        this.toast.success(`${name}${company} created successfully`);

        setTimeout(() => this.router.navigate(['/admin/recruiters']), 2000);
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
    this.createdContactName     = '';
    this.createdCompanyName     = '';
    this.createdWhatsApp        = false;
    this.master.cities.set([]);
    this.form.reset({
      contact_name: '', contact_job_title: '', type: 'direct_employer',
      email: '',
      phone_dial_code: '+44', phone_number: '',
      whatsapp_dial_code: '+44', whatsapp_number: '', whatsapp_same_as_phone: false,
      company_name: '', company_website: '', company_country: null, company_city: null,
      industry: null, company_size: null,
      has_sponsor_licence: null, sponsor_licence_number: '', sponsor_licence_countries: [],
      licence_rating: null, licence_verified: false,
      sectors_recruit_for: [], countries_place_in: [],
      target_nationalities: [], hires_per_year: null, job_types: [],
      password: '', account_status: 'active', access_start_date: '',
      duration_value: null, duration_unit: null,
      free_account: false, admin_notes: '',
      verify_de_website: false, verify_de_licence: false,
      verify_de_linkedin: false, verify_de_briefed: false,
      verify_ra_website: false, verify_ra_ch: false,
      verify_ra_rec: false, verify_ra_sponsor: false,
      verify_ra_linkedin: false, verify_ra_briefed: false,
    });
  }
}

