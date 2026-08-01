// src/app/features/candidate/edit-request/edit-request.component.ts
import { Component, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { LocaleDatePipe } from '../../../core/pipes/locale-date.pipe';
import { CandidateService } from '../../../core/services/candidate.service';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { Candidate } from '../../../core/models/candidate.model';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService, MasterCatalogCategory } from '../../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { EMPLOYMENT_STATUS_OPTIONS, VISA_STATUS_OPTIONS, REASON_FOR_LEAVING_OPTIONS } from '../../../core/constants/candidate-options';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { LanguageService } from '../../../core/services/language.service';
import { BulkTranslationService } from '../../../core/services/bulk-translation.service';

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

// ── Email validator ────────────────────────────────────────────────────────
function emailValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return ok ? null : { invalidEmail: true };
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
  imports: [LocaleDatePipe, CommonModule, ReactiveFormsModule, TranslateModule, PageHeaderComponent, SearchableSelectComponent, ChipMultiSelectComponent],
   template: `
     <app-page-header
       [title]="'CANDIDATE_EDIT_REQUEST.title' | translate"
       [subtitle]="'CANDIDATE_EDIT_REQUEST.subtitle' | translate"
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
            @if (existingRequest.status === 'pending')  { {{ 'CANDIDATE_EDIT_REQUEST.pending_review' | translate }} }
            @if (existingRequest.status === 'approved') { {{ 'COMMON.approved' | translate }} }
            @if (existingRequest.status === 'rejected') { {{ 'COMMON.rejected' | translate }} }
          </div>
          <div class="status-banner__text">
            {{ 'CANDIDATE_EDIT_REQUEST.submitted_on' | translate }} {{ existingRequest.created_at | localeDate:'dd MMM yyyy' }}
            @if (existingRequest.reviewed_at) {
              · {{ 'CANDIDATE_EDIT_REQUEST.reviewed_on' | translate }} {{ existingRequest.reviewed_at | localeDate:'dd MMM yyyy' }}
            }
          </div>
          @if (existingRequest.admin_note) {
            <div class="mt-1 small"><strong>{{ 'COMMON.admin_note' | translate }}:</strong> {{ existingRequest.admin_note }}</div>
          }
          @if (existingRequest.status === 'pending') {
            <div class="mt-2 small text-muted">{{ 'CANDIDATE_EDIT_REQUEST.pending_cannot_submit' | translate }}</div>
          }
        </div>
      </div>
    }

     @if (loadingProfile) {
       <div class="loading-state">
         <div class="spinner-border"></div>
         <div class="loading-state__text">{{ 'COMMON.loading_profile' | translate }}</div>
       </div>
    } @else if (candidate && form) {

      <!-- ══ Section: Media ════════════════════════════════════════════════ -->
       <div class="form-card mb-4">
         <h5 class="card-section-header card-section-header--warning mb-1">
           <i class="bi bi-images"></i> {{ 'CANDIDATE_EDIT_REQUEST.media_documents' | translate }}
         </h5>
         <p class="text-muted small mb-4">
           <i class="bi bi-shield-lock-fill text-warning me-1"></i>
           {{ 'CANDIDATE_EDIT_REQUEST.media_note' | translate }}
         </p>

        <div class="row g-4">

          <!-- Profile Photo -->
          <div class="col-md-4">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-person-circle me-1"></i> {{ 'COMMON.profile_photo' | translate }}
              </div>
              <div class="media-upload-cell__preview">
                @if (staged['profiles'] || candidate.profile_photo_url) {
                  <img [src]="staged['profiles'] ?? candidate.profile_photo_url"
                    alt="Profile photo" class="media-upload-cell__img"
                    (error)="$any($event.target).style.display='none'">
                  @if (staged['profiles']) {
                    <div class="media-upload-cell__staged-badge">
                      <i class="bi bi-clock-fill me-1"></i>{{ 'CANDIDATE_EDIT_REQUEST.pending_approval' | translate }}
                    </div>
                  }
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('image', (staged['profiles'] ?? candidate.profile_photo_url)!, 'Profile Photo')"
                      [title]="'CANDIDATE_EDIT.preview' | translate">
                      <i class="bi bi-eye"></i>
                    </button>
                    @if (staged['profiles']) {
                      <button type="button"
                        class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                        (click)="clearStaged('profiles')" [title]="'CANDIDATE_EDIT_REQUEST.cancel_staged_change' | translate">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-person-circle"></i>
                    <span>{{ 'MY_PROFILE.no_photo' | translate }}</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['profiles'] || existingRequest?.status === 'pending'">
                @if (mediaLoading['profiles']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> {{ 'CANDIDATE_EDIT_REQUEST.staging' | translate }}
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ staged['profiles'] ? ('CANDIDATE_EDIT_REQUEST.change_staged_file' | translate) : (candidate.profile_photo_url ? ('CANDIDATE_EDIT_REQUEST.request_replace' | translate) : ('CANDIDATE_EDIT_REQUEST.request_upload' | translate)) }}
                }
                <input type="file" class="d-none" accept="image/jpeg,image/png,image/webp"
                  [disabled]="existingRequest?.status === 'pending'"
                  (change)="stageFile('profiles', $event)">
              </label>
              <div class="form-text text-muted mt-2">
                <i class="bi bi-info-circle me-1"></i>{{ 'CANDIDATE_EDIT_REQUEST.photo_guidance' | translate }}
              </div>
            </div>
          </div>

          <!-- Resume / CV -->
          <div class="col-md-4">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-file-earmark-person me-1"></i> {{ 'MY_PROFILE.resume' | translate }}
              </div>
              <div class="media-upload-cell__preview">
                @if (staged['resumes'] || candidate.resume_url) {
                  <div class="media-upload-cell__doc-card">
                    <i class="bi bi-file-earmark-pdf-fill"
                      style="font-size:2rem;color:var(--th-rose)"></i>
                    <span class="media-upload-cell__doc-name">
                      {{ staged['resumes'] ? ('CANDIDATE_EDIT_REQUEST.new_cv_staged' | translate) : ('CANDIDATE_EDIT_REQUEST.cv_uploaded' | translate) }}
                    </span>
                  </div>
                  @if (staged['resumes']) {
                    <div class="media-upload-cell__staged-badge">
                      <i class="bi bi-clock-fill me-1"></i>{{ 'CANDIDATE_EDIT_REQUEST.pending_approval' | translate }}
                    </div>
                  }
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('pdf', (staged['resumes'] ?? candidate.resume_url)!, 'Resume / CV')"
                      [title]="'CANDIDATE_EDIT.preview' | translate">
                      <i class="bi bi-eye"></i>
                    </button>
                    @if (staged['resumes']) {
                      <button type="button"
                        class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                        (click)="clearStaged('resumes')" [title]="'CANDIDATE_EDIT_REQUEST.cancel_staged_change' | translate">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-file-earmark-person"></i>
                    <span>{{ 'MY_PROFILE.no_resume' | translate }}</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['resumes'] || existingRequest?.status === 'pending'">
                @if (mediaLoading['resumes']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> {{ 'CANDIDATE_EDIT_REQUEST.staging' | translate }}
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ staged['resumes'] ? ('CANDIDATE_EDIT_REQUEST.change_staged_file' | translate) : (candidate.resume_url ? ('CANDIDATE_EDIT_REQUEST.request_replace' | translate) : ('CANDIDATE_EDIT_REQUEST.request_upload' | translate)) }}
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
                <i class="bi bi-camera-video me-1"></i> {{ 'CANDIDATE_PROFILE.intro_video' | translate }}
              </div>
              <div class="media-upload-cell__preview">
                @if (staged['videos'] || candidate.intro_video_url) {
                  <div class="media-upload-cell__doc-card">
                    <i class="bi bi-camera-video-fill"
                      style="font-size:2rem;color:var(--th-primary)"></i>
                    <span class="media-upload-cell__doc-name">
                      {{ staged['videos'] ? ('CANDIDATE_EDIT_REQUEST.new_video_staged' | translate) : ('CANDIDATE_EDIT_REQUEST.video_uploaded' | translate) }}
                    </span>
                  </div>
                  @if (staged['videos']) {
                    <div class="media-upload-cell__staged-badge">
                      <i class="bi bi-clock-fill me-1"></i>{{ 'CANDIDATE_EDIT_REQUEST.pending_approval' | translate }}
                    </div>
                  }
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('video', (staged['videos'] ?? candidate.intro_video_url)!, 'Intro Video')"
                      [title]="'CANDIDATE_EDIT.preview' | translate">
                      <i class="bi bi-eye"></i>
                    </button>
                    @if (staged['videos']) {
                      <button type="button"
                        class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                        (click)="clearStaged('videos')" [title]="'CANDIDATE_EDIT_REQUEST.cancel_staged_change' | translate">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-camera-video"></i>
                    <span>{{ 'MY_PROFILE.no_video' | translate }}</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['videos'] || existingRequest?.status === 'pending'">
                @if (mediaLoading['videos']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> {{ 'CANDIDATE_EDIT_REQUEST.staging' | translate }}
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ staged['videos'] ? ('CANDIDATE_EDIT_REQUEST.change_staged_file' | translate) : (candidate.intro_video_url ? ('CANDIDATE_EDIT_REQUEST.request_replace' | translate) : ('CANDIDATE_EDIT_REQUEST.request_upload' | translate)) }}
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

        @if (previewsTranslating) {
          <div class="d-flex align-items-center gap-2 mb-3" style="font-size:.8rem;color:var(--th-text-muted)">
            <span class="spinner-border spinner-border-sm"></span>
            {{ 'COMMON.translating' | translate }}…
          </div>
        }

        <!-- ── Personal ───────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header"><i class="bi bi-person"></i> {{ 'CANDIDATE_EDIT_REQUEST.personal_information' | translate }}</h5>
          <div class="row g-3">

            <!-- First Name -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">{{ 'MY_PROFILE.first_name' | translate }} <span class="text-danger">*</span></label>
              <input formControlName="first_name" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('first_name')?.invalid && form!.get('first_name')?.touched">
              @if (form!.get('first_name')?.touched && form!.get('first_name')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('first_name')?.errors?.['required'])       { {{ 'CANDIDATE_EDIT_REQUEST.first_name_required' | translate }} }
                  @else if (form!.get('first_name')?.errors?.['minlength']) { {{ 'CANDIDATE_EDIT_REQUEST.min_3_chars' | translate }} }
                  @else if (form!.get('first_name')?.errors?.['maxlength']) { {{ 'CANDIDATE_EDIT_REQUEST.max_100_chars' | translate }} }
                  @else if (form!.get('first_name')?.errors?.['pattern'])   { {{ 'CANDIDATE_EDIT_REQUEST.name_pattern_invalid' | translate }} }
                </div>
              }
            </div>

            <!-- Last Name -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">{{ 'MY_PROFILE.last_name' | translate }} <span class="text-danger">*</span></label>
              <input formControlName="last_name" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('last_name')?.invalid && form!.get('last_name')?.touched">
              @if (form!.get('last_name')?.touched && form!.get('last_name')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('last_name')?.errors?.['required'])       { {{ 'CANDIDATE_EDIT_REQUEST.last_name_required' | translate }} }
                  @else if (form!.get('last_name')?.errors?.['minlength']) { {{ 'CANDIDATE_EDIT_REQUEST.min_3_chars' | translate }} }
                  @else if (form!.get('last_name')?.errors?.['maxlength']) { {{ 'CANDIDATE_EDIT_REQUEST.max_100_chars' | translate }} }
                  @else if (form!.get('last_name')?.errors?.['pattern'])   { {{ 'CANDIDATE_EDIT_REQUEST.name_pattern_invalid' | translate }} }
                </div>
              }
            </div>

            <!-- Date of Birth -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'MY_PROFILE.date_of_birth' | translate }} <span class="text-danger">*</span></label>
              <input formControlName="date_of_birth" type="date" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('date_of_birth')?.invalid && form!.get('date_of_birth')?.touched"
                [max]="(currentYear - 16) + '-12-31'"
                [min]="(currentYear - 100) + '-01-01'">
              @if (form!.get('date_of_birth')?.touched && form!.get('date_of_birth')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('date_of_birth')?.errors?.['required'])    { {{ 'CANDIDATE_EDIT_REQUEST.dob_required' | translate }} }
                  @else if (form!.get('date_of_birth')?.errors?.['invalidDate'])  { {{ 'FORMS.invalid_date' | translate }} }
                  @else if (form!.get('date_of_birth')?.errors?.['futureDate'])   { {{ 'CANDIDATE_EDIT_REQUEST.dob_future' | translate }} }
                  @else if (form!.get('date_of_birth')?.errors?.['tooYoung'])     { {{ 'CANDIDATE_EDIT_REQUEST.dob_too_young' | translate }} }
                  @else if (form!.get('date_of_birth')?.errors?.['tooOld'])       { {{ 'CANDIDATE_EDIT_REQUEST.dob_invalid' | translate }} }
                </div>
              }
            </div>

            <!-- Gender -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'FILTER.gender' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="gender"
                [options]="genderOptions"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.select_gender' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('gender')?.invalid && form!.get('gender')?.touched)">
              </app-searchable-select>
              @if (form!.get('gender')?.invalid && form!.get('gender')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.gender_required' | translate }}</div>
              }
            </div>

            <!-- Marital Status -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_PROFILE.marital_status' | translate }}</label>
              <app-searchable-select
                formControlName="marital_status"
                [options]="maritalStatusOptions"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.select_status' | translate"
                [allowClear]="true">
              </app-searchable-select>
            </div>

            <!-- Phone -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">{{ 'COMMON.phone' | translate }} <span class="text-danger">*</span></label>
              <div class="phone-input-group">
                <app-searchable-select
                  formControlName="phone_dial_code"
                  [options]="dialCodeOptions()"
                  placeholder="🌐"
                  class="dial-select">
                </app-searchable-select>
                <input formControlName="phone_number" class="form-control form-control-sm phone-number-input"
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_phone_number' | translate"
                  [class.is-invalid]="form!.get('phone_number')?.invalid && form!.get('phone_number')?.touched">
              </div>
              @if (form!.get('phone_number')?.touched && form!.get('phone_number')?.errors) {
                <div class="text-danger small mt-1">
                  @if (form!.get('phone_number')?.errors?.['required'])         { {{ 'CANDIDATE_EDIT_REQUEST.phone_required' | translate }} }
                  @else if (form!.get('phone_number')?.errors?.['phoneInvalid']) { {{ form!.get('phone_number')?.errors?.['phoneInvalid'] }} }
                </div>
              }
            </div>

            <!-- WhatsApp -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.whatsapp_label' | translate }} <span class="text-danger">*</span></label>
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
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_phone_number' | translate"
                  [class.bg-light]="form!.get('whatsapp_same_as_phone')?.value"
                  [class.is-invalid]="form!.get('whatsapp_number')?.invalid && form!.get('whatsapp_number')?.touched"
                  [attr.readonly]="form!.get('whatsapp_same_as_phone')?.value ? true : null">
              </div>
              <div class="form-check mt-1">
                <input class="form-check-input" type="checkbox"
                  formControlName="whatsapp_same_as_phone" id="wa_same_er">
                <label class="form-check-label small text-muted" for="wa_same_er">{{ 'CANDIDATE_EDIT_REQUEST.same_as_phone' | translate }}</label>
              </div>
              @if (form!.get('whatsapp_number')?.touched && form!.get('whatsapp_number')?.errors) {
                <div class="text-danger small mt-1">
                  @if (form!.get('whatsapp_number')?.errors?.['required'])          { {{ 'CANDIDATE_EDIT_REQUEST.whatsapp_required' | translate }} }
                  @else if (form!.get('whatsapp_number')?.errors?.['phoneInvalid']) { {{ form!.get('whatsapp_number')?.errors?.['phoneInvalid'] }} }
                </div>
              }
            </div>

            <!-- Email Address -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">{{ 'MY_PROFILE.email' | translate }} <span class="text-danger">*</span></label>
              <input type="email" formControlName="email" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('email')?.invalid && form!.get('email')?.touched"
                [attr.disabled]="existingRequest?.status === 'pending' ? true : null"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_email' | translate" autocomplete="off">
              @if (form!.get('email')?.touched && form!.get('email')?.errors) {
                <div class="invalid-feedback d-block small">
                  @if (form!.get('email')?.errors?.['required'])          { {{ 'CANDIDATE_EDIT_REQUEST.email_required' | translate }} }
                  @else if (form!.get('email')?.errors?.['invalidEmail']) { {{ 'FORMS.invalid_email' | translate }} }
                </div>
              }
            </div>

            <!-- LinkedIn -->
            <div class="col-12">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.linkedin_url' | translate }}</label>
              <input formControlName="linkedin_url" class="form-control form-control-sm"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_linkedin_url' | translate"
                [class.is-invalid]="form!.get('linkedin_url')?.invalid && form!.get('linkedin_url')?.touched">
              @if (form!.get('linkedin_url')?.invalid && form!.get('linkedin_url')?.touched) {
                <div class="invalid-feedback d-block small">
                  {{ 'CANDIDATE_EDIT_REQUEST.linkedin_invalid' | translate }}
                </div>
              }
            </div>

            <!-- Bio -->
            <div class="col-12">
              <label class="form-label small fw-semibold">{{ 'MY_PROFILE.bio' | translate }}</label>
              <textarea formControlName="bio" class="form-control form-control-sm" rows="3"
                [class.is-invalid]="form!.get('bio')?.invalid && form!.get('bio')?.dirty"></textarea>
              <small class="d-block text-end mt-1"
                [class.text-success]="bioWordCount <= BIO_WORD_LIMIT"
                [class.text-danger]="bioWordCount > BIO_WORD_LIMIT">
                {{ 'CANDIDATE_EDIT_REQUEST.word_count' | translate:{ count: bioWordCount, limit: BIO_WORD_LIMIT } }}
              </small>
              @if (form!.get('bio')?.errors?.['bioWordLimit'] && form!.get('bio')?.dirty) {
                <div class="text-danger small mt-1">
                  {{ 'CANDIDATE_EDIT_REQUEST.bio_word_limit_exceeded' | translate }}
                </div>
              }
            </div>

          </div>
        </div>

        <!-- ── Professional ───────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--info">
            <i class="bi bi-briefcase"></i> {{ 'CANDIDATE_EDIT_REQUEST.professional' | translate }}
          </h5>
          <div class="row g-3">

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'RECRUITER_CANDIDATES.job_title' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="job_title"
                [options]="jobTitleOptions()"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_senior_developer' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('job_title')?.invalid && form!.get('job_title')?.touched)">
              </app-searchable-select>
              @if (form!.get('job_title')?.invalid && form!.get('job_title')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.job_title_required' | translate }}</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.occupation' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="occupation"
                [options]="occupationOptions()"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_software_engineer' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('occupation')?.invalid && form!.get('occupation')?.touched)">
              </app-searchable-select>
              @if (form!.get('occupation')?.invalid && form!.get('occupation')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.occupation_required' | translate }}</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'RECRUITER_CANDIDATES.industry' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="industry"
                [options]="industryOptions()"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_technology' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('industry')?.invalid && form!.get('industry')?.touched)">
              </app-searchable-select>
              @if (form!.get('industry')?.invalid && form!.get('industry')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.industry_required' | translate }}</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_PROFILE.employment_status' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="employment_status"
                [options]="employmentStatusOptions"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.select_status' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('employment_status')?.invalid && form!.get('employment_status')?.touched)">
              </app-searchable-select>
              @if (form!.get('employment_status')?.invalid && form!.get('employment_status')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.employment_status_required' | translate }}</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.notice_period' | translate }}</label>
              <app-searchable-select
                formControlName="notice_period_id"
                [options]="noticePeriodOptions()"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.select_notice_period' | translate"
                [allowClear]="true">
              </app-searchable-select>
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.years_experience' | translate }}
                <span class="badge bg-primary ms-2">{{ form.get('years_experience')?.value ?? 0 }} {{ 'FILTER.yrs' | translate }}</span>
              </label>
              <input formControlName="years_experience" type="range" min="0" max="25" step="1"
                class="experience-slider"
                [style.--fill]="((form.get('years_experience')?.value ?? 0) / 25 * 100) + '%'">
              <div class="d-flex justify-content-between" style="font-size:.7rem;color:var(--th-text-secondary)">
                <span>0 {{ 'FILTER.yrs' | translate }}</span><span>25 {{ 'FILTER.yrs' | translate }}</span>
              </div>
            </div>

            <!-- Visa Status -->
            <div class="col-md-6">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_PROFILE.visa_work_permit' | translate }}</label>
              <app-searchable-select
                formControlName="visa_status_select"
                [options]="visaStatusOptions"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.select_visa_status' | translate"
                [allowClear]="true">
              </app-searchable-select>
            </div>
            @if (form!.get('visa_status_select')?.value === 'other') {
              <div class="col-md-6">
                <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.specify_visa_status' | translate }}</label>
                <input formControlName="visa_status_other" class="form-control form-control-sm"
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.describe_visa_status' | translate">
              </div>
            }

          </div>
        </div>

        <!-- ── Location ───────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--success">
            <i class="bi bi-geo-alt"></i> {{ 'COMMON.location' | translate }}
          </h5>
          <div class="row g-3">

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.current_country' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="current_country"
                [options]="countryOptions()"
                [placeholder]="'CANDIDATE_PROFILE.select_country' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('current_country')?.invalid && form!.get('current_country')?.touched)">
              </app-searchable-select>
              @if (form!.get('current_country')?.invalid && form!.get('current_country')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.current_country_required' | translate }}</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.current_city' | translate }} <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="current_city"
                [options]="cityOptions()"
                [placeholder]="'RECRUITER_CREATE.select_city' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('current_city')?.invalid && form!.get('current_city')?.touched)">
              </app-searchable-select>
              @if (form!.get('current_city')?.invalid && form!.get('current_city')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.current_city_required' | translate }}</div>
              }
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_EDIT_REQUEST.postal_zip_code' | translate }}</label>
              <input formControlName="postal_code" class="form-control form-control-sm"
                [class.is-invalid]="form!.get('postal_code')?.invalid && form!.get('postal_code')?.touched"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.postal_code' | translate">
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
                <label class="form-check-label small fw-semibold" for="er_has_passport">{{ 'CANDIDATE_EDIT_REQUEST.has_valid_passport' | translate }}</label>
              </div>
            </div>

            <!-- Nationality -->
            <div class="col-md-4">
              <label class="form-label small fw-semibold">
                {{ 'MY_PROFILE.nationality' | translate }}
                @if (form!.get('has_passport')?.value) { <span class="text-danger">*</span> }
                @else { <span class="text-muted">({{ 'FORMS.optional' | translate }})</span> }
              </label>
              <app-searchable-select
                formControlName="nationality"
                [options]="countryOptions()"
                [placeholder]="'CANDIDATE_EDIT_REQUEST.select_nationality' | translate"
                [allowClear]="true"
                [invalid]="!!(form!.get('nationality')?.invalid && form!.get('nationality')?.touched)">
              </app-searchable-select>
              @if (form!.get('nationality')?.invalid && form!.get('nationality')?.touched) {
                <div class="text-danger small mt-1">{{ 'CANDIDATE_EDIT_REQUEST.nationality_required_passport' | translate }}</div>
              }
            </div>

            <!-- Target Locations -->
            <div class="col-12">
              <label class="form-label small fw-semibold">{{ 'CANDIDATE_PROFILE.target_locations' | translate }}</label>
              <app-chip-multi-select
                formControlName="target_locations"
                [options]="targetLocationChipOptions()">
              </app-chip-multi-select>
              <small class="text-muted">{{ 'CANDIDATE_EDIT_REQUEST.target_locations_hint' | translate }}</small>
            </div>

          </div>
        </div>

        <!-- ── Skills ─────────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header card-section-header--purple mb-0">
              <i class="bi bi-tools"></i> {{ 'MY_PROFILE.skills' | translate }}
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addSkill()">{{ 'CANDIDATE_EDIT_REQUEST.add_btn' | translate }}</button>
          </div>
          @if (skillsArray.length) {
            <div class="row g-2 mb-1">
              <div class="col"><label class="form-label form-label-sm mb-0">{{ 'CANDIDATE_EDIT_REQUEST.skill_name' | translate }} <span class="text-danger">*</span></label></div>
              <div class="col"><label class="form-label form-label-sm mb-0">{{ 'CANDIDATE_EDIT_REQUEST.proficiency' | translate }}</label></div>
              <div class="col-auto" style="width:5rem"></div>
            </div>
          }
          @for (ctrl of skillsArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-center">
              <div class="col">
                <input formControlName="skill_name" class="form-control form-control-sm"
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_skill' | translate"
                  [class.is-invalid]="asGroup(ctrl).get('skill_name')!.invalid && asGroup(ctrl).get('skill_name')!.touched">
                @if (asGroup(ctrl).get('skill_name')!.invalid && asGroup(ctrl).get('skill_name')!.touched) {
                  <div class="invalid-feedback">{{ 'CANDIDATE_EDIT_REQUEST.skill_name_required' | translate }}</div>
                }
              </div>
              <div class="col">
                <app-searchable-select
                  formControlName="proficiency"
                  [options]="proficiencySkillOptions"
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.select_placeholder' | translate"
                  [allowClear]="false"
                  [invalid]="asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched">
                </app-searchable-select>
                @if (asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched) {
                  <div class="text-danger" style="font-size:.875em;margin-top:.25rem">{{ 'CANDIDATE_EDIT_REQUEST.select_proficiency_level' | translate }}</div>
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
              <i class="bi bi-translate"></i> {{ 'MASTER_DATA.languages' | translate }}
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addLanguage()">{{ 'CANDIDATE_EDIT_REQUEST.add_btn' | translate }}</button>
          </div>
          @if (languagesArray.length) {
            <div class="row g-2 mb-1">
              <div class="col"><label class="form-label form-label-sm mb-0">{{ 'CANDIDATE_EDIT_REQUEST.language_label' | translate }} <span class="text-danger">*</span></label></div>
              <div class="col"><label class="form-label form-label-sm mb-0">{{ 'CANDIDATE_EDIT_REQUEST.proficiency' | translate }}</label></div>
              <div class="col-auto" style="width:5rem"></div>
            </div>
          }
          @for (ctrl of languagesArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-center">
              <div class="col">
                <app-searchable-select
                  formControlName="language"
                  [options]="languageOptions()"
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_language' | translate"
                  [invalid]="asGroup(ctrl).get('language')!.invalid && asGroup(ctrl).get('language')!.touched">
                </app-searchable-select>
                @if (asGroup(ctrl).get('language')!.invalid && asGroup(ctrl).get('language')!.touched) {
                  <div class="invalid-feedback d-block small">{{ 'CANDIDATE_EDIT_REQUEST.language_name_required' | translate }}</div>
                }
              </div>
              <div class="col">
                <app-searchable-select
                  formControlName="proficiency"
                  [options]="proficiencyLangOptions"
                  [placeholder]="'CANDIDATE_EDIT_REQUEST.select_placeholder' | translate"
                  [allowClear]="false"
                  [invalid]="asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched">
                </app-searchable-select>
                @if (asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched) {
                  <div class="text-danger" style="font-size:.875em;margin-top:.25rem">{{ 'CANDIDATE_EDIT_REQUEST.select_proficiency_level' | translate }}</div>
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
              <i class="bi bi-building"></i> {{ 'MY_PROFILE.experience' | translate }}
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addExperience()">{{ 'CANDIDATE_EDIT_REQUEST.add_btn' | translate }}</button>
          </div>
          @for (ctrl of experienceArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="glass-card p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold small text-muted"><i class="bi bi-briefcase me-1"></i> {{ 'CANDIDATE_EDIT_REQUEST.experience_number' | translate:{ n: $index + 1 } }}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeExperience($index)">{{ 'BUTTONS.remove' | translate }}</button>
              </div>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'RECRUITER_CANDIDATES.job_title' | translate }} <span class="text-danger">*</span></label>
                  <input formControlName="job_title" class="form-control form-control-sm" [placeholder]="'RECRUITER_CANDIDATES.job_title' | translate"
                    [class.is-invalid]="asGroup(ctrl).get('job_title')!.invalid && asGroup(ctrl).get('job_title')!.touched">
                  @if (asGroup(ctrl).get('job_title')!.invalid && asGroup(ctrl).get('job_title')!.touched) {
                    <div class="invalid-feedback">{{ 'CANDIDATE_EDIT_REQUEST.job_title_required' | translate }}</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'COMMON.company' | translate }} <span class="text-danger">*</span></label>
                  <input formControlName="company_name" class="form-control form-control-sm" [placeholder]="'COMMON.company' | translate"
                    [class.is-invalid]="asGroup(ctrl).get('company_name')!.invalid && asGroup(ctrl).get('company_name')!.touched">
                  @if (asGroup(ctrl).get('company_name')!.invalid && asGroup(ctrl).get('company_name')!.touched) {
                    <div class="invalid-feedback">{{ 'CANDIDATE_EDIT_REQUEST.company_required' | translate }}</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.start_date' | translate }} <span class="text-danger">*</span></label>
                  <input formControlName="start_date" type="date" class="form-control form-control-sm"
                    [class.is-invalid]="asGroup(ctrl).get('start_date')!.invalid && asGroup(ctrl).get('start_date')!.touched">
                  @if (asGroup(ctrl).get('start_date')!.invalid && asGroup(ctrl).get('start_date')!.touched) {
                    <div class="invalid-feedback">{{ 'CANDIDATE_EDIT_REQUEST.start_date_required' | translate }}</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.end_date' | translate }}</label>
                  @if (!asGroup(ctrl).get('currently_working')?.value) {
                    <input formControlName="end_date" type="date" class="form-control form-control-sm">
                  } @else {
                    <div class="form-control form-control-sm bg-success-subtle text-success fw-semibold">{{ 'COMMON.present' | translate }}</div>
                  }
                  <div class="form-check mt-1">
                    <input type="checkbox" class="form-check-input" formControlName="currently_working" id="erCw_{{$index}}">
                    <label class="form-check-label small text-muted" for="erCw_{{$index}}">{{ 'CANDIDATE_EDIT_REQUEST.currently_here' | translate }}</label>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'COMMON.location' | translate }} <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="location"
                    [options]="countryOptions()"
                    [placeholder]="'CANDIDATE_EDIT_REQUEST.country_city' | translate"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">{{ 'CANDIDATE_EDIT_REQUEST.location_required' | translate }}</div>
                  }
                </div>
                <div class="col-12">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.description' | translate }}</label>
                  <textarea formControlName="description" class="form-control form-control-sm"
                    rows="2" [placeholder]="'CANDIDATE_EDIT_REQUEST.brief_description_responsibilities' | translate"></textarea>
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.reason_for_leaving' | translate }} <span class="text-muted fw-normal" style="font-size:.7rem">({{ 'FORMS.optional' | translate }})</span></label>
                  <app-searchable-select
                    formControlName="reason_for_leaving_select"
                    [options]="reasonForLeavingOptions"
                    [placeholder]="'CANDIDATE_EDIT_REQUEST.select_placeholder' | translate"
                    [allowClear]="true">
                  </app-searchable-select>
                </div>
                @if (asGroup(ctrl).get('reason_for_leaving_select')?.value === 'Other') {
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.please_specify' | translate }}</label>
                    <input formControlName="reason_for_leaving_other" class="form-control form-control-sm" [placeholder]="'CANDIDATE_EDIT_REQUEST.briefly_describe_reason' | translate">
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
              <i class="bi bi-mortarboard"></i> {{ 'MY_PROFILE.education' | translate }}
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addEducation()">{{ 'CANDIDATE_EDIT_REQUEST.add_btn' | translate }}</button>
          </div>
          @for (ctrl of educationArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="glass-card p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold small text-muted"><i class="bi bi-mortarboard me-1"></i> {{ 'CANDIDATE_EDIT_REQUEST.education_number' | translate:{ n: $index + 1 } }}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeEducation($index)">{{ 'BUTTONS.remove' | translate }}</button>
              </div>
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.institution' | translate }} <span class="text-danger">*</span></label>
                  <input formControlName="institution" class="form-control form-control-sm" [placeholder]="'CANDIDATE_EDIT_REQUEST.institution' | translate"
                    [class.is-invalid]="asGroup(ctrl).get('institution')!.invalid && asGroup(ctrl).get('institution')!.touched">
                  @if (asGroup(ctrl).get('institution')!.invalid && asGroup(ctrl).get('institution')!.touched) {
                    <div class="invalid-feedback">{{ 'CANDIDATE_EDIT_REQUEST.institution_required' | translate }}</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.degree' | translate }} <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="degree"
                    [options]="degreeOptions()"
                    [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_degree' | translate"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('degree')!.invalid && asGroup(ctrl).get('degree')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('degree')!.invalid && asGroup(ctrl).get('degree')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">{{ 'CANDIDATE_EDIT_REQUEST.degree_required' | translate }}</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.field_of_study' | translate }} <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="field_of_study"
                    [options]="fieldOfStudyOptions()"
                    [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_field_of_study' | translate"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('field_of_study')!.invalid && asGroup(ctrl).get('field_of_study')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('field_of_study')!.invalid && asGroup(ctrl).get('field_of_study')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">{{ 'CANDIDATE_EDIT_REQUEST.field_of_study_required' | translate }}</div>
                  }
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.start_label' | translate }}</label>
                  <div class="d-flex gap-1">
                    <select class="form-select form-select-sm" formControlName="start_month" style="width:80px">
                      @for (m of MONTHS; track m.value) {
                        <option [ngValue]="m.value">{{ monthLabel(m.value) }}</option>
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
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.end_expected' | translate }}</label>
                  <div class="d-flex gap-1">
                    <select class="form-select form-select-sm" formControlName="end_month" style="width:80px">
                      @for (m of MONTHS; track m.value) {
                        <option [ngValue]="m.value">{{ monthLabel(m.value) }}</option>
                      }
                    </select>
                    <input formControlName="end_year" type="number" class="form-control form-control-sm" placeholder="YYYY"
                      [class.is-invalid]="asGroup(ctrl).get('end_year')!.invalid && asGroup(ctrl).get('end_year')!.touched">
                  </div>
                  @if (asGroup(ctrl).get('end_year')!.errors?.['eduYearInvalid'] && asGroup(ctrl).get('end_year')!.touched) {
                    <div class="invalid-feedback d-block">{{ asGroup(ctrl).get('end_year')!.errors?.['eduYearInvalid'] }}</div>
                  }
                  @if (asGroup(ctrl).get('end_year')!.errors?.['endBeforeStart'] && asGroup(ctrl).get('end_year')!.touched) {
                    <div class="invalid-feedback d-block">{{ 'CANDIDATE_EDIT_REQUEST.end_before_start' | translate }}</div>
                  }
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.country_of_institution' | translate }} <span class="text-danger">*</span></label>
                  <app-searchable-select
                    formControlName="location"
                    [options]="countryOptions()"
                    [placeholder]="'CANDIDATE_PROFILE.select_country' | translate"
                    [allowClear]="true"
                    [invalid]="asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched">
                  </app-searchable-select>
                  @if (asGroup(ctrl).get('location')!.invalid && asGroup(ctrl).get('location')!.touched) {
                    <div class="text-danger" style="font-size:.875em;margin-top:.25rem">{{ 'CANDIDATE_EDIT_REQUEST.location_required' | translate }}</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- ── Hobbies & Interests ─────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--teal">
            <i class="bi bi-stars"></i> {{ 'MY_PROFILE.hobbies_interests' | translate }}
          </h5>
          <app-chip-multi-select
            formControlName="hobbies"
            [options]="hobbyChipOptions()">
          </app-chip-multi-select>
          <small class="text-muted mt-2 d-block">{{ 'CANDIDATE_EDIT_REQUEST.hobbies_hint' | translate }}</small>
        </div>

        <!-- ── Certificates ───────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header mb-0">
              <i class="bi bi-patch-check"></i> {{ 'CANDIDATE_PROFILE.certificates' | translate }}
              @if (certificateArray.length) {
                <span class="badge bg-secondary rounded-pill ms-2" style="font-size:.7rem">
                  {{ certificateArray.length }}
                </span>
              }
            </h5>
            @if (!pendingNewCert) {
              <button type="button" class="btn btn-sm btn-outline-primary"
                [disabled]="existingRequest?.status === 'pending'"
                (click)="initNewCert()">
                <i class="bi bi-plus-lg me-1"></i>{{ 'CANDIDATE_EDIT_REQUEST.add_certificate' | translate }}
              </button>
            }
          </div>

          <!-- Existing certificates -->
          <div class="d-flex flex-column gap-2">
            @for (ctrl of certificateArray.controls; track $index) {
              <div class="d-flex align-items-start gap-2 p-2 rounded border"
                style="background:var(--th-surface-raised)">
                <i class="bi bi-file-earmark-check text-success flex-shrink-0 mt-1"></i>
                <div class="flex-grow-1 overflow-hidden">
                  <div class="small fw-semibold text-truncate">
                    {{ asGroup(ctrl).get('name')?.value || ('CANDIDATE_EDIT_REQUEST.certificate_fallback_name' | translate) }}
                  </div>
                  @if (asGroup(ctrl).get('issuer')?.value) {
                    <div class="text-muted" style="font-size:.75rem">
                      {{ asGroup(ctrl).get('issuer')?.value }}
                    </div>
                  }
                  <div class="text-muted" style="font-size:.72rem">
                    @if (asGroup(ctrl).get('issue_date')?.value) {
                      {{ 'CANDIDATE_PROFILE.issued_prefix' | translate }} {{ asGroup(ctrl).get('issue_date')?.value | localeDate:'dd MMM yyyy' }}
                    }
                    @if (asGroup(ctrl).get('no_expiry')?.value) { &nbsp;· {{ 'CANDIDATE_PROFILE.no_expiry' | translate }} }
                    @else if (asGroup(ctrl).get('expiry_date')?.value) {
                      &nbsp;· {{ 'COMMON.expires' | translate }}: {{ asGroup(ctrl).get('expiry_date')?.value | localeDate:'dd MMM yyyy' }}
                    }
                  </div>
                </div>
                <div class="d-flex gap-1 flex-shrink-0">
                  @if (asGroup(ctrl).get('file_url')?.value) {
                    <a [href]="asGroup(ctrl).get('file_url')?.value" target="_blank"
                      class="btn btn-sm btn-outline-secondary py-1 px-2" [title]="'CANDIDATE_EDIT_REQUEST.view_certificate' | translate">
                      <i class="bi bi-eye"></i>
                    </a>
                  }
                  <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2"
                    [title]="'CANDIDATE_EDIT_REQUEST.remove_certificate' | translate"
                    [disabled]="certDeleting === asGroup(ctrl).get('id')?.value || existingRequest?.status === 'pending'"
                    (click)="deleteCert(asGroup(ctrl).value)">
                    @if (certDeleting === asGroup(ctrl).get('id')?.value) {
                      <span class="spinner-border spinner-border-sm"></span>
                    } @else {
                      <i class="bi bi-trash"></i>
                    }
                  </button>
                </div>
              </div>
            }

            @if (!certificateArray.length && !pendingNewCert) {
              <div class="text-muted small py-1">
                {{ 'CANDIDATE_EDIT_REQUEST.no_certificates_yet' | translate }} <strong>{{ 'CANDIDATE_EDIT_REQUEST.add_certificate' | translate }}</strong> {{ 'CANDIDATE_EDIT_REQUEST.to_upload_one' | translate }}
              </div>
            }
          </div>

          <!-- New certificate form -->
          @if (pendingNewCert) {
            <div class="card border border-success mt-3">
              <div class="card-body p-3">
                <div class="fw-semibold small text-success mb-2">
                  <i class="bi bi-plus-circle me-1"></i>{{ 'CANDIDATE_EDIT_REQUEST.new_certificate' | translate }}
                </div>
                <div class="row g-2">
                  <div class="col-12 col-md-6">
                    <label class="form-label form-label-sm">
                      {{ 'FORMS.name' | translate }} <span class="text-danger">*</span>
                    </label>
                    <input type="text" class="form-control form-control-sm"
                      [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_certificate_name' | translate"
                      [value]="pendingNewCert.name"
                      (input)="pendingNewCert!.name = $any($event.target).value">
                  </div>
                  <div class="col-12 col-md-6">
                    <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.issuing_organisation' | translate }}</label>
                    <input type="text" class="form-control form-control-sm"
                      [placeholder]="'CANDIDATE_EDIT_REQUEST.eg_certificate_issuer' | translate"
                      [value]="pendingNewCert.issuer"
                      (input)="pendingNewCert!.issuer = $any($event.target).value">
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.issue_date' | translate }}</label>
                    <input type="date" class="form-control form-control-sm"
                      [value]="pendingNewCert.issue_date"
                      (input)="pendingNewCert!.issue_date = $any($event.target).value">
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label form-label-sm">{{ 'CANDIDATE_EDIT_REQUEST.expiry_date' | translate }}</label>
                    <input type="date" class="form-control form-control-sm"
                      [value]="pendingNewCert.expiry_date"
                      [disabled]="pendingNewCert.no_expiry"
                      (input)="pendingNewCert!.expiry_date = $any($event.target).value">
                  </div>
                  <div class="col-6 col-md-3 d-flex align-items-end pb-1">
                    <div class="form-check mb-0">
                      <input class="form-check-input" type="checkbox" id="new-cert-no-expiry"
                        [checked]="pendingNewCert.no_expiry"
                        (change)="toggleNewCertNoExpiry($event)">
                      <label class="form-check-label small" for="new-cert-no-expiry">{{ 'CANDIDATE_PROFILE.no_expiry' | translate }}</label>
                    </div>
                  </div>
                  <div class="col-6 col-md-3 d-flex align-items-end">
                    <label class="btn btn-sm btn-outline-secondary w-100 mb-0" style="cursor:pointer">
                      <i class="bi bi-paperclip me-1"></i>
                      {{ pendingNewCert.file ? pendingNewCert.file.name : ('CANDIDATE_EDIT_REQUEST.attach_file_required' | translate) }}
                      <input type="file" class="d-none"
                        accept=".pdf,image/jpeg,image/png"
                        (change)="onNewCertFileSelected($event)">
                    </label>
                  </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                  <button type="button" class="btn btn-sm btn-success"
                    [disabled]="mediaLoading['certificates']"
                    (click)="submitNewCert()">
                    @if (mediaLoading['certificates']) {
                      <span class="spinner-border spinner-border-sm me-1"></span>{{ 'MESSAGES.uploading' | translate }}
                    } @else {
                      <i class="bi bi-cloud-upload me-1"></i>{{ 'BUTTONS.upload' | translate }}
                    }
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary"
                    [disabled]="mediaLoading['certificates']"
                    (click)="cancelNewCert()">
                    {{ 'COMMON.cancel' | translate }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        @if (submitError) {
          <div class="alert alert-danger small">{{ submitError }}</div>
        }

        <div class="d-flex gap-2 mb-5">
          <button type="submit" class="btn btn-primary px-4"
            [disabled]="submitting || existingRequest?.status === 'pending' || form!.get('bio')?.invalid">
            {{ submitting ? (('COMMON.submitting' | translate) + '…') : ('CANDIDATE_EDIT_REQUEST.submit_btn' | translate) }}
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
                  <i class="bi bi-box-arrow-up-right me-1"></i> {{ 'COMMON.open_new_tab' | translate }}
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class EditRequestComponent implements OnInit, OnDestroy {
  candidate:       Candidate | null = null;
  loadingProfile   = true;
  form:            FormGroup | null = null;
  submitting       = false;
  submitError      = '';
  existingRequest: EditRequest | null = null;

  staged:         Record<string, string | null> = {};
  stagedRelative: Record<string, string> = {};
  mediaLoading:   Record<string, boolean> = {};

  // ── Field-value translation ──────────────────────────────────────────────
  // Translates the candidate's loaded text directly into the form controls
  // when the UI language isn't English, and restores the original values
  // when switching back to English.
  private bulkTranslation = inject(BulkTranslationService);
  private destroy$ = new Subject<void>();
  private translateRequestId = 0;
  previewsTranslating = false;

  // Certificate direct-upload state (live API, mirrors admin candidate-edit pattern)
  certDeleting: number | null = null;
  pendingNewCert: {
    name: string; issuer: string; issue_date: string;
    expiry_date: string; no_expiry: boolean; file?: File;
  } | null = null;

  previewOpen = false;
  previewType: 'image' | 'video' | 'pdf' = 'image';
  previewUrl  = '';
  previewName = '';

  private loadedCountry:   string | null = null;
  originalSnapshot: Record<string, unknown> = {};

  // ── Computed options ───────────────────────────────────────────────────────

  // Options keep `value` as the real catalog entry (name/id) so picking a new
  // item from the list always submits a valid value — only `label` (what the
  // user sees) is translated, via MasterDataService.translateLabel().
  readonly countryOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${this.master.translateLabel('country', c.id, c.name)}` })));

  readonly dialCodeOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.dial_code, label: `${c.flag_emoji} ${c.dial_code}`, sublabel: this.master.translateLabel('country', c.id, c.name) })));

  readonly cityOptions = computed<SelectOption[]>(() =>
    this.master.cities().map(c => ({ value: c.name, label: c.name })));

  readonly jobTitleOptions = computed<SelectOption[]>(() =>
    this.master.jobTitles().map(j => ({
      value: j.title,
      label: this.master.translateLabel('jobTitle', j.id, j.title),
      sublabel: this.master.translateLabel('occupation', j.occupation_id, j.occupation_name),
    })));

  readonly occupationOptions = computed<SelectOption[]>(() =>
    this.master.occupations().map(o => ({ value: o.name, label: this.master.translateLabel('occupation', o.id, o.name) })));

  readonly industryOptions = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: this.master.translateLabel('industry', i.id, i.name) })));

  readonly languageOptions = computed<SelectOption[]>(() =>
    this.master.languages().map(l => ({ value: l.name, label: this.master.translateLabel('language', l.id, l.name) })));

  readonly degreeOptions = computed<SelectOption[]>(() =>
    this.master.degrees().map(d => ({ value: d.name, label: this.master.translateLabel('degree', d.id, d.name) })));

  readonly fieldOfStudyOptions = computed<SelectOption[]>(() =>
    this.master.fieldsOfStudy().map(f => ({ value: f.name, label: this.master.translateLabel('fieldOfStudy', f.id, f.name) })));

  readonly noticePeriodOptions = computed<SelectOption[]>(() =>
    this.master.noticePeriods().map(n => ({ value: n.id, label: this.master.translateLabel('noticePeriod', n.id, n.label) })));

  readonly targetLocationChipOptions = computed<ChipOption[]>(() => [
    { value: 'Any Location', label: 'CANDIDATE_EDIT_REQUEST.any_location' },
    ...this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${this.master.translateLabel('country', c.id, c.name)}` })),
  ]);

  readonly hobbyChipOptions = computed<ChipOption[]>(() =>
    this.master.hobbies().map(h => ({ value: h.name, label: this.master.translateLabel('hobby', h.id, h.name) })));

  // ── Static option arrays ───────────────────────────────────────────────────

  readonly proficiencySkillOptions: SelectOption[] = [
    { value: 'beginner',     label: 'CANDIDATE_FORM.proficiency_beginner'     },
    { value: 'intermediate', label: 'CANDIDATE_FORM.proficiency_intermediate' },
    { value: 'expert',       label: 'CANDIDATE_FORM.proficiency_expert'       },
  ];
  readonly proficiencyLangOptions: SelectOption[] = [
    { value: 'A1',     label: 'CANDIDATE_EDIT_REQUEST.lang_level_a1'     },
    { value: 'A2',     label: 'CANDIDATE_EDIT_REQUEST.lang_level_a2'     },
    { value: 'B1',     label: 'CANDIDATE_EDIT_REQUEST.lang_level_b1'     },
    { value: 'B2',     label: 'CANDIDATE_EDIT_REQUEST.lang_level_b2'     },
    { value: 'C1',     label: 'CANDIDATE_EDIT_REQUEST.lang_level_c1'     },
    { value: 'C2',     label: 'CANDIDATE_EDIT_REQUEST.lang_level_c2'     },
    { value: 'native', label: 'CANDIDATE_EDIT_REQUEST.lang_level_native' },
  ];
  readonly genderOptions: SelectOption[] = [
    { value: 'male',              label: 'FILTER_OPTIONS.gen_male'       },
    { value: 'female',            label: 'FILTER_OPTIONS.gen_female'     },
    { value: 'non-binary',        label: 'FILTER_OPTIONS.gen_non_binary' },
    { value: 'prefer_not_to_say', label: 'FILTER_OPTIONS.gen_prefer_not' },
  ];
  readonly maritalStatusOptions: SelectOption[] = [
    { value: 'single',   label: 'CANDIDATE_EDIT_REQUEST.marital_single'   },
    { value: 'married',  label: 'CANDIDATE_EDIT_REQUEST.marital_married'  },
    { value: 'divorced', label: 'CANDIDATE_EDIT_REQUEST.marital_divorced' },
    { value: 'widowed',  label: 'CANDIDATE_EDIT_REQUEST.marital_widowed'  },
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

  private languageService = inject(LanguageService);

  monthLabel(monthNum: number): string {
    try {
      return formatDate(new Date(2000, monthNum - 1, 1), 'MMM', this.languageService.activeLocale());
    } catch {
      return formatDate(new Date(2000, monthNum - 1, 1), 'MMM', 'en-US');
    }
  }

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private editRequestService: EditRequestService,
    private toast: ToastService,
    public master: MasterDataService,
    private sanitizer: DomSanitizer,
    private translate: TranslateService,
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
        this.translateFieldValues();
      },
      error: () => (this.loadingProfile = false),
    });

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.bulkTranslation.clearCache();
        if (event.lang === 'en') {
          this.translateRequestId++; // invalidate any in-flight translation
          this.restoreOriginalFieldValues();
        } else {
          this.translateFieldValues();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Translate the candidate's loaded (not live-edited) text fields — bio, job
   * title, occupation, industry, location, nationality, target locations,
   * hobbies, and each experience/education entry's fields — in one combined
   * call, then write the results directly into the corresponding form
   * controls so the fields display translated text. Values are patched with
   * `emitEvent: false` so this never re-triggers cascades (e.g. country →
   * city reload) or marks the form dirty on its own.
   */
  private async translateFieldValues(): Promise<void> {
    const myRequestId = ++this.translateRequestId;

    const lang = this.translate.currentLang || 'en';
    const c = this.candidate;
    if (lang === 'en' || !c || !this.form) return;

    // job_title/occupation/industry/current_country/nationality/hobbies/
    // degree/field_of_study are picked from the fixed master-data catalogs,
    // so their translations already exist in the static master-data-i18n
    // files — resolve those first and only send genuine free text (bio,
    // current_city, company names, descriptions, ...) plus any catalog rows
    // missing from the static file to the live /translate API.
    await this.master.loadAll();

    const catalogFields: Record<string, { category: MasterCatalogCategory; value: string }> = {};
    if (c.job_title) catalogFields['job_title'] = { category: 'jobTitle', value: c.job_title };
    if (c.occupation) catalogFields['occupation'] = { category: 'occupation', value: c.occupation };
    if (c.industry) catalogFields['industry'] = { category: 'industry', value: c.industry };
    if (c.current_country) catalogFields['current_country'] = { category: 'country', value: c.current_country };
    if (c.nationality) catalogFields['nationality'] = { category: 'country', value: c.nationality };
    c.hobbies?.forEach((h, i) => { if (h) catalogFields[`hobby_${i}`] = { category: 'hobby', value: h }; });
    c.education?.forEach((edu, i) => {
      if (edu.degree) catalogFields[`edu_${i}_degree`] = { category: 'degree', value: edu.degree };
      if (edu.field_of_study) catalogFields[`edu_${i}_field`] = { category: 'fieldOfStudy', value: edu.field_of_study };
    });

    const { resolved, missing } = await this.master.resolveCatalogValues(catalogFields, lang);
    if (myRequestId !== this.translateRequestId) return;

    const fields: Record<string, string> = { ...missing };
    if (c.bio) fields['bio'] = c.bio;
    if (c.current_city) fields['current_city'] = c.current_city;
    c.target_locations?.forEach((loc, i) => { if (loc) fields[`target_${i}`] = loc; });
    c.experience?.forEach((exp, i) => {
      if (exp.job_title) fields[`exp_${i}_job_title`] = exp.job_title;
      if (exp.company_name) fields[`exp_${i}_company_name`] = exp.company_name;
      if (exp.description) fields[`exp_${i}_description`] = exp.description;
    });
    c.education?.forEach((edu, i) => {
      if (edu.institution) fields[`edu_${i}_institution`] = edu.institution;
      if (edu.location) fields[`edu_${i}_location`] = edu.location;
    });

    if (Object.keys(resolved).length === 0 && Object.keys(fields).length === 0) return;

    this.previewsTranslating = true;
    try {
      const translated: Record<string, string> = { ...resolved };
      if (Object.keys(fields).length > 0) {
        Object.assign(translated, await this.bulkTranslation.translateSection(fields, lang));
      }
      if (myRequestId !== this.translateRequestId) return;

      const topPatch: Record<string, string> = {};
      (['bio', 'job_title', 'occupation', 'industry', 'current_country', 'current_city', 'nationality'] as const)
        .forEach((key) => { if (translated[key]) topPatch[key] = translated[key]; });
      if (Object.keys(topPatch).length) this.form!.patchValue(topPatch, { emitEvent: false });

      if (c.target_locations?.length) {
        const arr = c.target_locations.map((loc, i) => translated[`target_${i}`] || loc);
        this.form!.get('target_locations')!.setValue(arr, { emitEvent: false });
      }
      if (c.hobbies?.length) {
        const arr = c.hobbies.map((h, i) => translated[`hobby_${i}`] || h);
        this.form!.get('hobbies')!.setValue(arr, { emitEvent: false });
      }

      c.experience?.forEach((exp, i) => {
        const grp = this.experienceArray.at(i) as FormGroup | undefined;
        if (!grp) return;
        const patch: Record<string, string> = {};
        if (translated[`exp_${i}_job_title`]) patch['job_title'] = translated[`exp_${i}_job_title`];
        if (translated[`exp_${i}_company_name`]) patch['company_name'] = translated[`exp_${i}_company_name`];
        if (translated[`exp_${i}_description`]) patch['description'] = translated[`exp_${i}_description`];
        if (Object.keys(patch).length) grp.patchValue(patch, { emitEvent: false });
      });

      c.education?.forEach((edu, i) => {
        const grp = this.educationArray.at(i) as FormGroup | undefined;
        if (!grp) return;
        const patch: Record<string, string> = {};
        if (translated[`edu_${i}_institution`]) patch['institution'] = translated[`edu_${i}_institution`];
        if (translated[`edu_${i}_degree`]) patch['degree'] = translated[`edu_${i}_degree`];
        if (translated[`edu_${i}_field`]) patch['field_of_study'] = translated[`edu_${i}_field`];
        if (translated[`edu_${i}_location`]) patch['location'] = translated[`edu_${i}_location`];
        if (Object.keys(patch).length) grp.patchValue(patch, { emitEvent: false });
      });
    } catch (error) {
      console.error('Error translating edit-request field values:', error);
    } finally {
      if (myRequestId === this.translateRequestId) this.previewsTranslating = false;
    }
  }

  /** Restore every translatable field back to the candidate's original (English) values. */
  private restoreOriginalFieldValues(): void {
    const c = this.candidate;
    if (!c || !this.form) return;

    this.form.patchValue({
      bio: c.bio ?? '',
      job_title: c.job_title ?? '',
      occupation: c.occupation ?? '',
      industry: c.industry ?? '',
      current_country: c.current_country ?? '',
      current_city: c.current_city ?? '',
      nationality: c.nationality ?? '',
    }, { emitEvent: false });

    this.form.get('target_locations')!.setValue(
      Array.isArray(c.target_locations) ? [...c.target_locations] : [], { emitEvent: false });
    this.form.get('hobbies')!.setValue(
      Array.isArray(c.hobbies) ? [...c.hobbies] : [], { emitEvent: false });

    c.experience?.forEach((exp, i) => {
      const grp = this.experienceArray.at(i) as FormGroup | undefined;
      grp?.patchValue({
        job_title: exp.job_title ?? '',
        company_name: exp.company_name ?? '',
        description: exp.description ?? '',
      }, { emitEvent: false });
    });

    c.education?.forEach((edu, i) => {
      const grp = this.educationArray.at(i) as FormGroup | undefined;
      grp?.patchValue({
        institution: edu.institution ?? '',
        degree: edu.degree ?? '',
        field_of_study: edu.field_of_study ?? '',
        location: edu.location ?? '',
      }, { emitEvent: false });
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
      email:                  [emp.email         ?? '', [Validators.required, emailValidator()]],
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
      email:             emp.email             ?? '',
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

  // ── Certificate direct management (live API — mirrors admin candidate-edit) ──

  initNewCert(): void {
    this.pendingNewCert = { name: '', issuer: '', issue_date: '', expiry_date: '', no_expiry: false };
  }

  cancelNewCert(): void { this.pendingNewCert = null; }

  toggleNewCertNoExpiry(event: Event): void {
    if (!this.pendingNewCert) return;
    this.pendingNewCert.no_expiry = (event.target as HTMLInputElement).checked;
    if (this.pendingNewCert.no_expiry) this.pendingNewCert.expiry_date = '';
  }

  onNewCertFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.pendingNewCert) return;
    this.pendingNewCert.file = file;
    if (!this.pendingNewCert.name) {
      this.pendingNewCert.name = file.name.replace(/\.[^.]+$/, '');
    }
    (event.target as HTMLInputElement).value = '';
  }

  submitNewCert(): void {
    const c = this.pendingNewCert;
    if (!c || !c.file) {
      this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.attach_cert_required'), 'error');
      return;
    }
    const candidateId = this.candidate!.id;
    this.mediaLoading['certificates'] = true;

    this.candidateService.uploadCertificate(candidateId, c.file, {
      name:        c.name || c.file.name,
      issuer:      c.issuer      || undefined,
      issue_date:  c.issue_date  || undefined,
      expiry_date: c.no_expiry   ? null : (c.expiry_date || null),
      no_expiry:   c.no_expiry,
    }).subscribe({
      next: () => {
        this.mediaLoading['certificates'] = false;
        this.pendingNewCert = null;
        this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.cert_uploaded'), 'success');
        // Refresh profile so the new cert appears and snapshot stays in sync
        this.candidateService.getMyProfile().subscribe(r => {
          this.candidate = r.candidate;
          const certs = this.form!.get('certificates') as FormArray;
          while (certs.length) certs.removeAt(0);
          (r.candidate.certificates ?? []).forEach((cert: any) => certs.push(this.fb.group({
            id:          [cert.id          ?? null],
            name:        [cert.name        ?? ''],
            issuer:      [cert.issuer      ?? ''],
            issue_date:  [cert.issue_date  ?? ''],
            expiry_date: [cert.expiry_date ?? ''],
            no_expiry:   [cert.no_expiry   ?? false],
            file_url:    [cert.file_url    ?? ''],
          })));
          // Sync snapshot so the refreshed certs are not flagged as a pending change
          this.originalSnapshot['certificates'] = (r.candidate.certificates ?? []).map((cert: any) => ({
            id:          cert.id          ?? null,
            name:        cert.name        ?? '',
            issuer:      cert.issuer      ?? '',
            issue_date:  cert.issue_date  ?? '',
            expiry_date: cert.expiry_date ?? '',
            no_expiry:   cert.no_expiry   ?? false,
            file_url:    cert.file_url    ?? '',
          }));
        });
      },
      error: (err) => {
        this.mediaLoading['certificates'] = false;
        this.toast.show(err?.error?.message ?? this.translate.instant('CANDIDATE_EDIT_REQUEST.upload_failed_retry'), 'error');
      },
    });
  }

  deleteCert(cert: any): void {
    if (!cert.id || !this.candidate) return;
    this.certDeleting = cert.id;
    this.candidateService.deleteMyCertificate(this.candidate.id, cert.id).subscribe({
      next: () => {
        this.certDeleting = null;
        this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.cert_removed'), 'success');
        // Remove from FormArray
        const certs = this.form!.get('certificates') as FormArray;
        const idx = certs.controls.findIndex(
          c => (c as FormGroup).get('id')?.value === cert.id,
        );
        if (idx >= 0) certs.removeAt(idx);
        // Sync snapshot so the removal is not re-flagged as a diff
        this.originalSnapshot['certificates'] = (this.originalSnapshot['certificates'] as any[])
          ?.filter((c: any) => c.id !== cert.id) ?? [];
      },
      error: (err) => {
        this.certDeleting = null;
        this.toast.show(err?.error?.message ?? this.translate.instant('CANDIDATE_EDIT_REQUEST.cert_remove_failed'), 'error');
      },
    });
  }

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
      this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.video_size_exceeded', { size: (file.size / (1024 * 1024)).toFixed(1) }), 'error');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.mediaLoading[type] = true;
    this.candidateService.stageMyFile(type, file).subscribe({
      next: (res) => {
        this.stagedRelative[type] = res.relativePath;
        this.staged[type]         = res.url;
        this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.file_staged'), 'success');
      },
      error:    (err) => this.toast.show(err?.error?.message ?? this.translate.instant('CANDIDATE_EDIT_REQUEST.upload_failed'), 'error'),
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
      this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.no_changes'), 'info');
      return;
    }

    this.editRequestService.submit(changedPayload).subscribe({
      next: (res) => {
        this.submitting      = false;
        this.existingRequest = res.request;
        this.staged          = {};
        this.stagedRelative  = {};
        this.toast.show(this.translate.instant('CANDIDATE_EDIT_REQUEST.request_submitted'), 'success');
      },
      error: (err) => {
        this.submitting  = false;
        this.submitError = err?.error?.message ?? this.translate.instant('CANDIDATE_EDIT_REQUEST.error');
      },
    });
  }
}
