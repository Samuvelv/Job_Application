// src/app/features/candidate/edit-request/edit-request.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { CandidateService } from '../../../core/services/candidate.service';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { Candidate } from '../../../core/models/candidate.model';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

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
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-edit-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, SearchableSelectComponent],
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
                <input type="file" class="d-none" accept="application/pdf"
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
                <input type="file" class="d-none" accept="video/mp4,video/webm,video/ogg"
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
            <div class="col-md-6">
              <label class="form-label small fw-semibold">First Name</label>
              <input formControlName="first_name" class="form-control form-control-sm">
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Last Name</label>
              <input formControlName="last_name" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Phone</label>
              <input formControlName="phone" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Date of Birth</label>
              <input formControlName="date_of_birth" type="date" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Gender</label>
              <select formControlName="gender" class="form-select form-select-sm">
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Marital Status <span class="text-muted fw-normal">(Optional)</span></label>
              <select formControlName="marital_status" class="form-select form-select-sm">
                <option value="">— Select —</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">Bio</label>
              <textarea formControlName="bio" class="form-control form-control-sm" rows="3"></textarea>
              <small class="d-block text-end mt-1"
                [class.text-muted]="bioWordCount < BIO_WORD_LIMIT"
                [class.text-danger]="bioWordCount >= BIO_WORD_LIMIT">
                {{ bioWordCount }} / {{ BIO_WORD_LIMIT }} words
              </small>
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">LinkedIn URL</label>
              <input formControlName="linkedin_url" class="form-control form-control-sm"
                placeholder="https://linkedin.com/in/…">
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
              <label class="form-label small fw-semibold">Job Title</label>
              <input formControlName="job_title" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Occupation</label>
              <input formControlName="occupation" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Industry</label>
              <input formControlName="industry" class="form-control form-control-sm">
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
          </div>
        </div>

        <!-- ── Location ───────────────────────────────────────────────────── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--success">
            <i class="bi bi-geo-alt"></i> Location
          </h5>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Current Country</label>
              <input formControlName="current_country" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Current City</label>
              <input formControlName="current_city" class="form-control form-control-sm">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Nationality</label>
              <input formControlName="nationality" class="form-control form-control-sm">
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
                <div class="col-md-6"><label class="form-label form-label-sm mb-0">Skill Name <span class="text-danger">*</span></label></div>
                <div class="col-md-4"><label class="form-label form-label-sm mb-0">Proficiency</label></div>
              </div>
            }
            @for (ctrl of skillsArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-start">
              <div class="col-md-6">
                <input formControlName="skill_name" class="form-control form-control-sm"
                  placeholder="e.g. Angular"
                  [class.is-invalid]="asGroup(ctrl).get('skill_name')!.invalid && asGroup(ctrl).get('skill_name')!.touched">
                @if (asGroup(ctrl).get('skill_name')!.invalid && asGroup(ctrl).get('skill_name')!.touched) {
                  <div class="invalid-feedback">Skill name is required.</div>
                }
              </div>
              <div class="col-md-4">
                <select formControlName="proficiency" class="form-select form-select-sm"
                  [class.is-invalid]="asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched">
                  <option value="">— Select —</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                @if (asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched) {
                  <div class="invalid-feedback">Select a proficiency level.</div>
                }
              </div>
              <div class="col-md-2">
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
                <div class="col-md-6"><label class="form-label form-label-sm mb-0">Language <span class="text-danger">*</span></label></div>
                <div class="col-md-4"><label class="form-label form-label-sm mb-0">Proficiency</label></div>
              </div>
            }
            @for (ctrl of languagesArray.controls; track $index) {
            <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-start">
              <div class="col-md-6">
                <input formControlName="language" class="form-control form-control-sm"
                  placeholder="e.g. English"
                  [class.is-invalid]="asGroup(ctrl).get('language')!.invalid && asGroup(ctrl).get('language')!.touched">
                @if (asGroup(ctrl).get('language')!.invalid && asGroup(ctrl).get('language')!.touched) {
                  <div class="invalid-feedback">Language name is required.</div>
                }
              </div>
              <div class="col-md-4">
                <select formControlName="proficiency" class="form-select form-select-sm"
                  [class.is-invalid]="asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched">
                  <option value="">— Select —</option>
                  <option value="A1">A1 — Beginner</option>
                  <option value="A2">A2 — Elementary</option>
                  <option value="B1">B1 — Intermediate</option>
                  <option value="B2">B2 — Upper Intermediate</option>
                  <option value="C1">C1 — Advanced</option>
                  <option value="C2">C2 — Proficient</option>
                  <option value="native">Native</option>
                </select>
                @if (asGroup(ctrl).get('proficiency')!.invalid && asGroup(ctrl).get('proficiency')!.touched) {
                  <div class="invalid-feedback">Select a proficiency level.</div>
                }
              </div>
              <div class="col-md-2">
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
              <div class="row g-2">
                <div class="col-md-6">
                  <input formControlName="job_title" class="form-control form-control-sm" placeholder="Job Title">
                </div>
                <div class="col-md-6">
                  <input formControlName="company_name" class="form-control form-control-sm" placeholder="Company">
                </div>
                <div class="col-md-3">
                  <input formControlName="start_date" type="date" class="form-control form-control-sm">
                </div>
                <div class="col-md-3">
                  <input formControlName="end_date" type="date" class="form-control form-control-sm">
                </div>
                <div class="col-md-6">
                  <input formControlName="location" class="form-control form-control-sm" placeholder="Location">
                </div>
                <div class="col-12">
                  <textarea formControlName="description" class="form-control form-control-sm"
                    rows="2" placeholder="Description"></textarea>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger mt-2"
                (click)="removeExperience($index)">Remove</button>
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
              <div class="row g-2">
                <div class="col-md-6">
                  <input formControlName="institution" class="form-control form-control-sm" placeholder="Institution">
                </div>
                <div class="col-md-6">
                  <input formControlName="degree" class="form-control form-control-sm" placeholder="Degree">
                </div>
                <div class="col-md-6">
                  <input formControlName="field_of_study" class="form-control form-control-sm" placeholder="Field of Study">
                </div>
                <div class="col-md-3">
                  <input formControlName="start_year" type="number" class="form-control form-control-sm" placeholder="Start Year">
                </div>
                <div class="col-md-3">
                  <input formControlName="end_year" type="number" class="form-control form-control-sm" placeholder="End Year">
                </div>
                <div class="col-md-6">
                  <label class="form-label form-label-sm text-muted mb-1">Country of Institution</label>
                  <app-searchable-select
                    formControlName="location"
                    [options]="countryOptions()"
                    placeholder="Select country…"
                    [allowClear]="true">
                  </app-searchable-select>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger mt-2"
                (click)="removeEducation($index)">Remove</button>
            </div>
          }
        </div>

        <!-- Certificates -->
        <div class="section-header d-flex justify-content-between align-items-center">
          <h6 class="section-header__title"><i class="bi bi-patch-check"></i> Certificates</h6>
          <button type="button" class="btn btn-sm btn-outline-primary" (click)="addCertEntry()">+ Add</button>
        </div>
        <div class="d-flex flex-column gap-3 mb-4">
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
                    <label class="form-label form-label--sm">Name</label>
                    <input type="text" class="form-control form-control-sm" formControlName="name" placeholder="Certificate name">
                  </div>
                  <div class="col-12 col-md-6">
                    <label class="form-label form-label--sm">Issuing Organisation</label>
                    <input type="text" class="form-control form-control-sm" formControlName="issuer" placeholder="e.g. Amazon Web Services">
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label form-label--sm">Issue Date</label>
                    <input type="date" class="form-control form-control-sm" formControlName="issue_date">
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label form-label--sm">Expiry Date</label>
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

        @if (submitError) {
          <div class="alert alert-danger small">{{ submitError }}</div>
        }

        <div class="d-flex gap-2 mb-5">
          <button type="submit" class="btn btn-primary px-4"
            [disabled]="submitting || existingRequest?.status === 'pending'">
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
            } @else {
              <div style="text-align:center;padding:3rem 1rem">
                <i class="bi bi-file-earmark-pdf-fill"
                  style="font-size:4rem;color:var(--th-rose);display:block;margin-bottom:1rem"></i>
                <p class="text-muted mb-3">PDF preview is not available inline.</p>
                <a [href]="previewUrl" target="_blank" class="btn btn-primary">
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
  candidate:        Candidate | null  = null;
  loadingProfile   = true;
  form:            FormGroup | null = null;
  submitting       = false;
  submitError      = '';
  existingRequest: EditRequest | null = null;

  // staged[type] = preview URL of the staged file (full URL for display)
  staged:         Record<string, string | null> = {};
  // stagedRelative[type] = relative path to include in the submit payload
  stagedRelative: Record<string, string> = {};
  mediaLoading:   Record<string, boolean> = {};

  previewOpen = false;
  previewType: 'image' | 'video' | 'pdf' = 'image';
  previewUrl  = '';
  previewName = '';

  constructor(
    private fb: FormBuilder,
    private candidateService: CandidateService,
    private editRequestService: EditRequestService,
    private toast: ToastService,
    public master: MasterDataService,
  ) {}

  readonly countryOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

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

  buildForm(emp: Candidate): void {
    this.bioWordCount = this.countWords(emp.bio ?? '');
    this.form = this.fb.group({
      first_name:       [emp.first_name       ?? '', Validators.required],
      last_name:        [emp.last_name        ?? '', Validators.required],
      phone:            [emp.phone            ?? ''],
      date_of_birth:    [emp.date_of_birth    ?? ''],
      gender:           [emp.gender           ?? ''],
      marital_status:   [emp.marital_status   ?? ''],
      bio:              [emp.bio              ?? ''],
      linkedin_url:     [emp.linkedin_url     ?? ''],
      job_title:        [emp.job_title        ?? ''],
      occupation:       [emp.occupation       ?? ''],
      industry:         [emp.industry         ?? ''],
      years_experience: [emp.years_experience ?? null],
      current_country:  [emp.current_country  ?? ''],
      current_city:     [emp.current_city     ?? ''],
      nationality:      [emp.nationality      ?? ''],
      skills:     this.fb.array((emp.skills    ?? []).map((s) =>
        this.fb.group({ skill_name: [s.skill_name, Validators.required], proficiency: [s.proficiency ?? ''] }, { validators: skillGroupValidator }))),
      languages:  this.fb.array((emp.languages ?? []).map((l) =>
        this.fb.group({ language: [l.language, Validators.required], proficiency: [l.proficiency ?? ''] }, { validators: langGroupValidator }))),
      experience: this.fb.array((emp.experience ?? []).map((e) => this.fb.group({
        job_title:    [e.job_title    ?? ''],
        company_name: [e.company_name ?? ''],
        start_date:   [e.start_date   ?? ''],
        end_date:     [e.end_date     ?? ''],
        location:     [e.location     ?? ''],
        description:  [e.description  ?? ''],
      }))),
      education: this.fb.array((emp.education ?? []).map((e) => this.fb.group({
        institution:    [e.institution    ?? ''],
        degree:         [e.degree         ?? ''],
        field_of_study: [e.field_of_study ?? ''],
        start_year:     [e.start_year     ?? null],
        end_year:       [e.end_year       ?? null],
      }))),
      certificates: this.fb.array((emp.certificates ?? []).map((c) => this.fb.group({
        id:          [c.id          ?? null],
        name:        [c.name        ?? ''],
        issuer:      [c.issuer      ?? ''],
        issue_date:  [c.issue_date  ?? ''],
        expiry_date: [c.expiry_date ?? ''],
        no_expiry:   [c.no_expiry   ?? false],
        file_url:    [c.file_url    ?? ''],
      }))),
    });

    this.form!.get('bio')!.valueChanges.subscribe((val: string | null) => {
      const text  = val ?? '';
      const words = text.trim() === '' ? [] : text.trim().split(/\s+/).filter(Boolean);
      if (words.length > this.BIO_WORD_LIMIT) {
        const clamped = words.slice(0, this.BIO_WORD_LIMIT).join(' ');
        this.form!.get('bio')!.setValue(clamped, { emitEvent: false });
        this.bioWordCount = this.BIO_WORD_LIMIT;
      } else {
        this.bioWordCount = words.length;
      }
    });
  }

  // ── FormArray getters ───────────────────────────────────────────────────
  get skillsArray():    FormArray { return this.form!.get('skills')     as FormArray; }
  get languagesArray(): FormArray { return this.form!.get('languages')  as FormArray; }
  get experienceArray():FormArray { return this.form!.get('experience') as FormArray; }
  get educationArray(): FormArray { return this.form!.get('education')  as FormArray; }
  get certificateArray(): FormArray { return this.form!.get('certificates') as FormArray; }

  asGroup(c: import('@angular/forms').AbstractControl): FormGroup { return c as FormGroup; }

  addSkill():              void { this.skillsArray.push(this.fb.group({ skill_name: ['', Validators.required], proficiency: [''] }, { validators: skillGroupValidator })); }
  removeSkill(i: number):  void { this.skillsArray.removeAt(i); }
  addLanguage():             void { this.languagesArray.push(this.fb.group({ language: ['', Validators.required], proficiency: [''] }, { validators: langGroupValidator })); }
  removeLanguage(i: number): void { this.languagesArray.removeAt(i); }
  addExperience(): void {
    this.experienceArray.push(this.fb.group({
      job_title: [''], company_name: [''], start_date: [''],
      end_date: [''], location: [''], description: [''],
    }));
  }
  removeExperience(i: number): void { this.experienceArray.removeAt(i); }
  addEducation(): void {
    this.educationArray.push(this.fb.group({
      institution: [''], degree: [''], field_of_study: [''],
      start_year: [null], end_year: [null], location: [''],
    }));
  }
  removeEducation(i: number): void { this.educationArray.removeAt(i); }

  addCertEntry(): void {
    this.certificateArray.push(this.fb.group({
      id: [null], name: [''], issuer: [''], issue_date: [''], expiry_date: [''], no_expiry: [false], file_url: [''],
    }));
  }
  removeCertEntry(i: number): void { this.certificateArray.removeAt(i); }

  // ── Stage media ─────────────────────────────────────────────────────────
  /** Map upload type → candidate field name for the submit payload */
  private typeToField: Record<string, string> = {
    profiles: 'profile_photo_url',
    resumes:  'resume_url',
    videos:   'intro_video_url',
  };

  // ── Bio word counter ────────────────────────────────────────────────────────
  readonly BIO_WORD_LIMIT = 2000;
  bioWordCount = 0;

  countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
  }

  stageFile(type: 'profiles' | 'resumes' | 'videos', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.mediaLoading[type] = true;
    this.candidateService.stageMyFile(type, file).subscribe({
      next: (res) => {
        // Store relative path for submit payload, full URL for preview
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

  // ── Preview ─────────────────────────────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────────────────────────
  submit(): void {
    if (!this.form || this.form.invalid) { this.form?.markAllAsTouched(); return; }
    if (this.existingRequest?.status === 'pending') return;

    this.submitting  = true;
    this.submitError = '';

    const raw   = this.form.value;
    const clean = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== '' && v !== null),
    );

    // Attach any staged file relative paths into the payload
    Object.entries(this.stagedRelative).forEach(([type, relativePath]) => {
      const field = this.typeToField[type];
      if (field) (clean as Record<string, unknown>)[field] = relativePath;
    });

    this.editRequestService.submit(clean).subscribe({
      next: (res) => {
        this.submitting      = false;
        this.existingRequest = res.request;
        // Clear staged state — they are now part of the pending request
        this.staged         = {};
        this.stagedRelative = {};
        this.toast.show('Edit request submitted — pending admin review.', 'success');
      },
      error: (err) => {
        this.submitting  = false;
        this.submitError = err?.error?.message ?? 'Failed to submit request.';
      },
    });
  }
}
