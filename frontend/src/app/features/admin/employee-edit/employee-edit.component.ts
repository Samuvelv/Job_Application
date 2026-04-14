import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';
import { Employee, Certificate } from '../../../core/models/employee.model';

// Group validator: proficiency required when skill_name is filled
function skillGroupValidator(g: AbstractControl): ValidationErrors | null {
  const name = g.get('skill_name')?.value?.trim();
  const prof = g.get('proficiency')?.value;
  if (name && !prof) { g.get('proficiency')!.setErrors({ required: true }); return { proficiencyRequired: true }; }
  if (!name || prof)  { const e = g.get('proficiency')!.errors; if (e?.['required']) { g.get('proficiency')!.setErrors(null); } }
  return null;
}

// Group validator: proficiency required when language is filled
function langGroupValidator(g: AbstractControl): ValidationErrors | null {
  const name = g.get('language')?.value?.trim();
  const prof = g.get('proficiency')?.value;
  if (name && !prof) { g.get('proficiency')!.setErrors({ required: true }); return { proficiencyRequired: true }; }
  if (!name || prof)  { const e = g.get('proficiency')!.errors; if (e?.['required']) { g.get('proficiency')!.setErrors(null); } }
  return null;
}

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <!-- Header -->
    <div class="d-flex align-items-center gap-3 mb-4">
      <a [routerLink]="['/admin/employees', employeeId]" class="back-btn">
        <i class="bi bi-arrow-left"></i> Back
      </a>
      <div>
        <h1 class="h4 fw-bold mb-0">Edit Employee</h1>
        <p class="text-muted small mb-0">
          @if (employee) { {{ employee.first_name }} {{ employee.last_name }} }
        </p>
      </div>
    </div>

    @if (loadError) {
      <div class="alert alert-danger">{{ loadError }}</div>
    } @else if (!employee) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading employee…</div>
      </div>
    } @else {

      @if (successMsg) {
        <div class="alert alert-success d-flex align-items-center gap-2">
          <i class="bi bi-check-circle-fill"></i> {{ successMsg }}
        </div>
      }
      @if (errorMsg) {
        <div class="alert alert-danger d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill"></i> {{ errorMsg }}
        </div>
      }

      <!-- ══ Section: Media ══════════════════════════════════════════════════ -->
      <div class="form-card mb-4">
        <h5 class="card-section-header card-section-header--warning mb-4">
          <i class="bi bi-images"></i> Media &amp; Documents
        </h5>

        <div class="row g-4">

          <!-- Profile Photo -->
          <div class="col-md-3">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-person-circle me-1"></i> Profile Photo
              </div>
              <div class="media-upload-cell__preview">
                @if (employee.profile_photo_url) {
                  <img [src]="employee.profile_photo_url" alt="Profile photo"
                    class="media-upload-cell__img"
                    (error)="$any($event.target).style.display='none'">
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('image', employee.profile_photo_url, 'Profile Photo')"
                      title="Preview">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                      [disabled]="mediaLoading['profiles']"
                      (click)="deleteFile('profiles')" title="Remove">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-person-circle"></i>
                    <span>No photo</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['profiles']">
                @if (mediaLoading['profiles']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Uploading…
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ employee.profile_photo_url ? 'Replace' : 'Upload' }}
                }
                <input type="file" class="d-none" accept="image/jpeg,image/png,image/webp"
                  (change)="uploadFile('profiles', $event)">
              </label>
            </div>
          </div>

          <!-- Resume / CV -->
          <div class="col-md-3">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-file-earmark-person me-1"></i> Resume / CV
              </div>
              <div class="media-upload-cell__preview media-upload-cell__preview--doc">
                @if (employee.resume_url) {
                  <i class="bi bi-file-earmark-pdf-fill media-upload-cell__doc-icon"></i>
                  <span class="media-upload-cell__doc-label">Resume / CV</span>
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('pdf', employee.resume_url, 'Resume / CV')"
                      title="Preview">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                      [disabled]="mediaLoading['resumes']"
                      (click)="deleteFile('resumes')" title="Remove">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-file-earmark-person"></i>
                    <span>No resume</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['resumes']">
                @if (mediaLoading['resumes']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Uploading…
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ employee.resume_url ? 'Replace' : 'Upload' }}
                }
                <input type="file" class="d-none" accept=".pdf,.doc,.docx"
                  (change)="uploadFile('resumes', $event)">
              </label>
            </div>
          </div>

          <!-- Intro Video -->
          <div class="col-md-3">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-camera-video me-1"></i> Intro Video
              </div>
              <div class="media-upload-cell__preview media-upload-cell__preview--doc">
                @if (employee.intro_video_url) {
                  <i class="bi bi-play-circle-fill media-upload-cell__doc-icon" style="color:var(--th-purple)"></i>
                  <span class="media-upload-cell__doc-label">Intro Video</span>
                  <div class="media-upload-cell__actions">
                    <button type="button" class="media-upload-cell__action-btn"
                      (click)="openPreview('video', employee.intro_video_url, 'Intro Video')"
                      title="Preview">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="media-upload-cell__action-btn media-upload-cell__action-btn--danger"
                      [disabled]="mediaLoading['videos']"
                      (click)="deleteFile('videos')" title="Remove">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                } @else {
                  <div class="media-upload-cell__empty">
                    <i class="bi bi-camera-video"></i>
                    <span>No video</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['videos']">
                @if (mediaLoading['videos']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Uploading…
                } @else {
                  <i class="bi bi-upload me-1"></i>
                  {{ employee.intro_video_url ? 'Replace' : 'Upload' }}
                }
                <input type="file" class="d-none" accept="video/mp4,video/webm,video/ogg"
                  (change)="uploadFile('videos', $event)">
              </label>
            </div>
          </div>

          <!-- Certificates -->
          <div class="col-md-3">
            <div class="media-upload-cell">
              <div class="media-upload-cell__label">
                <i class="bi bi-patch-check me-1"></i> Certificates
                <span class="badge bg-secondary rounded-pill ms-1">{{ employee.certificates?.length || 0 }}</span>
              </div>
              <div class="media-upload-cell__cert-list">
                @if (employee.certificates?.length) {
                  @for (cert of employee.certificates; track cert.id) {
                    <div class="media-upload-cell__cert-item">
                      <i class="bi bi-file-earmark-check text-success flex-shrink-0"></i>
                      <span class="text-truncate flex-grow-1 small">{{ cert.name || 'Certificate' }}</span>
                      <button type="button" class="media-upload-cell__cert-btn"
                        (click)="openPreview('pdf', cert.file_url, cert.name || 'Certificate')"
                        title="Preview">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button type="button" class="media-upload-cell__cert-btn media-upload-cell__cert-btn--danger"
                        [disabled]="certDeleting === cert.id"
                        (click)="deleteCertificate(cert)">
                        @if (certDeleting === cert.id) {
                          <span class="spinner-border spinner-border-sm"></span>
                        } @else {
                          <i class="bi bi-trash"></i>
                        }
                      </button>
                    </div>
                  }
                } @else {
                  <div class="media-upload-cell__empty" style="height:60px">
                    <i class="bi bi-patch-check"></i>
                    <span>No certificates</span>
                  </div>
                }
              </div>
              <label class="btn btn-sm btn-outline-secondary w-100 mt-2"
                [class.disabled]="mediaLoading['certificates']">
                @if (mediaLoading['certificates']) {
                  <span class="spinner-border spinner-border-sm me-1"></span> Uploading…
                } @else {
                  <i class="bi bi-plus-lg me-1"></i> Add Certificate
                }
                <input type="file" class="d-none" accept=".pdf,image/jpeg,image/png"
                  (change)="uploadFile('certificates', $event)">
              </label>
            </div>
          </div>

        </div>
      </div>

      <!-- ── File Preview Overlay ──────────────────────────────────────────── -->
      @if (previewOpen) {
        <div class="file-preview-overlay" (click)="closePreview()">
          <div class="file-preview-dialog" (click)="$event.stopPropagation()">
            <div class="file-preview-dialog__header">
              <span class="file-preview-dialog__title text-truncate">{{ previewName }}</span>
              <div class="d-flex align-items-center gap-2">
                @if (previewUrl) {
                  <a [href]="previewUrl" target="_blank" class="btn btn-sm btn-outline-primary"
                    title="Open in new tab">
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                }
                <button type="button" class="file-preview-dialog__close" (click)="closePreview()">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            <div class="file-preview-dialog__body">
              @if (previewType === 'image') {
                <img [src]="previewUrl" [alt]="previewName" class="file-preview-dialog__image">
              } @else if (previewType === 'video') {
                <video [src]="previewUrl" controls autoplay class="file-preview-dialog__video"></video>
              } @else {
                <div class="file-preview-dialog__no-preview">
                  <i class="bi bi-file-earmark-pdf file-preview-dialog__no-preview-icon text-danger"></i>
                  <div class="fw-semibold mt-3">{{ previewName }}</div>
                  <div class="text-muted small mt-1 mb-3">PDF preview is not available inline.</div>
                  @if (previewUrl) {
                    <a [href]="previewUrl" target="_blank" class="btn btn-primary btn-sm">
                      <i class="bi bi-box-arrow-up-right me-1"></i> Open in new tab
                    </a>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

        <!-- ── Section: Personal ── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header mb-4"><i class="bi bi-person"></i> Personal Information</h5>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">First Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" formControlName="first_name"
                [class.is-invalid]="invalid('first_name')">
              <div class="invalid-feedback">First name is required.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label">Last Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" formControlName="last_name"
                [class.is-invalid]="invalid('last_name')">
              <div class="invalid-feedback">Last name is required.</div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Date of Birth</label>
              <input type="date" class="form-control" formControlName="date_of_birth">
            </div>
            <div class="col-md-4">
              <label class="form-label">Gender</label>
              <select class="form-select" formControlName="gender">
                <option value="">Select…</option>
                @for (g of GENDERS; track g) {
                  <option [value]="g">{{ g | titlecase }}</option>
                }
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Phone</label>
              <input type="tel" class="form-control" formControlName="phone" placeholder="+1 234 567 8900">
            </div>
            <div class="col-12">
              <label class="form-label">Bio / Self Introduction</label>
              <textarea class="form-control" formControlName="bio" rows="3"
                placeholder="Brief introduction about the candidate…"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label">Profile Status</label>
              <select class="form-select" formControlName="profile_status">
                @for (s of STATUSES; track s.value) {
                  <option [value]="s.value">{{ s.label }}</option>
                }
              </select>
            </div>
          </div>
        </div>

        <!-- ── Section: Professional ── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--info mb-4">
            <i class="bi bi-briefcase"></i> Professional Details
          </h5>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Job Title</label>
              <input type="text" class="form-control" formControlName="job_title" placeholder="e.g. Senior Developer">
            </div>
            <div class="col-md-6">
              <label class="form-label">Occupation</label>
              <input type="text" class="form-control" formControlName="occupation" placeholder="e.g. Software Engineer">
            </div>
            <div class="col-md-6">
              <label class="form-label">Industry</label>
              <input type="text" class="form-control" formControlName="industry" placeholder="e.g. Technology">
            </div>
            <div class="col-md-3">
              <label class="form-label">Years of Experience</label>
              <input type="number" class="form-control" formControlName="years_experience" min="0" max="60">
            </div>
            <div class="col-md-3">
              <label class="form-label">LinkedIn URL</label>
              <input type="url" class="form-control" formControlName="linkedin_url" placeholder="https://linkedin.com/in/…">
            </div>
            <div class="col-12 mt-1">
              <label class="form-label fw-semibold">Salary Expectations</label>
            </div>
            <div class="col-md-3">
              <label class="form-label">Min</label>
              <input type="number" class="form-control" formControlName="salary_min" placeholder="0">
            </div>
            <div class="col-md-3">
              <label class="form-label">Max</label>
              <input type="number" class="form-control" formControlName="salary_max" placeholder="0">
            </div>
            <div class="col-md-3">
              <label class="form-label">Currency</label>
              <select class="form-select" formControlName="salary_currency">
                @for (c of CURRENCIES; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label">Type</label>
              <select class="form-select" formControlName="salary_type">
                @for (t of SALARY_TYPES; track t) { <option [value]="t">{{ t | titlecase }}</option> }
              </select>
            </div>
          </div>
        </div>

        <!-- ── Section: Skills ── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header mb-0" style="border:none;padding:0">
              <i class="bi bi-tools"></i> Skills
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addSkill()">
              <i class="bi bi-plus-lg me-1"></i> Add Skill
            </button>
          </div>
          <div formArrayName="skills">
            @if (skills.length) {
              <!-- Column headers — shown once above the first row -->
              <div class="row g-2 mb-1">
                <div class="col-md-6"><label class="form-label form-label-sm mb-0">Skill Name <span class="text-danger">*</span></label></div>
                <div class="col-md-4"><label class="form-label form-label-sm mb-0">Proficiency</label></div>
              </div>
            }
            @for (skill of skills.controls; track $index) {
              <div [formGroupName]="$index" class="row g-2 mb-2 align-items-start">
                <div class="col-md-6">
                  <input type="text" class="form-control form-control-sm" formControlName="skill_name"
                    placeholder="e.g. Angular"
                    [class.is-invalid]="skill.get('skill_name')!.invalid && skill.get('skill_name')!.touched">
                  @if (skill.get('skill_name')!.invalid && skill.get('skill_name')!.touched) {
                    <div class="invalid-feedback">Skill name is required.</div>
                  }
                </div>
                <div class="col-md-4">
                  <select class="form-select form-select-sm" formControlName="proficiency"
                    [class.is-invalid]="skill.get('proficiency')!.invalid && skill.get('proficiency')!.touched">
                    <option value="">— Select —</option>
                    @for (p of PROFICIENCY_SKILL; track p) { <option [value]="p">{{ p | titlecase }}</option> }
                  </select>
                  @if (skill.get('proficiency')!.invalid && skill.get('proficiency')!.touched) {
                    <div class="invalid-feedback">Select a proficiency level.</div>
                  }
                </div>
                <div class="col-md-2">
                  <button type="button" class="btn btn-sm btn-outline-danger w-100"
                    (click)="removeSkill($index)" [disabled]="skills.length === 1">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Section: Languages ── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header mb-0" style="border:none;padding:0">
              <i class="bi bi-translate"></i> Languages
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addLanguage()">
              <i class="bi bi-plus-lg me-1"></i> Add Language
            </button>
          </div>
          <div formArrayName="languages">
            @if (languages.length) {
              <!-- Column headers — shown once above the first row -->
              <div class="row g-2 mb-1">
                <div class="col-md-6"><label class="form-label form-label-sm mb-0">Language <span class="text-danger">*</span></label></div>
                <div class="col-md-4"><label class="form-label form-label-sm mb-0">Proficiency</label></div>
              </div>
            }
            @for (lang of languages.controls; track $index) {
              <div [formGroupName]="$index" class="row g-2 mb-2 align-items-start">
                <div class="col-md-6">
                  <input type="text" class="form-control form-control-sm" formControlName="language"
                    placeholder="e.g. English"
                    [class.is-invalid]="lang.get('language')!.invalid && lang.get('language')!.touched">
                  @if (lang.get('language')!.invalid && lang.get('language')!.touched) {
                    <div class="invalid-feedback">Language name is required.</div>
                  }
                </div>
                <div class="col-md-4">
                  <select class="form-select form-select-sm" formControlName="proficiency"
                    [class.is-invalid]="lang.get('proficiency')!.invalid && lang.get('proficiency')!.touched">
                    <option value="">— Select —</option>
                    @for (p of PROFICIENCY_LANG; track p) { <option [value]="p">{{ p | titlecase }}</option> }
                  </select>
                  @if (lang.get('proficiency')!.invalid && lang.get('proficiency')!.touched) {
                    <div class="invalid-feedback">Select a proficiency level.</div>
                  }
                </div>
                <div class="col-md-2">
                  <button type="button" class="btn btn-sm btn-outline-danger w-100"
                    (click)="removeLanguage($index)" [disabled]="languages.length === 1">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Section: Location ── -->
        <div class="form-card mb-4">
          <h5 class="card-section-header card-section-header--success mb-4">
            <i class="bi bi-geo-alt"></i> Location
          </h5>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Current Country</label>
              <input type="text" class="form-control" formControlName="current_country" placeholder="e.g. United States">
            </div>
            <div class="col-md-6">
              <label class="form-label">Current City</label>
              <input type="text" class="form-control" formControlName="current_city" placeholder="e.g. New York">
            </div>
            <div class="col-md-6">
              <label class="form-label">Nationality</label>
              <input type="text" class="form-control" formControlName="nationality" placeholder="e.g. American">
            </div>
            <div class="col-md-6">
              <label class="form-label">Target Locations</label>
              <input type="text" class="form-control" formControlName="target_locations"
                placeholder="e.g. USA, Canada, UK (comma separated)">
              <div class="form-text">Comma-separated countries</div>
            </div>
          </div>
        </div>

        <!-- ── Section: Work Experience ── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header mb-0" style="border:none;padding:0">
              <i class="bi bi-briefcase-fill"></i> Work Experience
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addExperience()">
              <i class="bi bi-plus-lg me-1"></i> Add
            </button>
          </div>
          <div formArrayName="experience">
            @for (exp of experience.controls; track $index) {
              <div [formGroupName]="$index" class="glass-card p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="fw-semibold small text-muted">
                    <i class="bi bi-briefcase me-1"></i> Experience #{{ $index + 1 }}
                  </span>
                  <button type="button" class="btn btn-sm btn-outline-danger"
                    (click)="removeExperience($index)">
                    <i class="bi bi-trash me-1"></i>Remove
                  </button>
                </div>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Company Name</label>
                    <input class="form-control form-control-sm" formControlName="company_name" placeholder="e.g. Google Inc.">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Job Title</label>
                    <input class="form-control form-control-sm" formControlName="job_title" placeholder="e.g. Senior Developer">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label form-label-sm">Start Date</label>
                    <input type="date" class="form-control form-control-sm" formControlName="start_date">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label form-label-sm">
                      End Date
                      <span class="text-muted fw-normal" style="font-size:.7rem"> (blank = current)</span>
                    </label>
                    <input type="date" class="form-control form-control-sm" formControlName="end_date">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Location</label>
                    <input class="form-control form-control-sm" formControlName="location" placeholder="e.g. New York, USA">
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-sm">Description</label>
                    <textarea class="form-control form-control-sm" formControlName="description" rows="2"
                      placeholder="Key responsibilities and achievements…"></textarea>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Section: Education ── -->
        <div class="form-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-section-header mb-0" style="border:none;padding:0">
              <i class="bi bi-mortarboard-fill"></i> Education
            </h5>
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="addEducation()">
              <i class="bi bi-plus-lg me-1"></i> Add
            </button>
          </div>
          <div formArrayName="education">
            @for (edu of education.controls; track $index) {
              <div [formGroupName]="$index" class="glass-card p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <span class="fw-semibold small text-muted">
                    <i class="bi bi-mortarboard me-1"></i> Education #{{ $index + 1 }}
                  </span>
                  <button type="button" class="btn btn-sm btn-outline-danger"
                    (click)="removeEducation($index)">
                    <i class="bi bi-trash me-1"></i>Remove
                  </button>
                </div>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Institution / University</label>
                    <input class="form-control form-control-sm" formControlName="institution" placeholder="e.g. MIT, Stanford University">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Degree</label>
                    <input class="form-control form-control-sm" formControlName="degree" placeholder="e.g. B.Sc., M.Tech, MBA">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Field of Study</label>
                    <input class="form-control form-control-sm" formControlName="field_of_study" placeholder="e.g. Computer Science">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label form-label-sm">Location</label>
                    <input class="form-control form-control-sm" formControlName="location" placeholder="e.g. Boston, USA">
                  </div>
                  <div class="col-12">
                    <label class="form-label form-label-sm">Duration (years)</label>
                    <div class="d-flex align-items-center gap-2">
                      <div class="flex-grow-1">
                        <input type="number" class="form-control form-control-sm" formControlName="start_year"
                          placeholder="Start year" min="1950" [max]="currentYear">
                        <div class="form-text" style="font-size:.7rem">Start year</div>
                      </div>
                      <span class="text-muted fw-bold pb-3">–</span>
                      <div class="flex-grow-1">
                        <input type="number" class="form-control form-control-sm" formControlName="end_year"
                          placeholder="End year" min="1950" [max]="currentYear + 6">
                        <div class="form-text" style="font-size:.7rem">End / expected year</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Actions ── -->
        <div class="d-flex gap-3 justify-content-end mt-2 mb-5">
          <a [routerLink]="['/admin/employees', employeeId]" class="btn btn-outline-secondary">
            <i class="bi bi-x-lg me-1"></i> Cancel
          </a>
          <button type="submit" class="btn btn-primary px-4" [disabled]="saving">
            @if (saving) {
              <span class="spinner-border spinner-border-sm me-2"></span> Saving…
            } @else {
              <i class="bi bi-check-lg me-1"></i> Save Changes
            }
          </button>
        </div>

      </form>
    }
  `,
})
export class EmployeeEditComponent implements OnInit {
  employeeId = '';
  employee: Employee | null = null;
  loadError = '';
  saving = false;
  successMsg = '';
  errorMsg = '';

  form!: FormGroup;

  // Media state
  mediaLoading: Record<string, boolean> = {};
  certDeleting: number | null = null;

  // Preview state
  previewOpen = false;
  previewType: 'image' | 'video' | 'pdf' | null = null;
  previewUrl: string | undefined;
  previewName: string | undefined;

  readonly GENDERS       = ['male', 'female', 'non-binary', 'prefer_not_to_say'];
  readonly SALARY_TYPES  = ['monthly', 'annual', 'hourly'];
  readonly CURRENCIES    = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'INR', 'AUD', 'CAD'];
  readonly PROFICIENCY_SKILL = ['beginner', 'intermediate', 'expert'];
  readonly PROFICIENCY_LANG  = ['basic', 'conversational', 'fluent', 'native'];
  readonly STATUSES = [
    { value: 'active',       label: 'Active'       },
    { value: 'inactive',     label: 'Inactive'     },
    { value: 'pending_edit', label: 'Pending Edit' },
  ];
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private empSvc: EmployeeService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.employeeId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.employeeId) { this.loadError = 'Invalid employee ID.'; return; }
    this.loadEmployee();
  }

  private loadEmployee(): void {
    this.empSvc.getById(this.employeeId).subscribe({
      next: (res) => {
        this.employee = res.employee;
        if (!this.form) this.buildForm(res.employee);
      },
      error: (err) => (this.loadError = err?.error?.message ?? 'Failed to load employee.'),
    });
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  get skills():     FormArray { return this.form.get('skills')     as FormArray; }
  get languages():  FormArray { return this.form.get('languages')  as FormArray; }
  get experience(): FormArray { return this.form.get('experience') as FormArray; }
  get education():  FormArray { return this.form.get('education')  as FormArray; }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && c.touched);
  }

  addSkill(): void    { this.skills.push(this.fb.group({ skill_name: ['', Validators.required], proficiency: [''] }, { validators: skillGroupValidator })); }
  removeSkill(i: number): void { this.skills.removeAt(i); }

  addLanguage(): void    { this.languages.push(this.fb.group({ language: ['', Validators.required], proficiency: [''] }, { validators: langGroupValidator })); }
  removeLanguage(i: number): void { this.languages.removeAt(i); }

  addExperience(): void {
    this.experience.push(this.fb.group({
      company_name: [''], job_title: [''], start_date: [''],
      end_date: [''], description: [''], location: [''],
    }));
  }
  removeExperience(i: number): void { this.experience.removeAt(i); }

  addEducation(): void {
    this.education.push(this.fb.group({
      institution: [''], degree: [''], field_of_study: [''],
      start_year: [null as number | null], end_year: [null as number | null], location: [''],
    }));
  }
  removeEducation(i: number): void { this.education.removeAt(i); }

  // ── Preview handlers ───────────────────────────────────────────────────────
  openPreview(type: 'image' | 'video' | 'pdf', url: string | undefined, name: string): void {
    this.previewType = type;
    this.previewUrl  = url;
    this.previewName = name;
    this.previewOpen = true;
  }

  closePreview(): void {
    this.previewOpen = false;
    this.previewType = null;
    this.previewUrl  = undefined;
    this.previewName = undefined;
  }

  // ── Media handlers ─────────────────────────────────────────────────────────
  uploadFile(
    type: 'profiles' | 'resumes' | 'videos' | 'certificates',
    event: Event,
  ): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.employee) return;
    this.mediaLoading[type] = true;
    const name = type === 'certificates' ? file.name.replace(/\.[^.]+$/, '') : undefined;
    this.empSvc.uploadFile(this.employeeId, type, file, name).subscribe({
      next: (res) => {
        this.mediaLoading[type] = false;
        this.toast.success('File uploaded');
        // Refresh employee to show new URL
        this.empSvc.getById(this.employeeId).subscribe(r => { this.employee = r.employee; });
        // Reset the input so same file can be re-selected
        (event.target as HTMLInputElement).value = '';
      },
      error: (err) => {
        this.mediaLoading[type] = false;
        this.toast.error(err?.error?.message ?? 'Upload failed');
        (event.target as HTMLInputElement).value = '';
      },
    });
  }

  deleteFile(type: 'profiles' | 'resumes' | 'videos'): void {
    if (!this.employee) return;
    this.mediaLoading[type] = true;
    this.empSvc.deleteFile(this.employeeId, type).subscribe({
      next: () => {
        this.mediaLoading[type] = false;
        this.toast.success('File removed');
        this.empSvc.getById(this.employeeId).subscribe(r => { this.employee = r.employee; });
      },
      error: (err) => {
        this.mediaLoading[type] = false;
        this.toast.error(err?.error?.message ?? 'Failed to remove file');
      },
    });
  }

  deleteCertificate(cert: Certificate): void {
    if (!cert.id) return;
    this.certDeleting = cert.id;
    this.empSvc.deleteCertificate(this.employeeId, cert.id).subscribe({
      next: () => {
        this.certDeleting = null;
        this.toast.success('Certificate removed');
        this.empSvc.getById(this.employeeId).subscribe(r => { this.employee = r.employee; });
      },
      error: (err) => {
        this.certDeleting = null;
        this.toast.error(err?.error?.message ?? 'Failed to remove certificate');
      },
    });
  }

  // ── Build form prefilled with employee data ───────────────────────────────
  private buildForm(emp: Employee): void {
    this.form = this.fb.group({
      first_name:    [emp.first_name, [Validators.required, Validators.maxLength(100)]],
      last_name:     [emp.last_name,  [Validators.required, Validators.maxLength(100)]],
      date_of_birth: [emp.date_of_birth ?? ''],
      gender:        [emp.gender ?? ''],
      phone:         [emp.phone ?? ''],
      bio:           [emp.bio ?? '', Validators.maxLength(2000)],
      profile_status:[emp.profile_status ?? 'active'],

      job_title:        [emp.job_title ?? ''],
      occupation:       [emp.occupation ?? ''],
      industry:         [emp.industry ?? ''],
      years_experience: [emp.years_experience ?? null],
      linkedin_url:     [emp.linkedin_url ?? ''],
      salary_min:       [emp.salary_min ?? null],
      salary_max:       [emp.salary_max ?? null],
      salary_currency:  [emp.salary_currency ?? 'USD'],
      salary_type:      [emp.salary_type ?? 'monthly'],

      current_country:  [emp.current_country ?? ''],
      current_city:     [emp.current_city ?? ''],
      nationality:      [emp.nationality ?? ''],
      target_locations: [emp.target_locations?.join(', ') ?? ''],

      skills: this.fb.array(
        emp.skills?.length
          ? emp.skills.map(s => this.fb.group({ skill_name: [s.skill_name ?? '', Validators.required], proficiency: [s.proficiency ?? ''] }, { validators: skillGroupValidator }))
          : [this.fb.group({ skill_name: ['', Validators.required], proficiency: [''] }, { validators: skillGroupValidator })]
      ),
      languages: this.fb.array(
        emp.languages?.length
          ? emp.languages.map(l => this.fb.group({ language: [l.language ?? '', Validators.required], proficiency: [l.proficiency ?? ''] }, { validators: langGroupValidator }))
          : [this.fb.group({ language: ['', Validators.required], proficiency: [''] }, { validators: langGroupValidator })]
      ),
      experience: this.fb.array(
        emp.experience?.length
          ? emp.experience.map(e => this.fb.group({
              company_name: [e.company_name ?? ''], job_title: [e.job_title ?? ''],
              start_date: [e.start_date ?? ''], end_date: [e.end_date ?? ''],
              description: [e.description ?? ''], location: [e.location ?? ''],
            }))
          : [this.fb.group({ company_name: [''], job_title: [''], start_date: [''], end_date: [''], description: [''], location: [''] })]
      ),
      education: this.fb.array(
        emp.education?.length
          ? emp.education.map(e => this.fb.group({
              institution: [e.institution ?? ''], degree: [e.degree ?? ''],
              field_of_study: [e.field_of_study ?? ''], start_year: [e.start_year ?? null],
              end_year: [e.end_year ?? null], location: [e.location ?? ''],
            }))
          : [this.fb.group({ institution: [''], degree: [''], field_of_study: [''], start_year: [null as number | null], end_year: [null as number | null], location: [''] })]
      ),
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving   = true;
    this.errorMsg = '';

    const raw = this.form.getRawValue();

    const payload = {
      first_name:    raw.first_name,
      last_name:     raw.last_name,
      date_of_birth: raw.date_of_birth   || undefined,
      gender:        raw.gender          || undefined,
      phone:         raw.phone           || undefined,
      bio:           raw.bio             || undefined,
      profile_status: raw.profile_status || undefined,
      job_title:     raw.job_title       || undefined,
      occupation:    raw.occupation      || undefined,
      industry:      raw.industry        || undefined,
      years_experience: raw.years_experience ?? undefined,
      linkedin_url:  raw.linkedin_url    || undefined,
      salary_min:    raw.salary_min      ?? undefined,
      salary_max:    raw.salary_max      ?? undefined,
      salary_currency: raw.salary_currency || undefined,
      salary_type:   raw.salary_type     || undefined,
      current_country: raw.current_country || undefined,
      current_city:  raw.current_city    || undefined,
      nationality:   raw.nationality     || undefined,
      target_locations: raw.target_locations
        ? raw.target_locations.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      skills:    raw.skills.filter((s: any) => s.skill_name?.trim()),
      languages: raw.languages.filter((l: any) => l.language?.trim()),
      experience: raw.experience.filter((e: any) => e.company_name?.trim() || e.job_title?.trim()),
      education:  raw.education.filter((e: any) => e.institution?.trim() || e.degree?.trim()),
    };

    this.empSvc.update(this.employeeId, payload as any).subscribe({
      next: (res) => {
        this.saving     = false;
        this.employee   = res.employee;
        this.successMsg = 'Employee updated successfully!';
        this.toast.success('Employee updated');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => this.router.navigate(['/admin/employees', this.employeeId]), 1500);
      },
      error: (err) => {
        this.saving   = false;
        this.errorMsg = err?.error?.message ?? 'Update failed. Please try again.';
      },
    });
  }
}
