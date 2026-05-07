// src/app/features/admin/volunteers/volunteer-create.component.ts
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { VolunteerService } from '../../../core/services/volunteer.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { CandidateService } from '../../../core/services/candidate.service';

@Component({
  selector: 'app-volunteer-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SearchableSelectComponent,
    ChipMultiSelectComponent,
  ],
  template: `
    <div class="mb-3">
      <a routerLink="/admin/volunteers" class="back-btn">
        <i class="bi bi-arrow-left"></i>Back to Volunteers
      </a>
    </div>

    <app-page-header
      [title]="editId ? 'Edit Volunteer' : 'Add Volunteer'"
      icon="bi-person-heart"
      [subtitle]="editId ? 'Update volunteer profile' : 'Create a detailed volunteer profile'" />

    <div class="form-card" style="max-width:760px;">

      <!-- ── Success banner ───────────────────────────────────────────── -->
      @if (success) {
        <div class="reg-success-banner">
          <div class="reg-success-banner__icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <div class="reg-success-banner__body">
            <div class="reg-success-banner__title">
              {{ editId ? 'Volunteer updated successfully.' : 'Volunteer profile created successfully.' }}
            </div>
            <div class="mt-3 d-flex gap-2">
              <a routerLink="/admin/volunteers" class="btn btn-sm btn-primary">View Volunteers</a>
              @if (!editId) {
                <button class="btn btn-sm btn-outline-secondary" (click)="reset()">Add Another</button>
              }
            </div>
          </div>
        </div>

      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">

          <!-- ── Section 1: Profile ──────────────────────────────────── -->
          <h6 class="form-section-heading">Profile</h6>
          <div class="row g-3 mb-4">

            <!-- Profile Photo -->
            <div class="col-12">
              <label class="form-label fw-semibold">Profile Photo</label>
              <div class="vol-photo-upload">
                <div class="vol-photo-upload__preview">
                  @if (photoPreview()) {
                    <img [src]="photoPreview()!" alt="Preview" class="vol-photo-upload__img">
                  } @else {
                    <i class="bi bi-person-circle vol-photo-upload__placeholder"></i>
                  }
                </div>
                <div class="vol-photo-upload__actions">
                  <label class="btn btn-outline-secondary btn-sm" style="cursor:pointer;margin-bottom:0">
                    <i class="bi bi-upload me-1"></i>Choose Photo
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      class="d-none" (change)="onPhotoSelected($event)">
                  </label>
                  @if (photoPreview()) {
                    <button type="button" class="btn btn-outline-danger btn-sm"
                      (click)="removePhoto()">
                      <i class="bi bi-x-lg me-1"></i>Remove
                    </button>
                  }
                  <span class="form-text">JPEG, PNG or WebP — max 5 MB</span>
                </div>
              </div>
              @if (photoError) {
                <div class="text-danger small mt-1">{{ photoError }}</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
              <input formControlName="name" class="form-control"
                [class.is-invalid]="invalid('name')" placeholder="e.g. Arun Kumar">
              @if (invalid('name')) {
                <div class="invalid-feedback">Name is required.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Email <span class="rep-optional">optional</span></label>
              <input formControlName="email" type="email" class="form-control"
                [class.is-invalid]="invalid('email')" placeholder="volunteer@example.com">
              @if (invalid('email')) {
                <div class="invalid-feedback">Enter a valid email address.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Phone / WhatsApp <span class="rep-optional">optional</span></label>
              <input formControlName="phone" class="form-control" placeholder="+44 7700 900000">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Nationality <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="nationality"
                [options]="countryOpts()"
                [class.is-invalid]="invalid('nationality')"
                placeholder="Select nationality" />
              @if (invalid('nationality')) {
                <div class="text-danger small mt-1">Nationality is required.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Country Placed In <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="country_placed"
                [options]="countryOpts()"
                [class.is-invalid]="invalid('country_placed')"
                placeholder="Select country" />
              @if (invalid('country_placed')) {
                <div class="text-danger small mt-1">Country placed is required.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Job Role / Sector <span class="text-danger">*</span></label>
              <input formControlName="role" class="form-control"
                [class.is-invalid]="invalid('role')"
                placeholder="e.g. Registered Nurse, IT Support">
              @if (invalid('role')) {
                <div class="invalid-feedback">Job role is required.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Company Joined <span class="rep-optional">optional</span></label>
              <input formControlName="company_joined" class="form-control"
                placeholder="e.g. NHS Trust, Tesco">
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Year Placed <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="year_placed"
                [options]="yearOpts"
                [invalid]="invalid('year_placed')"
                placeholder="Select year" />
              @if (invalid('year_placed')) {
                <div class="text-danger small mt-1">Year placed is required.</div>
              }
            </div>

          </div>

          <!-- ── Section 2: Languages ────────────────────────────────── -->
          <h6 class="form-section-heading">Languages Spoken</h6>
          <div class="mb-4">
            <app-chip-multi-select
              formControlName="languages"
              [options]="languageOptions()"
              placeholder="Select languages spoken" />
          </div>

          <!-- ── Section 3: Story & Support ─────────────────────────── -->
          <h6 class="form-section-heading">Story &amp; Support</h6>
          <div class="row g-3 mb-4">

            <div class="col-12">
              <label class="form-label fw-semibold">Short Success Story <span class="rep-optional">optional</span></label>
              <textarea formControlName="success_story" class="form-control" rows="3"
                placeholder="2–3 sentences about their journey — how they secured a job abroad through TalentHub…"
                maxlength="1000"></textarea>
              <div class="form-text text-end">
                {{ form.get('success_story')?.value?.length || 0 }} / 1000
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">How They Want to Help <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="support_method"
                [options]="supportMethodOpts"
                [invalid]="invalid('support_method')"
                placeholder="Select support method" />
              @if (invalid('support_method')) {
                <div class="text-danger small mt-1">Please select a support method.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Contact Preference <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="contact_preference"
                [options]="contactPrefOpts"
                [invalid]="invalid('contact_preference')"
                placeholder="Select preference" />
              @if (invalid('contact_preference')) {
                <div class="text-danger small mt-1">Please select a contact preference.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Availability <span class="text-danger">*</span></label>
              <app-searchable-select
                formControlName="availability"
                [options]="availabilityOpts"
                [invalid]="invalid('availability')"
                placeholder="Select availability" />
              @if (invalid('availability')) {
                <div class="text-danger small mt-1">Please select availability.</div>
              }
            </div>

            <div class="col-md-6">
              <label class="form-label fw-semibold">Admin Notes <span class="rep-optional">optional</span></label>
              <input formControlName="notes" class="form-control"
                placeholder="Internal notes — not visible to candidates">
            </div>

          </div>

          <!-- ── Section 4: Consent ──────────────────────────────────── -->
          <h6 class="form-section-heading">Consent</h6>
          <div class="mb-4">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" formControlName="consent"
                id="consentCheck" [class.is-invalid]="invalid('consent')">
              <label class="form-check-label fw-semibold" for="consentCheck">
                This volunteer has agreed to appear on the platform
                <span class="text-danger">*</span>
              </label>
              @if (invalid('consent')) {
                <div class="invalid-feedback d-block">Consent is required before saving.</div>
              }
            </div>
          </div>

          @if (error) {
            <div class="alert alert-danger small py-2 mb-3">
              <i class="bi bi-exclamation-triangle me-1"></i>{{ error }}
            </div>
          }

          <button type="submit" class="btn btn-primary w-100" [disabled]="submitting">
            @if (submitting) {
              <span class="spinner-border spinner-border-sm me-2"></span>Saving…
            } @else if (editId) {
              <i class="bi bi-floppy me-1"></i>Update Volunteer
            } @else {
              <i class="bi bi-person-heart me-1"></i>Save Volunteer
            }
          </button>

        </form>
      }
    </div>

    <style>
      .vol-photo-upload {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .vol-photo-upload__preview {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: 2px dashed var(--th-border, #dee2e6);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        background: var(--th-surface-2, #f8f9fa);
      }
      .vol-photo-upload__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .vol-photo-upload__placeholder {
        font-size: 2rem;
        color: var(--th-text-muted, #adb5bd);
      }
      .vol-photo-upload__actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: .5rem;
      }
    </style>
  `,
})
export class VolunteerCreateComponent implements OnInit {
  form: FormGroup;
  submitting = false;
  submitted  = false;
  error = '';
  success = false;
  editId: string | null = null;

  photoFile: File | null = null;
  photoPreview = signal<string | null>(null);
  photoError = '';

  readonly languageOptions = computed<ChipOption[]>(() =>
    this.master.languages().map(l => ({ value: l.name, label: l.name }))
  );

  readonly supportMethodOpts: SelectOption[] = [
    { value: 'WhatsApp Support',       label: 'WhatsApp Support' },
    { value: 'Phone Call Support',     label: 'Phone Call Support' },
    { value: 'Platform Messaging Only', label: 'Platform Messaging Only' },
  ];

  readonly contactPrefOpts: SelectOption[] = [
    { value: 'WhatsApp',       label: 'WhatsApp' },
    { value: 'Email',          label: 'Email' },
    { value: 'Platform Only',  label: 'Platform Only' },
  ];

  readonly availabilityOpts: SelectOption[] = [
    { value: 'Active',                  label: 'Active' },
    { value: 'Temporarily Unavailable', label: 'Temporarily Unavailable' },
  ];

  readonly yearOpts: SelectOption[] = (() => {
    const current = new Date().getFullYear();
    const opts: SelectOption[] = [];
    for (let y = current; y >= 1990; y--) opts.push({ value: String(y), label: String(y) });
    return opts;
  })();

  countryOpts = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  constructor(
    private fb: FormBuilder,
    private volunteerSvc: VolunteerService,
    private master: MasterDataService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private candidateSvc: CandidateService,
  ) {
    this.form = this.buildForm();
  }

  async ngOnInit(): Promise<void> {
    await this.master.loadAll();
    this.editId = this.route.snapshot.queryParamMap.get('edit');

    // Pre-fill from a candidate when navigating from the placed-candidate prompt
    const fromCandidateId = this.route.snapshot.queryParamMap.get('fromCandidate');
    if (fromCandidateId) {
      this.candidateSvc.getById(fromCandidateId).subscribe({
        next: ({ candidate: c }) => {
          this.form.patchValue({
            name:        [c.first_name, c.last_name].filter(Boolean).join(' '),
            email:       c.email       ?? '',
            phone:       c.phone       ?? '',
            nationality: c.nationality ?? null,
          });
        },
        error: () => this.toast.error('Could not pre-fill candidate details'),
      });
    }

    if (this.editId) {
      this.volunteerSvc.getById(this.editId).subscribe({
        next: ({ volunteer: v }) => {
          this.form.patchValue({
            name:               v.name,
            email:              v.email ?? '',
            phone:              v.phone ?? '',
            nationality:        v.nationality ?? null,
            country_placed:     v.country_placed ?? null,
            role:               v.role ?? '',
            company_joined:     v.company_joined ?? '',
            year_placed:        v.year_placed ? String(v.year_placed) : null,
            languages:          v.languages ?? [],
            success_story:      v.success_story ?? '',
            support_method:     v.support_method ?? '',
            contact_preference: v.contact_preference ?? '',
            availability:       v.availability ?? '',
            notes:              v.notes ?? '',
            consent:            v.consent ?? false,
          });
          if (v.photo_url) {
            this.photoPreview.set(v.photo_url);
          }
        },
        error: () => this.toast.error('Failed to load volunteer for editing'),
      });
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      name:               ['', Validators.required],
      email:              ['', Validators.email],
      phone:              [''],
      nationality:        [null, Validators.required],
      country_placed:     [null, Validators.required],
      role:               ['', Validators.required],
      company_joined:     [''],
      year_placed:        [null, Validators.required],
      languages:          [[]],
      success_story:      [''],
      support_method:     ['', Validators.required],
      contact_preference: ['', Validators.required],
      availability:       ['', Validators.required],
      notes:              [''],
      consent:            [false, Validators.requiredTrue],
    });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.touched || this.submitted));
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.photoError = '';
    if (file.size > 5 * 1024 * 1024) {
      this.photoError = 'Image is too large. Maximum size is 5 MB.';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.photoError = 'Only JPEG, PNG, or WebP images are allowed.';
      return;
    }

    this.photoFile = file;
    const reader   = new FileReader();
    reader.onload  = (e) => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreview.set(null);
    this.photoError = '';
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error = '';

    const v = this.form.value;
    const payload = {
      name:               v.name.trim(),
      email:              v.email?.trim()          || undefined,
      phone:              v.phone?.trim()          || undefined,
      nationality:        v.nationality            || undefined,
      country_placed:     v.country_placed         || undefined,
      role:               v.role?.trim()           || undefined,
      company_joined:     v.company_joined?.trim() || undefined,
      year_placed:        v.year_placed            ? Number(v.year_placed) : undefined,
      languages:          v.languages?.length      ? v.languages : undefined,
      success_story:      v.success_story?.trim()  || undefined,
      support_method:     v.support_method         || undefined,
      contact_preference: v.contact_preference     || undefined,
      availability:       v.availability           || undefined,
      notes:              v.notes?.trim()          || undefined,
      consent:            v.consent,
    };

    if (this.editId) {
      // ── Edit mode ──
      const id = this.editId;
      const afterSave$ = this.photoFile
        ? this.volunteerSvc.update(id, payload).pipe(
            switchMap(() => this.volunteerSvc.uploadPhoto(id, this.photoFile!))
          )
        : this.volunteerSvc.update(id, payload);

      afterSave$.subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success('Volunteer updated successfully');
          this.success = true;
        },
        error: (err) => {
          this.submitting = false;
          this.error = err?.error?.message ?? 'Failed to update volunteer.';
        },
      });

    } else {
      // ── Create mode ──
      this.volunteerSvc.create(payload).pipe(
        switchMap((res) => {
          if (this.photoFile) {
            return this.volunteerSvc.uploadPhoto(res.volunteer.id, this.photoFile);
          }
          return [res];
        }),
      ).subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success('Volunteer added successfully');
          this.success = true;
        },
        error: (err) => {
          this.submitting = false;
          this.error = err?.error?.message ?? 'Failed to save volunteer.';
        },
      });
    }
  }

  reset(): void {
    this.success   = false;
    this.submitted = false;
    this.error     = '';
    this.removePhoto();
    this.form = this.buildForm();
  }
}
