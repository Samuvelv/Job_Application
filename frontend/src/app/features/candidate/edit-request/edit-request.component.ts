// src/app/features/candidate/edit-request/edit-request.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CandidateService } from '../../../core/services/candidate.service';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { Candidate } from '../../../core/models/candidate.model';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { EMPLOYMENT_STATUS_OPTIONS, VISA_STATUS_OPTIONS, REASON_FOR_LEAVING_OPTIONS } from '../../../core/constants/candidate-options';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

// ── Validators ─────────────────────────────────────────────────────────────

function skillGroupValidator(g: AbstractControl): ValidationErrors | null {
  const name = g.get('skill_name')?.value?.trim();
  const prof = g.get('proficiency')?.value;
  if (name && !prof) { g.get('proficiency')!.setErrors({ required: true }); return { proficiencyRequired: true }; }
  if (!name || prof)  { const e = g.get('proficiency')!.errors; if (e?.['required']) { g.get('proficiency')!.setErrors(null); } }
  return null;
}

function langGroupValidator(g: AbstractControl): ValidationErrors | null {
  const name = g.get('language')?.value?.trim();
  const prof = g.get('proficiency')?.value;
  if (name && !prof) { g.get('proficiency')!.setErrors({ required: true }); return { proficiencyRequired: true }; }
  if (!name || prof)  { const e = g.get('proficiency')!.errors; if (e?.['required']) { g.get('proficiency')!.setErrors(null); } }
  return null;
}

function linkedInValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^https?:\/\/(www\.)?linkedin\.com\/(in|company|pub|school)\/[a-zA-Z0-9\-_%]+\/?/.test(v);
    return ok ? null : { invalidLinkedIn: true };
  };
}

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
function getPhoneRule(dialCode: string): PhoneRule { return PHONE_RULES[dialCode] ?? PHONE_FALLBACK; }

function dobValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = ctrl.value;
    if (!v) return null;
    const date = new Date(v);
    if (isNaN(date.getTime())) return { invalidDate: true };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date >= today) return { futureDate: true };
    const age = today.getFullYear() - date.getFullYear()
      - (today < new Date(today.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0);
    if (age < 16) return { tooYoung: true };
    if (age > 100) return { tooOld: true };
    return null;
  };
}

function makePhoneGroupValidator(dialCtrl: string, numCtrl: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const dial = group.get(dialCtrl)?.value as string || '';
    const num  = (group.get(numCtrl)?.value as string || '').replace(/\s+/g, '');
    const numControl = group.get(numCtrl);
    if (!numControl) return null;
    if (!num) {
      const cur = numControl.errors;
      if (cur?.['phoneInvalid']) { const { phoneInvalid: _, ...rest } = cur; numControl.setErrors(Object.keys(rest).length ? rest : null); }
      return null;
    }
    const rule = getPhoneRule(dial);
    const ok = /^\d+$/.test(num) && num.length >= rule.minLen && num.length <= rule.maxLen && (rule.pattern ? rule.pattern.test(num) : true);
    if (!ok) {
      numControl.setErrors({ ...(numControl.errors || {}), phoneInvalid: `Invalid number for ${dial}. Expected: ${rule.hint}.` });
      return { phoneInvalid: true };
    }
    const cur = numControl.errors;
    if (cur?.['phoneInvalid']) { const { phoneInvalid: _, ...rest } = cur; numControl.setErrors(Object.keys(rest).length ? rest : null); }
    return null;
  };
}

function eduYearValidator(minYear: number, maxYear: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = ctrl.value;
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n)) return { eduYearInvalid: 'Must be a whole number.' };
    if (String(v).replace('-', '').length !== 4) return { eduYearInvalid: 'Must be a 4-digit year.' };
    if (n < minYear) return { eduYearInvalid: `Year must be ${minYear} or later.` };
    if (n > maxYear) return { eduYearInvalid: `Year must be ${maxYear} or earlier.` };
    return null;
  };
}

function eduEndYearGroupValidator(g: AbstractControl): ValidationErrors | null {
  const start      = Number(g.get('start_year')?.value);
  const end        = Number(g.get('end_year')?.value);
  const startMonth = Number(g.get('start_month')?.value);
  const endMonth   = Number(g.get('end_month')?.value);
  const endCtrl = g.get('end_year');
  if (!endCtrl) return null;
  if (!g.get('start_year')?.value || !g.get('end_year')?.value) {
    const cur = endCtrl.errors;
    if (cur?.['endBeforeStart']) { const { endBeforeStart: _, ...rest } = cur; endCtrl.setErrors(Object.keys(rest).length ? rest : null); }
    return null;
  }
  if (end < start || (end === start && endMonth < startMonth)) {
    endCtrl.setErrors({ ...(endCtrl.errors || {}), endBeforeStart: true });
    return { endBeforeStart: true };
  }
  const cur = endCtrl.errors;
  if (cur?.['endBeforeStart']) { const { endBeforeStart: _, ...rest } = cur; endCtrl.setErrors(Object.keys(rest).length ? rest : null); }
  return null;
}

interface PostalRule { pattern: RegExp; hint: string; }
const POSTAL_CODE_RULES: Record<string, PostalRule> = {
  'India':          { pattern: /^\d{6}$/,                                hint: '6-digit PIN code (e.g. 400001)' },
  'United States':  { pattern: /^\d{5}(-\d{4})?$/,                      hint: '5-digit ZIP or ZIP+4 (e.g. 94105)' },
  'United Kingdom': { pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, hint: 'UK postcode (e.g. SW1A 1AA)' },
  'Canada':         { pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,           hint: 'Canadian postal code (e.g. K1A 0A9)' },
  'Australia':      { pattern: /^\d{4}$/,                                hint: '4-digit postcode (e.g. 2000)' },
  'Germany':        { pattern: /^\d{5}$/,                                hint: '5-digit PLZ (e.g. 10115)' },
  'France':         { pattern: /^\d{5}$/,                                hint: '5-digit code (e.g. 75001)' },
  'South Africa':   { pattern: /^\d{4}$/,                                hint: '4-digit code (e.g. 2000)' },
  'Nigeria':        { pattern: /^\d{6}$/,                                hint: '6-digit postal code' },
  'Kenya':          { pattern: /^\d{5}$/,                                hint: '5-digit postal code' },
  'Pakistan':       { pattern: /^\d{5}$/,                                hint: '5-digit postal code' },
  'Bangladesh':     { pattern: /^\d{4}$/,                                hint: '4-digit postal code' },
  'Singapore':      { pattern: /^\d{6}$/,                                hint: '6-digit postal code (e.g. 018956)' },
  'Netherlands':    { pattern: /^\d{4}\s?[A-Z]{2}$/i,                   hint: 'Dutch postcode (e.g. 1234 AB)' },
  'Brazil':         { pattern: /^\d{5}-?\d{3}$/,                         hint: 'Brazilian CEP (e.g. 01310-100)' },
  'China':          { pattern: /^\d{6}$/,                                hint: '6-digit postal code' },
  'Japan':          { pattern: /^\d{3}-?\d{4}$/,                         hint: 'Japanese postcode (e.g. 100-0001)' },
  'New Zealand':    { pattern: /^\d{4}$/,                                hint: '4-digit postcode' },
  'Ireland':        { pattern: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i,           hint: 'Eircode (e.g. D02 AF30)' },
};
const POSTAL_FALLBACK: PostalRule = { pattern: /^[a-zA-Z0-9\s\-]{3,10}$/, hint: '3–10 alphanumeric characters' };
const NO_FORMAT_COUNTRIES = ['United Arab Emirates', 'Hong Kong', 'Macau'];

function makePostalCodeGroupValidator(countryCtrl: string, postalCtrl: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const country = (group.get(countryCtrl)?.value as string || '').trim();
    const postal  = (group.get(postalCtrl)?.value  as string || '').trim();
    const posCtrl = group.get(postalCtrl);
    if (!posCtrl) return null;
    if (!postal) {
      const cur = posCtrl.errors;
      if (cur?.['postalCodeInvalid']) { const { postalCodeInvalid: _, ...rest } = cur; posCtrl.setErrors(Object.keys(rest).length ? rest : null); }
      return null;
    }
    if (NO_FORMAT_COUNTRIES.includes(country)) {
      const cur = posCtrl.errors;
      if (cur?.['postalCodeInvalid']) { const { postalCodeInvalid: _, ...rest } = cur; posCtrl.setErrors(Object.keys(rest).length ? rest : null); }
      return null;
    }
    const rule = POSTAL_CODE_RULES[country] ?? POSTAL_FALLBACK;
    if (!rule.pattern.test(postal)) {
      posCtrl.setErrors({ ...(posCtrl.errors || {}), postalCodeInvalid: rule.hint });
      return { postalCodeInvalid: true };
    }
    const cur = posCtrl.errors;
    if (cur?.['postalCodeInvalid']) { const { postalCodeInvalid: _, ...rest } = cur; posCtrl.setErrors(Object.keys(rest).length ? rest : null); }
    return null;
  };
}

@Component({
  selector: 'app-edit-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, SearchableSelectComponent, ChipMultiSelectComponent],
  template: `
    <app-page-header
      title="Request Profile Edit"
      subtitle="Submit changes for admin review. Your profile will be updated once approved."
      icon="bi-pencil-square"
    />

    <!-- Existing request status banner -->
    @if (existingRequest) {
      <div class="status-banner mb-4"
        [class.status-banner--pending]="existingRequest.status === 'pending'"
        [class.status-banner--approved]="existingRequest.status === 'approved'"
        [class.status-banner--rejected]="existingRequest.status === 'rejected'">
        <div class="status-banner__icon">
          @if (existingRequest.status === 'pending')  { <i class="bi bi-hourglass-split"></i> }
          @if (existingRequest.status === 'approved') { <i class="bi bi-check-circle"></i> }
          @if (existingRequest.status === 'rejected') { <i class="bi bi-x-circle"></i> }
        </div>
        <div class="status-banner__body">
          <div class="status-banner__title">
            @if (existingRequest.status === 'pending')  { Pending Review }
            @if (existingRequest.status === 'approved') { Approved }
            @if (existingRequest.status === 'rejected') { Rejected }
          </div>
          <div class="status-banner__text">
            Submitted {{ existingRequest.created_at | date:'dd MMM yyyy' }}
            @if (existingRequest.reviewed_at) {
              · reviewed {{ existingRequest.reviewed_at | date:'dd MMM yyyy' }}
            }
          </div>
          @if (existingRequest.admin_note) {
            <div class="mt-1 small"><strong>Admin note:</strong> {{ existingRequest.admin_note }}</div>
          }
          @if (existingRequest.status === 'pending') {
            <div class="mt-2 small text-muted">You cannot submit a new request while one is pending.</div>
          }
        </div>
      </div>
    }

    @if (loadingProfile) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
      </div>
    } @else if (candidate && form) {

      <!-- ══ Section: Media ════════════════════════════════════════════════ -->
      <div class="form-card mb-4">
        <h5 class="card-section-header card-section-header--warning mb-1">
          <i class="bi bi-images"></i> Media &amp; Documents
        </h5>
        <p class="text-muted small mb-4">
          <i class="bi bi-shield-lock-fill text-warning me-1"></i>
          Media changes require admin approval — select a new file to stage it for review.
        </p>

        <div class="row g-4">

          <!-- Profile Photo -->
          <div class="col-md-4">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-person-circle me-1"></i> Profile Photo
              </div>
              <div class="media-upload-cell__preview">
                @if (staged['profiles'] || candidate.profile_photo_url) {
                  <img [src]="staged['profiles'] ?? candidate.profile_photo_url"
                    alt="Profile photo" class="media-upload-cell__img"
                    (error)="$any($event.target).style.display='none'">
                  @if (staged['profiles']) {
                    <div class="media-upload-cell__staged-badge">
                      <i class="bi bi-clock-fill me-1"></i>Pending approval
                    </div>
                  }
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('image', (staged['profiles'] ?? candidate.profile_photo_url)!, 'Profile Photo')"
                      title="Preview">
                      <i class="bi bi-eye"></i>
                    </button>
                    @if (staged['profiles']) {
                      <button type="button"
                        class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                        (click)="clearStaged('profiles')" title="Cancel staged change">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-person-circle"></i>
                    <span>No photo</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['profiles'] || existingRequest?.status === 'pending'">
                @if (mediaLoading['profiles']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Staging…
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ staged['profiles'] ? 'Change staged file' : (candidate.profile_photo_url ? 'Request replace' : 'Request upload') }}
                }
                <input type="file" class="d-none" accept="image/jpeg,image/png,image/webp"
                  [disabled]="existingRequest?.status === 'pending'"
                  (change)="stageFile('profiles', $event)">
              </label>
              <div class="form-text text-muted mt-2">
                <i class="bi bi-info-circle me-1"></i>Please upload a clear, professional photo. Face should be clearly visible. Plain background preferred.
              </div>
            </div>
          </div>

          <!-- Resume / CV -->
          <div class="col-md-4">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-file-earmark-person me-1"></i> Resume / CV
              </div>
              <div class="media-upload-cell__preview">
                @if (staged['resumes'] || candidate.resume_url) {
                  <div class="media-upload-cell__doc-card">
                    <i class="bi bi-file-earmark-pdf-fill"
                      style="font-size:2rem;color:var(--th-rose)"></i>
                    <span class="media-upload-cell__doc-name">
                      {{ staged['resumes'] ? 'New CV staged' : 'CV uploaded' }}
                    </span>
                  </div>
                  @if (staged['resumes']) {
                    <div class="media-upload-cell__staged-badge">
                      <i class="bi bi-clock-fill me-1"></i>Pending approval
                    </div>
                  }
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('pdf', (staged['resumes'] ?? candidate.resume_url)!, 'Resume / CV')"
                      title="Preview">
                      <i class="bi bi-eye"></i>
                    </button>
                    @if (staged['resumes']) {
                      <button type="button"
                        class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                        (click)="clearStaged('resumes')" title="Cancel staged change">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-file-earmark-person"></i>
                    <span>No CV uploaded</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['resumes'] || existingRequest?.status === 'pending'">
                @if (mediaLoading['resumes']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Staging…
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ staged['resumes'] ? 'Change staged file' : (candidate.resume_url ? 'Request replace' : 'Request upload') }}
                }
                <input type="file" class="d-none" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  [disabled]="existingRequest?.status === 'pending'"
                  (change)="stageFile('resumes', $event)">
              </label>
            </div>
          </div>

          <!-- Intro Video -->
          <div class="col-md-4">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-camera-video me-1"></i> Intro Video
              </div>
              <div class="media-upload-cell__preview">
                @if (staged['videos'] || candidate.intro_video_url) {
                  <div class="media-upload-cell__doc-card">
                    <i class="bi bi-camera-video-fill"
                      style="font-size:2rem;color:var(--th-primary)"></i>
                    <span class="media-upload-cell__doc-name">
                      {{ staged['videos'] ? 'New video staged' : 'Video uploaded' }}
                    </span>
                  </div>
                  @if (staged['videos']) {
                    <div class="media-upload-cell__staged-badge">
                      <i class="bi bi-clock-fill me-1"></i>Pending approval
                    </div>
                  }
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('video', (staged['videos'] ?? candidate.intro_video_url)!, 'Intro Video')"
                      title="Preview">
                      <i class="bi bi-eye"></i>
                    </button>
                    @if (staged['videos']) {
                      <button type="button"
                        class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                        (click)="clearStaged('videos')" title="Cancel staged change">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-camera-video"></i>
                    <span>No video uploaded</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['videos'] || existingRequest?.status === 'pending'">
                @if (mediaLoading['videos']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Staging…
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ staged['videos'] ? 'Change staged file' : (candidate.intro_video_url ? 'Request replace' : 'Request upload') }}
                }
                <input type="file" class="d-none" accept="video/mp4,video/webm,video/quicktime"
                  [disabled]="existingRequest?.status === 'pending'"
                  (change)="stageFile('videos', $event)">
              </label>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ Profile fields form ════════════════════════════════════════════ -->
      <form [formGroup]="form" (ngSubmit)="submit()">

        <!-- ── Personal ───────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header"><i class="bi bi-person"></i> Personal Information</h5>
          <div class="row g-3">

            <!-- First Name -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">First Name <span class="text-danger">*</span></label>
              <input formControlName="first_name" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('first_name')?.invalid && form!.get('first_name')?.touched">
              @if (form!.get('first_name')?.touched && form!.get('first_name')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('first_name')?.errors?.['required'])       { First name is required. }
                  @else if (form!.get('first_name')?.errors?.['minlength']) { Minimum 3 characters required. }
                  @else if (form!.get('first_name')?.errors?.['maxlength']) { Maximum 100 characters allowed. }
                  @else if (form!.get('first_name')?.errors?.['pattern'])   { Only letters, spaces, hyphens and apostrophes are allowed. }
                </div>
              }
            </div>

            <!-- Last Name -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Last Name <span class="text-danger">*</span></label>
              <input formControlName="last_name" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('last_name')?.invalid && form!.get('last_name')?.touched">
              @if (form!.get('last_name')?.touched && form!.get('last_name')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('last_name')?.errors?.['required'])       { Last name is required. }
                  @else if (form!.get('last_name')?.errors?.['minlength']) { Minimum 3 characters required. }
                  @else if (form!.get('last_name')?.errors?.['maxlength']) { Maximum 100 characters allowed. }
                  @else if (form!.get('last_name')?.errors?.['pattern'])   { Only letters, spaces, hyphens and apostrophes are allowed. }
                </div>
              }
            </div>

            <!-- Date of Birth -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Date of Birth <span class="text-danger">*</span></label>
              <input formControlName="date_of_birth" type="date" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('date_of_birth')?.invalid && form!.get('date_of_birth')?.touched"
                [max]="(currentYear - 16) + '-12-31'"
                [min]="(currentYear - 100) + '-01-01'">
              @if (form!.get('date_of_birth')?.touched && form!.get('date_of_birth')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('date_of_birth')?.errors?.['required'])    { Date of birth is required. }
                  @else if (form!.get('date_of_birth')?.errors?.['invalidDate'])  { Please enter a valid date. }
                  @else if (form!.get('date_of_birth')?.errors?.['futureDate'])   { Date of birth cannot be in the future. }
                  @else if (form!.get('date_of_birth')?.errors?.['tooYoung'])     { Must be at least 16 years old. }
                  @else if (form!.get('date_of_birth')?.errors?.['tooOld'])       { Please enter a valid date of birth. }
                </div>
              }
            </div>

            <!-- Gender -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Gender <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="gender"
                [options]="genderOptions"
                placeholder="Select gender…"
                [allowClear]="true"
                [invalid]="!!(form!.get('gender')?.invalid && form!.get('gender')?.touched)">
              </app-searchable-select>
              @if (form!.get('gender')?.invalid && form!.get('gender')?.touched) {
                <div class="text-danger small mt-1">Gender is required.</div>
              }
            </div>

            <!-- Marital Status -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Marital Status</label>
              <app-searchable-select
                formControlName="marital_status"
                [options]="maritalStatusOptions"
                placeholder="Select status…"
                [allowClear]="true">
              </app-searchable-select>
            </div>

            <!-- Phone -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Phone <span class="text-danger">*</span></label>
              <div class="phone-input-group">
                <app-searchable-select
                  formControlName="phone_dial_code"
                  [options]="dialCodeOptions()"
                  placeholder="🌐"
                  class="dial-select">
                </app-searchable-select>
                <input formControlName="phone_number" class="form-control form-control-sm phone-number-input"
                  placeholder="e.g. 9876543210"
                  [class.is-invalid]="form!.get('phone_number')?.invalid && form!.get('phone_number')?.touched">
              </div>
              @if (form!.get('phone_number')?.touched && form!.get('phone_number')?.errors) {
                <div class="text-danger small mt-1">
                  @if (form!.get('phone_number')?.errors?.['required'])         { Phone number is required. }
                  @else if (form!.get('phone_number')?.errors?.['phoneInvalid']) { {{ form!.get('phone_number')?.errors?.['phoneInvalid'] }} }
                </div>
              }
            </div>

            <!-- WhatsApp -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">WhatsApp <span class="text-danger">*</span></label>
              <div class="phone-input-group">
                <app-searchable-select
                  formControlName="whatsapp_dial_code"
                  [options]="dialCodeOptions()"
                  placeholder="🌐"
                  class="dial-select"
                  [class.bg-light]="form!.get('whatsapp_same_as_phone')?.value"
                  [disabled]="form!.get('whatsapp_same_as_phone')?.value">
                </app-searchable-select>
                <input formControlName="whatsapp_number" class="form-control form-control-sm phone-number-input"
                  placeholder="e.g. 9876543210"
                  [class.bg-light]="form!.get('whatsapp_same_as_phone')?.value"
                  [class.is-invalid]="form!.get('whatsapp_number')?.invalid && form!.get('whatsapp_number')?.touched"
                  [attr.readonly]="form!.get('whatsapp_same_as_phone')?.value ? true : null">
              </div>
              <div class="form-check mt-1">
                <input class="form-check-input" type="checkbox"
                  formControlName="whatsapp_same_as_phone" id="wa_same_er">
                <label class="form-check-label small text-muted" for="wa_same_er">Same as phone</label>
              </div>
              @if (form!.get('whatsapp_number')?.touched && form!.get('whatsapp_number')?.errors) {
                <div class="text-danger small mt-1">
                  @if (form!.get('whatsapp_number')?.errors?.['required'])          { WhatsApp number is required. }
                  @else if (form!.get('whatsapp_number')?.errors?.['phoneInvalid']) { {{ form!.get('whatsapp_number')?.errors?.['phoneInvalid'] }} }
                </div>
              }
            </div>

            <!-- LinkedIn -->
            <div class="col-12">
              <label class="form-label small fw-semibold">LinkedIn URL</label>
              <input formControlName="linkedin_url" class="form-control form-control-sm"
                placeholder="https://linkedin.com/in/username"
                [class.is-invalid]="form!.get('linkedin_url')?.invalid && form!.get('linkedin_url')?.touched">
              @if (form!.get('linkedin_url')?.invalid && form!.get('linkedin_url')?.touched) {
                <div class="invalid-feedback d-block small">
                  Enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username).
                </div>
              }
            </div>

            <!-- Bio -->
            <div class="col-12">
              <label class="form-label small fw-semibold">Bio</label>
              <textarea formControlName="bio" class="form-control form-control-sm" rows="3"
                [class.is-invalid]="form!.get('bio')?.invalid && form!.get('bio')?.dirty"></textarea>
              <small class="d-block text-end mt-1"
                [class.text-success]="bioWordCount <= BIO_WORD_LIMIT"
                [class.text-danger]="bioWordCount > BIO_WORD_LIMIT">
                {{ bioWordCount }} / {{ BIO_WORD_LIMIT }} words
              </small>
              @if (form!.get('bio')?.errors?.['bioWordLimit'] && form!.get('bio')?.dirty) {
                <div class="text-danger small mt-1">
                  You have exceeded the maximum limit of 2000 words. Please reduce your text.
                </div>
              }
            </div>

          </div>
        </div>

        <!-- ── Professional ───────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--info">
            <i class="bi bi-briefcase"></i> Professional
          </h5>
          <div class="row g-3">

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Job Title <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="job_title"
                [options]="jobTitleOptions()"
                placeholder="e.g. Senior Developer"
                [allowClear]="true"
                [invalid]="!!(form!.get('job_title')?.invalid && form!.get('job_title')?.touched)">
              </app-searchable-select>
              @if (form!.get('job_title')?.invalid && form!.get('job_title')?.touched) {
                <div class="text-danger small mt-1">Job title is required.</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Occupation <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="occupation"
                [options]="occupationOptions()"
                placeholder="e.g. Software Engineer"
                [allowClear]="true"
                [invalid]="!!(form!.get('occupation')?.invalid && form!.get('occupation')?.touched)">
              </app-searchable-select>
              @if (form!.get('occupation')?.invalid && form!.get('occupation')?.touched) {
                <div class="text-danger small mt-1">Occupation is required.</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Industry <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="industry"
                [options]="industryOptions()"
                placeholder="e.g. Technology"
                [allowClear]="true"
                [invalid]="!!(form!.get('industry')?.invalid && form!.get('industry')?.touched)">
              </app-searchable-select>
              @if (form!.get('industry')?.invalid && form!.get('industry')?.touched) {
                <div class="text-danger small mt-1">Industry is required.</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Employment Status <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="employment_status"
                [options]="employmentStatusOptions"
                placeholder="Select status…"
                [allowClear]="true"
                [invalid]="!!(form!.get('employment_status')?.invalid && form!.get('employment_status')?.touched)">
              </app-searchable-select>
              @if (form!.get('employment_status')?.invalid && form!.get('employment_status')?.touched) {
                <div class="text-danger small mt-1">Employment status is required.</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Notice Period</label>
              <app-searchable-select
                formControlName="notice_period_id"
                [options]="noticePeriodOptions()"
                placeholder="Select notice period…"
                [allowClear]="true">
              </app-searchable-select>
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Years Experience
                <span class="badge bg-primary ms-2">{{ form.get('years_experience')?.value ?? 0 }} yrs</span>
              </label>
              <input formControlName="years_experience" type="range" min="0" max="25" step="1"
                class="experience-slider"
                [style.--fill]="((form.get('years_experience')?.value ?? 0) / 25 * 100) + '%'">
              <div class="d-flex justify-content-between" style="font-size:.7rem;color:var(--th-text-secondary)">
                <span>0 yrs</span><span>25 yrs</span>
              </div>
            </div>

            <!-- Visa Status -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Visa / Work Permit Status</label>
              <app-searchable-select
                formControlName="visa_status_select"
                [options]="visaStatusOptions"
                placeholder="Select visa status…"
                [allowClear]="true">
              </app-searchable-select>
            </div>
            @if (form!.get('visa_status_select')?.value === 'other') {
              <div class="col-md-6">
                <label class="form-label small fw-semibold">Specify Visa Status</label>
                <input formControlName="visa_status_other" class="form-control form-control-sm"
                  placeholder="Describe your visa/permit status…">
              </div>
            }

          </div>
        </div>

        <!-- ── Location ───────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--success">
            <i class="bi bi-geo-alt"></i> Location
          </h5>
          <div class="row g-3">

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Current Country <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="current_country"
                [options]="countryOptions()"
                placeholder="Select country…"
                [allowClear]="true"
                [invalid]="!!(form!.get('current_country')?.invalid && form!.get('current_country')?.touched)">
              </app-searchable-select>
              @if (form!.get('current_country')?.invalid && form!.get('current_country')?.touched) {
                <div class="text-danger small mt-1">Current country is required.</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Current City <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="current_city"
                [options]="cityOptions()"
                placeholder="Select city…"
                [allowClear]="true"
                [invalid]="!!(form!.get('current_city')?.invalid && form!.get('current_city')?.touched)">
              </app-searchable-select>
              @if (form!.get('current_city')?.invalid && form!.get('current_city')?.touched) {
                <div class="text-danger small mt-1">Current city is required.</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">Postal / ZIP Code</label>
              <input formControlName="postal_code" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('postal_code')?.invalid && form!.get('postal_code')?.touched"
                placeholder="Postal code">
              @if (form!.get('postal_code')?.touched) {
                @if (form!.get('postal_code')?.errors?.['postalCodeInvalid']) {
                  <div class="invalid-feedback d-block">{{ form!.get('postal_code')?.errors?.['postalCodeInvalid'] }}</div>
                }
              }
            </div>

            <!-- Passport toggle -->
            <div class="col-12">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" formControlName="has_passport" id="er_has_passport">
                <label class="form-check-label small fw-semibold" for="er_has_passport">I hold a valid passport</label>
              </div>
            </div>

            <!-- Nationality -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">
                Nationality
                @if (form!.get('has_passport')?.value) { <span class="text-danger">*</span> }
                @else { <span class="text-muted">(optional)</span> }
              </label>
              <app-searchable-select
                formControlName="nationality"
                [options]="countryOptions()"
                placeholder="Select nationality…"
                [allowClear]="true"
                [invalid]="!!(form!.get('nationality')?.invalid && form!.get('nationality')?.touched)">
              </app-searchable-select>
              @if (form!.get('nationality')?.invalid && form!.get('nationality')?.touched) {
                <div class="text-danger small mt-1">Nationality is required when passport is selected.</div>
              }
            </div>

            <!-- Target Locations -->
            <div class="col-12">
              <label class="form-label small fw-semibold">Target Locations</label>
              <app-chip-multi-select
                formControlName="target_locations"
                [options]="targetLocationChipOptions()">
              </app-chip-multi-select>
              <small class="text-muted">Countries you are willing to relocate / work in.</small>
            </div>

          </div>
        </div>

        <!-- ── Skills ─────────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header card-section-header--purple mb-0">
              <i class="bi bi-tools"></i> Skills
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addSkill()">+ Add</button>
          </div>
          @if (skillsArray.length) {
            <div class="row g-2 mb-1">
              <div class="col"><label class="form-label form-label-sm mb-0">Skill Name <span class="text-danger">*</span></label></div>
              <div class="col"><label class="form-label form-label-sm mb-0">Proficiency</label></div>
              <div class="col-auto" style="width:5rem"></div>
            </div>
          }
          @for (ctrl of skillsArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-center">
              <div class="col">
                <input formControlName="skill_name" class="form-control form-control-sm"
                  placeholder="e.g. Angular"
                  [class.is-invalid]="asGroup(ctrl).get('skill_name')!.invalid && asGroup(ctrl).get('skill_name')!.touched">
                @if (asGroup(ctrl).get('skill_name')!.invalid && asGroup(ctrl).get('skill_name')!.touched) {
                  <div class="invalid-feedback">Skill name is required.</div>
                }
              </div>
              <div class="col">
                <app-searchable-select
                  formControlName="proficiency"
                  [options]="proficiencySkillOptions"
                  placeholder="— Select —"
                  [allowClear]="false"
                  [invalid]="asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched">
                </app-searchable-select>
                @if (asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched) {
                  <div class="text-danger" style="font-size:.875em;margin-top:.25rem">Select a proficiency level.</div>
                }
              </div>
              <div class="col-auto" style="width:5rem">
                <button type="button" class="btn btn-sm btn-outline-danger w-100"
                  (click)="removeSkill($index)"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          }
        </div>

        <!-- ── Languages ──────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header card-section-header--teal mb-0">
              <i class="bi bi-translate"></i> Languages
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addLanguage()">+ Add</button>
          </div>
          @if (languagesArray.length) {
            <div class="row g-2 mb-1">
              <div class="col"><label class="form-label form-label-sm mb-0">Language <span class="text-danger">*</span></label></div>
              <div class="col"><label class="form-label form-label-sm mb-0">Proficiency</label></div>
              <div class="col-auto" style="width:5rem"></div>
            </div>
          }
          @for (ctrl of languagesArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-center">
              <div class="col">
                <app-searchable-select
                  formControlName="language"
                  [options]="languageOptions()"
                  placeholder="e.g. English"
                  [invalid]="asGroup(ctrl).get('language')!.invalid && asGroup(ctrl).get('language')!.touched">
                </app-searchable-select>
                @if (asGroup(ctrl).get('language')!.invalid && asGroup(ctrl).get('language')!.touched) {
                  <div class="invalid-feedback d-block small">Language name is required.</div>
                }
              </div>
              <div class="col">
                <app-searchable-select
                  formControlName="proficiency"
                  [options]="proficiencyLangOptions"
                  placeholder="— Select —"
                  [allowClear]="false"
                  [invalid]="asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched">
                </app-searchable-select>
                @if (asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched) {
                  <div class="text-danger" style="font-size:.875em;margin-top:.25rem">Select a proficiency level.</div>
                }
              </div>
              <div class="col-auto" style="width:5rem">
                <button type="button" class="btn btn-sm btn-outline-danger w-100"
                  (click)="removeLanguage($index)"><i class="bi bi-trash"></i></button>
              </div>
            </div>
          }
        </div>

        <!-- ── Work Experience ────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header card-section-header--orange mb-0">
              <i class="bi bi-building"></i> Work Experience
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addExperience()">+ Add</button>
          </div>
          @for (ctrl of experienceArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="glass-card p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold small text-muted"><i class="bi bi-briefcase me-1"></i> Experience #{{ $index + 1 }}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeExperience($index)">Remove</button>
              </div>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Job Title <span class="text-danger">*</span></label>
                  <input formControlName="job_title" class="form-control form-control-sm" placeholder="Job Title"
                    [class.is-invalid]="asGroup(ctrl).get('job_title')!.invalid && asGroup(ctrl).get('job_title')!.touched">
                  @if (asGroup(ctrl).get('job_title')!.invalid && asGroup(ctrl).get('job_title')!.touched) {
                    <div class="invalid-feedback">Job title is required.</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Company <span class="text-danger">*</span></label>
                  <input formControlName="company_name" class="form-control form-control-sm" placeholder="Company"
                    [class.is-invalid]="asGroup(ctrl).get('company_name')!.invalid && asGroup(ctrl).get('company_name')!.touched">
                  @if (asGroup(ctrl).get('company_name')!.invalid && asGroup(ctrl).get('company_name')!.touched) {
                    <div class="invalid-feedback">Company name is required.</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">Start Date <span class="text-danger">*</span></label>
                  <input formControlName="start_date" type="date" class="form-control form-control-sm"
                    [class.is-invalid]="asGroup(ctrl).get('start_date')!.invalid && asGroup(ctrl).get('start_date')!.touched">
                  @if (asGroup(ctrl).get('start_date')!.invalid && asGroup(ctrl).get('start_date')!.touched) {
                    <div class="invalid-feedback">Start date is required.</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">End Date</label>
                  @if (!asGroup(ctrl).get('currently_working')?.value) {
                    <input formControlName="end_date" type="date" class="form-control form-control-sm">
                  } @else {
                    <div class="form-control form-control-sm bg-success-subtle text-success fw-semibold">Present</div>
                  }
                  <div class="form-check mt-1">
                    <input type="checkbox" class="form-check-input" formControlName="currently_working" id="erCw_{{$index}}">
                    <label class="form-check-label small text-muted" for="erCw_{{$index}}">Currently here</label>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Location <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="location"
                    [options]="countryOptions()"
                    placeholder="Country / City"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">Location is required.</div>
                  }
                </div>
                <div class="col-12">
                  <label class="form-label form-label-sm">Description</label>
                  <textarea formControlName="description" class="form-control form-control-sm"
                    rows="2" placeholder="Brief description of responsibilities"></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Reason for Leaving <span class="text-muted fw-normal" style="font-size:.7rem">(optional)</span></label>
                  <app-searchable-select
                    formControlName="reason_for_leaving_select"
                    [options]="reasonForLeavingOptions"
                    placeholder="— Select —"
                    [allowClear]="true">
                  </app-searchable-select>
                </div>
                @if (asGroup(ctrl).get('reason_for_leaving_select')?.value === 'Other') {
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Please specify</label>
                    <input formControlName="reason_for_leaving_other" class="form-control form-control-sm" placeholder="Briefly describe the reason…">
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- ── Education ──────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header card-section-header--success mb-0">
              <i class="bi bi-mortarboard"></i> Education
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addEducation()">+ Add</button>
          </div>
          @for (ctrl of educationArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="glass-card p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold small text-muted"><i class="bi bi-mortarboard me-1"></i> Education #{{ $index + 1 }}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeEducation($index)">Remove</button>
              </div>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Institution <span class="text-danger">*</span></label>
                  <input formControlName="institution" class="form-control form-control-sm" placeholder="Institution"
                    [class.is-invalid]="asGroup(ctrl).get('institution')!.invalid && asGroup(ctrl).get('institution')!.touched">
                  @if (asGroup(ctrl).get('institution')!.invalid && asGroup(ctrl).get('institution')!.touched) {
                    <div class="invalid-feedback">Institution is required.</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Degree <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="degree"
                    [options]="degreeOptions()"
                    placeholder="e.g. Bachelor of Science"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('degree')!.invalid && asGroup(ctrl).get('degree')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('degree')!.invalid && asGroup(ctrl).get('degree')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">Degree is required.</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Field of Study <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="field_of_study"
                    [options]="fieldOfStudyOptions()"
                    placeholder="e.g. Computer Science"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('field_of_study')!.invalid && asGroup(ctrl).get('field_of_study')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('field_of_study')!.invalid && asGroup(ctrl).get('field_of_study')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">Field of study is required.</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">Start</label>
                  <div class="d-flex gap-1">
                    <select class="form-select form-select-sm" formControlName="start_month" style="width:80px">
                      @for (m of MONTHS; track m.value) {
                        <option [ngValue]="m.value">{{ m.label }}</option>
                      }
                    </select>
                    <input formControlName="start_year" type="number" class="form-control form-control-sm" placeholder="YYYY"
                      [class.is-invalid]="asGroup(ctrl).get('start_year')!.invalid && asGroup(ctrl).get('start_year')!.touched">
                  </div>
                  @if (asGroup(ctrl).get('start_year')!.errors?.['eduYearInvalid'] && asGroup(ctrl).get('start_year')!.touched) {
                    <div class="invalid-feedback d-block">{{ asGroup(ctrl).get('start_year')!.errors?.['eduYearInvalid'] }}</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">End / Expected</label>
                  <div class="d-flex gap-1">
                    <select class="form-select form-select-sm" formControlName="end_month" style="width:80px">
                      @for (m of MONTHS; track m.value) {
                        <option [ngValue]="m.value">{{ m.label }}</option>
                      }
                    </select>
                    <input formControlName="end_year" type="number" class="form-control form-control-sm" placeholder="YYYY"
                      [class.is-invalid]="asGroup(ctrl).get('end_year')!.invalid && asGroup(ctrl).get('end_year')!.touched">
                  </div>
                  @if (asGroup(ctrl).get('end_year')!.errors?.['eduYearInvalid'] && asGroup(ctrl).get('end_year')!.touched) {
                    <div class="invalid-feedback d-block">{{ asGroup(ctrl).get('end_year')!.errors?.['eduYearInvalid'] }}</div>
                  }
                  @if (asGroup(ctrl).get('end_year')!.errors?.['endBeforeStart'] && asGroup(ctrl).get('end_year')!.touched) {
                    <div class="invalid-feedback d-block">End date cannot be before start date.</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">Country of Institution <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="location"
                    [options]="countryOptions()"
                    placeholder="Select country…"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">Location is required.</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- ── Hobbies & Interests ─────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--teal">
            <i class="bi bi-stars"></i> Hobbies &amp; Interests
          </h5>
          <app-chip-multi-select
            formControlName="hobbies"
            [options]="hobbyChipOptions()">
          </app-chip-multi-select>
          <small class="text-muted mt-2 d-block">Select any hobbies or interests that represent you.</small>
        </div>

        <!-- ── Certificates ───────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header mb-0"><i class="bi bi-patch-check"></i> Certificates</h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addCertEntry()">+ Add</button>
          </div>
          <div class="d-flex flex-column gap-3">
            @for (ctrl of certificateArray.controls; track $index) {
              <div [formGroup]="asGroup(ctrl)" class="card border" style="border-radius:var(--th-radius)">
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="small fw-semibold text-muted">Certificate {{ $index + 1 }}</span>
                    <button type="button" class="btn btn-sm btn-outline-danger py-0 px-1" (click)="removeCertEntry($index)">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                  <div class="row g-2">
                    <div class="col-12 col-md-6">
                      <label class="form-label form-label-sm">Name</label>
                      <input type="text" class="form-control form-control-sm" formControlName="name" placeholder="Certificate name">
                    </div>
                    <div class="col-12 col-md-6">
                      <label class="form-label form-label-sm">Issuing Organisation</label>
                      <input type="text" class="form-control form-control-sm" formControlName="issuer" placeholder="e.g. Amazon Web Services">
                    </div>
                    <div class="col-6 col-md-3">
                      <label class="form-label form-label-sm">Issue Date</label>
                      <input type="date" class="form-control form-control-sm" formControlName="issue_date">
                    </div>
                    <div class="col-6 col-md-3">
                      <label class="form-label form-label-sm">Expiry Date</label>
                      <input type="date" class="form-control form-control-sm" formControlName="expiry_date"
                        [attr.disabled]="asGroup(ctrl).get('no_expiry')?.value ? true : null">
                    </div>
                    <div class="col-12 col-md-6 d-flex align-items-end pb-1">
                      <div class="form-check mb-0">
                        <input class="form-check-input" type="checkbox" [id]="'cert-no-expiry-'+$index" formControlName="no_expiry">
                        <label class="form-check-label small" [for]="'cert-no-expiry-'+$index">No Expiry</label>
                      </div>
                    </div>
                  </div>
                  @if (asGroup(ctrl).get('file_url')?.value) {
                    <div class="mt-2">
                      <a [href]="asGroup(ctrl).get('file_url')?.value" target="_blank" class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-eye me-1"></i> View current file
                      </a>
                      <span class="text-muted small ms-2">(file managed by admin)</span>
                    </div>
                  }
                </div>
              </div>
            }
            @if (!certificateArray.length) {
              <div class="text-muted small">No certificates — click Add to request adding one.</div>
            }
          </div>
        </div>

        @if (submitError) {
          <div class="alert alert-danger small">{{ submitError }}</div>
        }

        <div class="d-flex gap-2 mb-5">
          <button type="submit" class="btn btn-primary px-4"
            [disabled]="submitting || existingRequest?.status === 'pending' || form!.get('bio')?.invalid">
            {{ submitting ? 'Submitting…' : 'Submit for Review' }}
          </button>
        </div>

      </form>
    }

    <!-- Preview Overlay -->
    @if (previewOpen) {
      <div class="file-preview-overlay" (click)="closePreview()">
        <div class="file-preview-dialog" (click)="$event.stopPropagation()">
          <div class="file-preview-dialog__header">
            <span class="file-preview-dialog__title">{{ previewName }}</span>
            <button type="button" class="file-preview-dialog__close" (click)="closePreview()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="file-preview-dialog__body">
            @if (previewType === 'image') {
              <img [src]="previewUrl" alt="Preview"
                style="max-width:100%;max-height:70vh;border-radius:var(--th-radius);display:block;margin:0 auto">
            } @else if (previewType === 'video') {
              <video [src]="previewUrl" controls autoplay
                style="max-width:100%;max-height:70vh;border-radius:var(--th-radius);display:block;margin:0 auto">
              </video>
            } @else if (previewType === 'pdf') {
              <iframe [src]="safePreviewUrl" style="width:100%;height:70vh;border:none;border-radius:var(--th-radius)">
              </iframe>
              <div style="text-align:center;margin-top:.5rem">
                <a [href]="previewUrl" target="_blank" class="btn btn-sm btn-outline-primary">
                  <i class="bi bi-box-arrow-up-right me-1"></i> Open in new tab
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class EditRequestComponent implements OnInit {
  candidate:       Candidate | null = null;
  loadingProfile   = true;
  form:            FormGroup | null = null;
  submitting       = false;
  submitError      = '';
  existingRequest: EditRequest | null = null;

  staged:         Record<string, string | null> = {};
  stagedRelative: Record<string, string> = {};
  mediaLoading:   Record<string, boolean> = {};

  previewOpen = false;
  previewType: 'image' | 'video' | 'pdf' = 'image';
  previewUrl  = '';
  previewName = '';

  private loadedCountry:    string | null = null;
  private originalSnapshot: Record<string, unknown> = {};

  // ── Computed options ───────────────────────────────────────────────────────

  readonly countryOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

  readonly dialCodeOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.dial_code, label: `${c.flag_emoji} ${c.dial_code}`, sublabel: c.name })));

  readonly cityOptions = computed<SelectOption[]>(() =>
    this.master.cities().map(c => ({ value: c.name, label: c.name })));

  readonly jobTitleOptions = computed<SelectOption[]>(() =>
    this.master.jobTitles().map(j => ({ value: j.title, label: j.title, sublabel: j.occupation_name })));

  readonly occupationOptions = computed<SelectOption[]>(() =>
    this.master.occupations().map(o => ({ value: o.name, label: o.name })));

  readonly industryOptions = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name })));

  readonly languageOptions = computed<SelectOption[]>(() =>
    this.master.languages().map(l => ({ value: l.name, label: l.name })));

  readonly degreeOptions = computed<SelectOption[]>(() =>
    this.master.degrees().map(d => ({ value: d.name, label: d.name })));

  readonly fieldOfStudyOptions = computed<SelectOption[]>(() =>
    this.master.fieldsOfStudy().map(f => ({ value: f.name, label: f.name })));

  readonly noticePeriodOptions = computed<SelectOption[]>(() =>
    this.master.noticePeriods().map(n => ({ value: n.id, label: n.label })));

  readonly targetLocationChipOptions = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

  readonly hobbyChipOptions = computed<ChipOption[]>(() =>
    this.master.hobbies().map(h => ({ value: h.name, label: h.name })));

  // ── Static option arrays ───────────────────────────────────────────────────

  readonly proficiencySkillOptions: SelectOption[] = [
    { value: 'beginner',     label: 'Beginner'     },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert',       label: 'Expert'       },
  ];
  readonly proficiencyLangOptions: SelectOption[] = [
    { value: 'A1',     label: 'A1 — Beginner'          },
    { value: 'A2',     label: 'A2 — Elementary'         },
    { value: 'B1',     label: 'B1 — Intermediate'       },
    { value: 'B2',     label: 'B2 — Upper Intermediate' },
    { value: 'C1',     label: 'C1 — Advanced'           },
    { value: 'C2',     label: 'C2 — Proficient'         },
    { value: 'native', label: 'Native'                   },
  ];
  readonly genderOptions: SelectOption[] = [
    { value: 'male',              label: 'Male'              },
    { value: 'female',            label: 'Female'            },
    { value: 'non-binary',        label: 'Non-binary'        },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];
  readonly maritalStatusOptions: SelectOption[] = [
    { value: 'single',   label: 'Single'   },
    { value: 'married',  label: 'Married'  },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed',  label: 'Widowed'  },
  ];
  readonly employmentStatusOptions = EMPLOYMENT_STATUS_OPTIONS;
  readonly visaStatusOptions       = VISA_STATUS_OPTIONS;
  readonly reasonForLeavingOptions = REASON_FOR_LEAVING_OPTIONS;

  readonly currentYear = new Date().getFullYear();
  readonly MONTHS = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ];
  readonly BIO_WORD_LIMIT = 2000;

  get bioWordCount(): number {
    return this.countWords(this.form?.get('bio')?.value ?? '');
  }

  get safePreviewUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
  }

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private editRequestService: EditRequestService,
    private toast: ToastService,
    public master: MasterDataService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.master.loadAll();
    this.editRequestService.getMyRequest().subscribe({
      next: (res) => (this.existingRequest = res.request),
    });
    this.candidateService.getMyProfile().subscribe({
      next: (res) => {
        this.loadingProfile = false;
        this.candidate = res.candidate;
        this.buildForm(res.candidate);
      },
      error: () => (this.loadingProfile = false),
    });
  }

  // ── Phone split helper ────────────────────────────────────────────────────
  private splitPhone(phone: string): { dialCode: string; number: string } {
    if (!phone) return { dialCode: '+1', number: '' };
    const codes = this.master.countries()
      .map(c => c.dial_code)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b.length - a.length);
    for (const code of codes) {
      if (phone.startsWith(code)) {
        return { dialCode: code, number: phone.slice(code.length).trim() };
      }
    }
    return { dialCode: '+1', number: phone };
  }

  // ── Country change → city cascade ─────────────────────────────────────────
  onCountryChange(countryName: string | number | null): void {
    if (!this.form) return;
    const newCountry = countryName ? String(countryName) : null;
    if (newCountry !== this.loadedCountry) {
      this.form.patchValue({ current_city: '' }, { emitEvent: false });
    }
    this.loadedCountry = newCountry;
    if (!newCountry) { this.master.cities.set([]); return; }
    const country = this.master.countries().find(c => c.name === newCountry);
    if (country) this.master.loadCities(country.id);
  }

  // ── Job Title → auto-fill Occupation ─────────────────────────────────────
  onJobTitleChange(titleName: string | number | null): void {
    if (!titleName || !this.form) return;
    const jt = this.master.jobTitles().find(j => j.title === String(titleName));
    if (jt && !this.form.get('occupation')?.value) {
      this.form.patchValue({ occupation: jt.occupation_name }, { emitEvent: false });
    }
  }

  // ── Build form ────────────────────────────────────────────────────────────
  buildForm(emp: Candidate): void {
    const { dialCode: phoneDial, number: phoneNum } = this.splitPhone(emp.phone ?? '');
    const { dialCode: waDial,   number: waNum     } = this.splitPhone(emp.whatsapp_number ?? '');

    // Parse visa_status into select + other
    let visaSelect = '';
    let visaOther  = '';
    if (emp.visa_status) {
      if (emp.visa_status.startsWith('Other: ')) {
        visaSelect = 'other';
        visaOther  = emp.visa_status.slice('Other: '.length);
      } else if (emp.visa_status === 'Other — specify') {
        visaSelect = 'other';
      } else {
        visaSelect = emp.visa_status;
      }
    }

    this.form = this.fb.group({
      // Personal
      first_name:             [emp.first_name    ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-]+$/)]],
      last_name:              [emp.last_name     ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-]+$/)]],
      date_of_birth:          [emp.date_of_birth ?? '', [Validators.required, dobValidator()]],
      gender:                 [emp.gender        ?? '', Validators.required],
      marital_status:         [emp.marital_status ?? ''],
      phone_dial_code:        [phoneDial],
      phone_number:           [phoneNum, Validators.required],
      whatsapp_dial_code:     [waDial],
      whatsapp_number:        [waNum, Validators.required],
      whatsapp_same_as_phone: [false],
      bio:                    [emp.bio           ?? '', this.bioWordLimitValidator(this.BIO_WORD_LIMIT)],
      linkedin_url:           [emp.linkedin_url  ?? '', linkedInValidator()],

      // Professional
      job_title:           [emp.job_title        ?? '', Validators.required],
      occupation:          [emp.occupation       ?? '', Validators.required],
      industry:            [emp.industry         ?? '', Validators.required],
      employment_status:   [emp.employment_status ?? '', Validators.required],
      years_experience:    [emp.years_experience ?? 0],
      notice_period_id:    [(emp as any).notice_period_id ?? null],
      visa_status_select:  [visaSelect],
      visa_status_other:   [visaOther],

      // Location
      current_country:  [emp.current_country ?? '', Validators.required],
      current_city:     [emp.current_city    ?? '', Validators.required],
      postal_code:      [emp.postal_code     ?? '', Validators.maxLength(20)],
      has_passport:     [emp.has_passport    ?? false],
      nationality:      [emp.nationality     ?? ''],
      target_locations: [Array.isArray(emp.target_locations) ? emp.target_locations : []],

      // Hobbies
      hobbies: [Array.isArray(emp.hobbies) ? emp.hobbies : []],

      // Dynamic arrays
      skills: this.fb.array((emp.skills ?? []).map(s =>
        this.fb.group({ skill_name: [s.skill_name ?? '', Validators.required], proficiency: [s.proficiency ?? ''] }, { validators: skillGroupValidator }))),

      languages: this.fb.array((emp.languages ?? []).map(l =>
        this.fb.group({ language: [l.language ?? '', Validators.required], proficiency: [l.proficiency ?? ''] }, { validators: langGroupValidator }))),

      experience: this.fb.array((emp.experience ?? []).map(e => {
        let rflSel = '', rflOther = '';
        if (e.reason_for_leaving?.startsWith('Other: ')) {
          rflSel = 'Other'; rflOther = e.reason_for_leaving.slice(7);
        } else if (e.reason_for_leaving === 'Other') {
          rflSel = 'Other';
        } else {
          rflSel = e.reason_for_leaving ?? '';
        }
        return this.fb.group({
          job_title:                 [e.job_title    ?? '', Validators.required],
          company_name:              [e.company_name ?? '', Validators.required],
          start_date:                [e.start_date   ?? '', Validators.required],
          end_date:                  [e.end_date     ?? ''],
          location:                  [e.location     ?? '', Validators.required],
          description:               [e.description  ?? ''],
          reason_for_leaving_select: [rflSel],
          reason_for_leaving_other:  [rflOther],
          currently_working:         [!e.end_date],
        });
      })),

      education: this.fb.array((emp.education ?? []).map(e => {
        const yr = new Date().getFullYear();
        return this.fb.group({
          institution:    [e.institution    ?? '', Validators.required],
          degree:         [e.degree         ?? '', Validators.required],
          field_of_study: [e.field_of_study ?? '', Validators.required],
          start_year:  [e.start_year  ?? null, eduYearValidator(1950, yr)],
          start_month: [e.start_month ?? 1],
          end_year:    [e.end_year    ?? null, eduYearValidator(1950, yr + 6)],
          end_month:   [e.end_month   ?? 1],
          location:       [e.location       ?? '', Validators.required],
        }, { validators: eduEndYearGroupValidator });
      })),

      certificates: this.fb.array((emp.certificates ?? []).map(c => this.fb.group({
        id:          [c.id          ?? null],
        name:        [c.name        ?? ''],
        issuer:      [c.issuer      ?? ''],
        issue_date:  [c.issue_date  ?? ''],
        expiry_date: [c.expiry_date ?? ''],
        no_expiry:   [c.no_expiry   ?? false],
        file_url:    [c.file_url    ?? ''],
      }))),
    }, {
      validators: [
        makePhoneGroupValidator('phone_dial_code',    'phone_number'),
        makePhoneGroupValidator('whatsapp_dial_code', 'whatsapp_number'),
        makePostalCodeGroupValidator('current_country', 'postal_code'),
      ],
    });

    // WhatsApp same-as-phone sync
    this.form.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        const raw = this.form!.getRawValue();
        this.form!.patchValue({ whatsapp_dial_code: raw.phone_dial_code || '+1', whatsapp_number: raw.phone_number || '' }, { emitEvent: false });
        this.form!.get('whatsapp_number')!.updateValueAndValidity();
      }
    });
    this.form.get('phone_number')!.valueChanges.subscribe(() => {
      if (this.form!.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form!.getRawValue();
        this.form!.patchValue({ whatsapp_dial_code: raw.phone_dial_code || '+1', whatsapp_number: raw.phone_number || '' }, { emitEvent: false });
        this.form!.get('whatsapp_number')!.updateValueAndValidity();
      }
    });
    this.form.get('phone_dial_code')!.valueChanges.subscribe(() => {
      if (this.form!.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form!.getRawValue();
        this.form!.patchValue({ whatsapp_dial_code: raw.phone_dial_code || '+1', whatsapp_number: raw.phone_number || '' }, { emitEvent: false });
        this.form!.get('whatsapp_number')!.updateValueAndValidity();
      }
    });

    // Country change → city cascade
    this.form.get('current_country')!.valueChanges.subscribe((v: any) => this.onCountryChange(v));

    // Job title → occupation autofill
    this.form.get('job_title')!.valueChanges.subscribe((v: any) => this.onJobTitleChange(v));

    // has_passport → nationality required
    this.form.get('has_passport')!.valueChanges.subscribe((hasPassport: boolean) => {
      const natCtrl = this.form!.get('nationality')!;
      if (hasPassport) {
        natCtrl.addValidators(Validators.required);
      } else {
        natCtrl.removeValidators(Validators.required);
        if (natCtrl.errors?.['required']) natCtrl.setErrors(null);
      }
      natCtrl.updateValueAndValidity({ emitEvent: false });
    });
    if (emp.has_passport) {
      this.form.get('nationality')!.addValidators(Validators.required);
      this.form.get('nationality')!.updateValueAndValidity({ emitEvent: false });
    }

    // Pre-load cities for existing country
    const country = emp.current_country;
    this.loadedCountry = country ?? null;
    if (country) {
      const found = this.master.countries().find(c => c.name === country);
      if (found) this.master.loadCities(found.id);
    }

    // Capture the baseline snapshot for change detection
    this.originalSnapshot = this.buildOriginalSnapshot(emp);
  }

  // ── Baseline snapshot for change detection ────────────────────────────────
  // Mirrors the exact same transformation logic as submit() so we can deep-diff.
  private buildOriginalSnapshot(emp: Candidate): Record<string, unknown> {
    const { dialCode: phoneDial, number: phoneNum } = this.splitPhone(emp.phone ?? '');
    const { dialCode: waDial,   number: waNum     } = this.splitPhone(emp.whatsapp_number ?? '');

    // Parse visa_status (same as buildForm)
    let visaSelect = '';
    let visaOther  = '';
    if (emp.visa_status) {
      if (emp.visa_status.startsWith('Other: ')) {
        visaSelect = 'other'; visaOther = emp.visa_status.slice('Other: '.length);
      } else if (emp.visa_status === 'Other — specify') {
        visaSelect = 'other';
      } else {
        visaSelect = emp.visa_status;
      }
    }

    // Reconstruct composed values the same way submit() does
    const phone      = phoneNum ? `${phoneDial}${phoneNum}`.trim() : undefined;
    const whatsapp   = waNum    ? `${waDial}${waNum}`.trim()       : undefined;
    const visaStatus = visaSelect === 'other'
      ? (visaOther?.trim() ? `Other: ${visaOther.trim()}` : 'Other — specify')
      : (visaSelect || undefined);

    // Scalar fields — same filter as submit(): exclude '' and null
    const rawScalars: Record<string, unknown> = {
      first_name:        emp.first_name        ?? '',
      last_name:         emp.last_name         ?? '',
      date_of_birth:     emp.date_of_birth     ?? '',
      gender:            emp.gender            ?? '',
      marital_status:    emp.marital_status    ?? '',
      bio:               emp.bio               ?? '',
      linkedin_url:      emp.linkedin_url      ?? '',
      job_title:         emp.job_title         ?? '',
      occupation:        emp.occupation        ?? '',
      industry:          emp.industry          ?? '',
      employment_status: emp.employment_status ?? '',
      years_experience:  emp.years_experience  ?? 0,
      notice_period_id:  (emp as any).notice_period_id ?? null,
      current_country:   emp.current_country   ?? '',
      current_city:      emp.current_city      ?? '',
      postal_code:       emp.postal_code       ?? '',
      has_passport:      emp.has_passport      ?? false,
      nationality:       emp.nationality       ?? '',
    };
    const snap: Record<string, unknown> = Object.fromEntries(
      Object.entries(rawScalars).filter(([, v]) => v !== '' && v !== null),
    );
    if (phone)      snap['phone']           = phone;
    if (whatsapp)   snap['whatsapp_number'] = whatsapp;
    if (visaStatus) snap['visa_status']     = visaStatus;

    // Arrays — always present (mirrors clean['target_locations'] / clean['hobbies'])
    snap['target_locations'] = Array.isArray(emp.target_locations) ? [...emp.target_locations] : [];
    snap['hobbies']          = Array.isArray(emp.hobbies)          ? [...emp.hobbies]          : [];

    // Skills — same filter as submit()
    snap['skills'] = (emp.skills ?? [])
      .filter((s: any) => s.skill_name?.trim())
      .map((s: any) => ({ skill_name: s.skill_name ?? '', proficiency: s.proficiency ?? '' }));

    // Languages
    snap['languages'] = (emp.languages ?? [])
      .filter((l: any) => l.language?.trim())
      .map((l: any) => ({ language: l.language ?? '', proficiency: l.proficiency ?? '' }));

    // Experience — mirror submit() transformation (compose reason_for_leaving, currently_working)
    snap['experience'] = (emp.experience ?? [])
      .filter((e: any) => e.company_name?.trim() || e.job_title?.trim())
      .map((e: any) => {
        let rflSel = '', rflOther = '';
        if (e.reason_for_leaving?.startsWith('Other: ')) {
          rflSel = 'Other'; rflOther = e.reason_for_leaving.slice(7);
        } else if (e.reason_for_leaving === 'Other') {
          rflSel = 'Other';
        } else {
          rflSel = e.reason_for_leaving ?? '';
        }
        const cw = !e.end_date; // mirrors: currently_working = [!e.end_date] in buildForm
        return {
          job_title:          e.job_title    ?? '',
          company_name:       e.company_name ?? '',
          start_date:         e.start_date   ?? '',
          end_date:           cw ? null : (e.end_date || null),
          location:           e.location     ?? '',
          description:        e.description  ?? '',
          reason_for_leaving: rflSel === 'Other'
            ? (rflOther?.trim() ? `Other: ${rflOther.trim()}` : 'Other')
            : (rflSel || undefined),
        };
      });

    // Education — same filter as submit()
    snap['education'] = (emp.education ?? [])
      .filter((e: any) => e.institution?.trim() || e.degree?.trim())
      .map((e: any) => ({
        institution:    e.institution    ?? '',
        degree:         e.degree         ?? '',
        field_of_study: e.field_of_study ?? '',
        start_year:     e.start_year     ?? null,
        start_month:    e.start_month    ?? 1,
        end_year:       e.end_year       ?? null,
        end_month:      e.end_month      ?? 1,
        location:       e.location       ?? '',
      }));

    // Certificates — passed through fromEntries as-is in submit(); mirror the form group shape
    snap['certificates'] = (emp.certificates ?? []).map((c: any) => ({
      id:          c.id          ?? null,
      name:        c.name        ?? '',
      issuer:      c.issuer      ?? '',
      issue_date:  c.issue_date  ?? '',
      expiry_date: c.expiry_date ?? '',
      no_expiry:   c.no_expiry   ?? false,
      file_url:    c.file_url    ?? '',
    }));

    return snap;
  }

  // ── Deep equality check ────────────────────────────────────────────────────
  // null and undefined are treated as equivalent.
  // ISO date strings are normalised to YYYY-MM-DD before comparing.
  // Number/string coercion handles range-slider string output vs numeric DB values.
  private deepEqual(a: unknown, b: unknown): boolean {
    const av: unknown = a === undefined ? null : a;
    const bv: unknown = b === undefined ? null : b;
    if (av === bv) return true;
    if (av === null || bv === null) return false;

    // Normalise ISO date strings → YYYY-MM-DD
    if (typeof av === 'string' && typeof bv === 'string') {
      const norm = (s: string) => /^\d{4}-\d{2}-\d{2}T/.test(s) ? s.substring(0, 10) : s;
      return norm(av) === norm(bv);
    }

    // Coerce number ↔ string (range sliders emit string after user interaction)
    if ((typeof av === 'number' && typeof bv === 'string') ||
        (typeof av === 'string' && typeof bv === 'number')) {
      return String(av) === String(bv);
    }

    if (typeof av !== typeof bv) return false;

    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      return av.every((item, i) => this.deepEqual(item, (bv as unknown[])[i]));
    }
    if (Array.isArray(av) !== Array.isArray(bv)) return false;

    if (typeof av === 'object') {
      const ao = av as Record<string, unknown>;
      const bo = bv as Record<string, unknown>;
      const aKeys = Object.keys(ao).sort();
      const bKeys = Object.keys(bo).sort();
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every(k => bKeys.includes(k) && this.deepEqual(ao[k], bo[k]));
    }
    return false;
  }

  // ── FormArray getters ───────────────────────────────────────────────────────
  get skillsArray():     FormArray { return this.form!.get('skills')       as FormArray; }
  get languagesArray():  FormArray { return this.form!.get('languages')    as FormArray; }
  get experienceArray(): FormArray { return this.form!.get('experience')   as FormArray; }
  get educationArray():  FormArray { return this.form!.get('education')    as FormArray; }
  get certificateArray(): FormArray { return this.form!.get('certificates') as FormArray; }

  asGroup(c: AbstractControl): FormGroup { return c as FormGroup; }

  addSkill():              void { this.skillsArray.push(this.fb.group({ skill_name: ['', Validators.required], proficiency: [''] }, { validators: skillGroupValidator })); }
  removeSkill(i: number):  void { this.skillsArray.removeAt(i); }
  addLanguage():             void { this.languagesArray.push(this.fb.group({ language: ['', Validators.required], proficiency: [''] }, { validators: langGroupValidator })); }
  removeLanguage(i: number): void { this.languagesArray.removeAt(i); }
  addExperience(): void {
    this.experienceArray.push(this.fb.group({
      job_title: ['', Validators.required], company_name: ['', Validators.required],
      start_date: ['', Validators.required], end_date: [''],
      location: ['', Validators.required], description: [''],
      reason_for_leaving_select: [''], reason_for_leaving_other: [''], currently_working: [false],
    }));
  }
  removeExperience(i: number): void { this.experienceArray.removeAt(i); }
  addEducation(): void {
    const yr = new Date().getFullYear();
    this.educationArray.push(this.fb.group({
      institution: ['', Validators.required], degree: ['', Validators.required],
      field_of_study: ['', Validators.required],
      start_year:  [null, eduYearValidator(1950, yr)],
      start_month: [1],
      end_year:    [null, eduYearValidator(1950, yr + 6)],
      end_month:   [1],
      location: ['', Validators.required],
    }, { validators: eduEndYearGroupValidator }));
  }
  removeEducation(i: number): void { this.educationArray.removeAt(i); }
  addCertEntry(): void {
    this.certificateArray.push(this.fb.group({
      id: [null], name: [''], issuer: [''], issue_date: [''], expiry_date: [''], no_expiry: [false], file_url: [''],
    }));
  }
  removeCertEntry(i: number): void { this.certificateArray.removeAt(i); }

  // ── Bio word counter ───────────────────────────────────────────────────────
  countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
  }

  bioWordLimitValidator(limit: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const wordCount = this.countWords(control.value ?? '');
      return wordCount > limit ? { bioWordLimit: { actual: wordCount, max: limit } } : null;
    };
  }

  // ── Stage media ────────────────────────────────────────────────────────────
  private typeToField: Record<string, string> = {
    profiles: 'profile_photo_url',
    resumes:  'resume_url',
    videos:   'intro_video_url',
  };

  stageFile(type: 'profiles' | 'resumes' | 'videos', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (type === 'videos' && file.size > 200 * 1024 * 1024) {
      this.toast.show(`Video exceeds the 200 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(1)} MB). Please choose a smaller file.`, 'error');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.mediaLoading[type] = true;
    this.candidateService.stageMyFile(type, file).subscribe({
      next: (res) => {
        this.stagedRelative[type] = res.relativePath;
        this.staged[type]         = res.url;
        this.toast.show('File staged — will be applied on approval', 'success');
      },
      error:    (err) => this.toast.show(err?.error?.message ?? 'Upload failed', 'error'),
      complete: () => (this.mediaLoading[type] = false),
    });
  }

  clearStaged(type: string): void {
    delete this.staged[type];
    delete this.stagedRelative[type];
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  openPreview(type: 'image' | 'video' | 'pdf', url: string, name: string): void {
    this.previewType = type;
    this.previewUrl  = url;
    this.previewName = name;
    this.previewOpen = true;
  }

  closePreview(): void {
    this.previewOpen = false;
    this.previewUrl  = '';
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  submit(): void {
    if (!this.form || this.form.invalid) { this.form?.markAllAsTouched(); return; }
    if (this.existingRequest?.status === 'pending') return;

    this.submitting  = true;
    this.submitError = '';

    const raw = this.form.value;

    // Combine dial code + number
    const phone    = raw.phone_number    ? `${raw.phone_dial_code    || ''}${raw.phone_number}`.trim()    : undefined;
    const whatsapp = raw.whatsapp_number ? `${raw.whatsapp_dial_code || ''}${raw.whatsapp_number}`.trim() : undefined;

    // Compose visa_status from split controls
    const visaStatus = raw.visa_status_select === 'other'
      ? (raw.visa_status_other?.trim() ? `Other: ${raw.visa_status_other.trim()}` : 'Other — specify')
      : (raw.visa_status_select || undefined);

    // Build full payload excluding helper controls
    const excluded = new Set(['phone_dial_code', 'phone_number', 'whatsapp_dial_code', 'whatsapp_same_as_phone', 'visa_status_select', 'visa_status_other']);
    const clean: Record<string, unknown> = Object.fromEntries(
      Object.entries(raw).filter(([k, v]) => !excluded.has(k) && v !== '' && v !== null),
    );
    if (phone)       clean['phone']           = phone;
    if (whatsapp)    clean['whatsapp_number'] = whatsapp;
    if (visaStatus)  clean['visa_status']     = visaStatus;

    // Arrays — always include even if empty
    clean['target_locations'] = Array.isArray(raw.target_locations) ? raw.target_locations : [];
    clean['hobbies']          = Array.isArray(raw.hobbies) ? raw.hobbies : [];

    // Compose reason_for_leaving in experience entries
    clean['experience'] = (raw.experience ?? [])
      .filter((e: any) => e.company_name?.trim() || e.job_title?.trim())
      .map((e: any) => {
        const { reason_for_leaving_select: sel, reason_for_leaving_other: other, currently_working: cw, ...rest } = e;
        return {
          ...rest,
          end_date: cw ? null : (rest.end_date || null),
          reason_for_leaving: sel === 'Other'
            ? (other?.trim() ? `Other: ${other.trim()}` : 'Other')
            : (sel || undefined),
        };
      });

    clean['education'] = (raw.education ?? []).filter((e: any) => e.institution?.trim() || e.degree?.trim());
    clean['skills']    = (raw.skills    ?? []).filter((s: any) => s.skill_name?.trim());
    clean['languages'] = (raw.languages ?? []).filter((l: any) => l.language?.trim());

    // Attach staged file relative paths
    Object.entries(this.stagedRelative).forEach(([type, relativePath]) => {
      const field = this.typeToField[type];
      if (field) clean[field] = relativePath;
    });

    // ── Change detection ──────────────────────────────────────────────────────
    // Compare every field in clean against the original snapshot.
    // Also detect any field present in originalSnapshot but absent/cleared in clean.
    const mediaFields = new Set(['profile_photo_url', 'resume_url', 'intro_video_url']);
    const allKeys = new Set([...Object.keys(clean), ...Object.keys(this.originalSnapshot)]);
    const changedPayload: Record<string, unknown> = {};

    for (const key of allKeys) {
      // Staged media is always a real change — include as-is
      if (mediaFields.has(key)) {
        if (key in clean) changedPayload[key] = clean[key];
        continue;
      }
      const current  = key in clean                  ? clean[key]                  : null;
      const original = key in this.originalSnapshot  ? this.originalSnapshot[key]  : null;
      if (!this.deepEqual(current, original)) {
        // Include the new value (null if the field was cleared)
        changedPayload[key] = key in clean ? clean[key] : null;
      }
    }

    if (Object.keys(changedPayload).length === 0) {
      this.submitting = false;
      this.toast.show('No changes detected. Modify at least one field before submitting.', 'info');
      return;
    }

    this.editRequestService.submit(changedPayload).subscribe({
      next: (res) => {
        this.submitting      = false;
        this.existingRequest = res.request;
        this.staged          = {};
        this.stagedRelative  = {};
        this.toast.show('Edit request submitted — pending admin review.', 'success');
      },
      error: (err) => {
        this.submitting  = false;
        this.submitError = err?.error?.message ?? 'Failed to submit request.';
      },
    });
  }
}
