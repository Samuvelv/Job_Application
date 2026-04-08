// src/app/features/employee/edit-request/edit-request.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators,
} from '@angular/forms';
import { EmployeeService } from '../../../core/services/employee.service';
import { EditRequestService } from '../../../core/services/edit-request.service';
import { Employee } from '../../../core/models/employee.model';
import { EditRequest } from '../../../core/models/edit-request.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-edit-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
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
              @if (existingRequest.status === 'pending') { <i class="bi bi-hourglass-split"></i> }
              @if (existingRequest.status === 'approved') { <i class="bi bi-check-circle"></i> }
              @if (existingRequest.status === 'rejected') { <i class="bi bi-x-circle"></i> }
            </div>
            <div class="status-banner__body">
              <div class="status-banner__title">
                @if (existingRequest.status === 'pending') { Pending Review }
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
        } @else if (form) {
          <form [formGroup]="form" (ngSubmit)="submit()">

            <!-- ── Personal ─────────────────────────────────────────────── -->
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
                <div class="col-12">
                  <label class="form-label small fw-semibold">Bio</label>
                  <textarea formControlName="bio" class="form-control form-control-sm" rows="3"></textarea>
                </div>
                <div class="col-12">
                  <label class="form-label small fw-semibold">LinkedIn URL</label>
                  <input formControlName="linkedin_url" class="form-control form-control-sm"
                    placeholder="https://linkedin.com/in/…">
                </div>
              </div>
            </div>

            <!-- ── Professional ────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <h5 class="card-section-header card-section-header--info"><i class="bi bi-briefcase"></i> Professional</h5>
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
                  <label class="form-label small fw-semibold">Years Experience</label>
                  <input formControlName="years_experience" type="number" min="0" max="60"
                    class="form-control form-control-sm">
                </div>
              </div>
            </div>

            <!-- ── Location ─────────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <h5 class="card-section-header card-section-header--success"><i class="bi bi-geo-alt"></i> Location</h5>
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

            <!-- ── Salary ───────────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <h5 class="card-section-header card-section-header--warning"><i class="bi bi-cash-coin"></i> Salary Expectation</h5>
              <div class="row g-3">
                <div class="col-md-3">
                  <label class="form-label small fw-semibold">Min</label>
                  <input formControlName="salary_min" type="number" min="0" class="form-control form-control-sm">
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-semibold">Max</label>
                  <input formControlName="salary_max" type="number" min="0" class="form-control form-control-sm">
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-semibold">Currency</label>
                  <input formControlName="salary_currency" class="form-control form-control-sm" placeholder="USD">
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-semibold">Type</label>
                  <select formControlName="salary_type" class="form-select form-select-sm">
                    <option value="">— Select —</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- ── Skills ───────────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-section-header card-section-header--purple mb-0"><i class="bi bi-tools"></i> Skills</h5>
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="addSkill()">+ Add</button>
              </div>
              @for (ctrl of skillsArray.controls; track $index) {
                <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-center">
                  <div class="col-md-6">
                    <input formControlName="skill_name" class="form-control form-control-sm" placeholder="Skill">
                  </div>
                  <div class="col-md-4">
                    <select formControlName="proficiency" class="form-select form-select-sm">
                      <option value="">Proficiency</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <button type="button" class="btn btn-sm btn-outline-danger w-100"
                      (click)="removeSkill($index)">✕</button>
                  </div>
                </div>
              }
            </div>

            <!-- ── Languages ────────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-section-header card-section-header--teal mb-0"><i class="bi bi-translate"></i> Languages</h5>
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="addLanguage()">+ Add</button>
              </div>
              @for (ctrl of languagesArray.controls; track $index) {
                <div [formGroup]="asGroup(ctrl)" class="row g-2 mb-2 align-items-center">
                  <div class="col-md-6">
                    <input formControlName="language" class="form-control form-control-sm" placeholder="Language">
                  </div>
                  <div class="col-md-4">
                    <select formControlName="proficiency" class="form-select form-select-sm">
                      <option value="">Proficiency</option>
                      <option value="basic">Basic</option>
                      <option value="conversational">Conversational</option>
                      <option value="fluent">Fluent</option>
                      <option value="native">Native</option>
                    </select>
                  </div>
                  <div class="col-md-2">
                    <button type="button" class="btn btn-sm btn-outline-danger w-100"
                      (click)="removeLanguage($index)">✕</button>
                  </div>
                </div>
              }
            </div>

            <!-- ── Experience ────────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-section-header card-section-header--orange mb-0"><i class="bi bi-building"></i> Work Experience</h5>
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
                      <input formControlName="end_date" type="date" class="form-control form-control-sm"
                        placeholder="End (blank = present)">
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

            <!-- ── Education ─────────────────────────────────────────────── -->
            <div class="form-card mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="card-section-header card-section-header--success mb-0"><i class="bi bi-mortarboard"></i> Education</h5>
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
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-danger mt-2"
                    (click)="removeEducation($index)">Remove</button>
                </div>
              }
            </div>

            <!-- Submit -->
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

  `,
})
export class EditRequestComponent implements OnInit {
  loadingProfile = true;
  form: FormGroup | null = null;
  submitting = false;
  submitted = false;
  submitError = '';
  existingRequest: EditRequest | null = null;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private editRequestService: EditRequestService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    // Load existing request status and current profile in parallel
    this.editRequestService.getMyRequest().subscribe({
      next: (res) => (this.existingRequest = res.request),
    });

    this.employeeService.getMyProfile().subscribe({
      next: (res) => {
        this.loadingProfile = false;
        this.buildForm(res.employee);
      },
      error: () => (this.loadingProfile = false),
    });
  }

  buildForm(emp: Employee): void {
    this.form = this.fb.group({
      first_name:       [emp.first_name ?? '', Validators.required],
      last_name:        [emp.last_name  ?? '', Validators.required],
      phone:            [emp.phone            ?? ''],
      date_of_birth:    [emp.date_of_birth    ?? ''],
      gender:           [emp.gender           ?? ''],
      bio:              [emp.bio              ?? ''],
      linkedin_url:     [emp.linkedin_url     ?? ''],
      job_title:        [emp.job_title        ?? ''],
      occupation:       [emp.occupation       ?? ''],
      industry:         [emp.industry         ?? ''],
      years_experience: [emp.years_experience ?? null],
      current_country:  [emp.current_country  ?? ''],
      current_city:     [emp.current_city     ?? ''],
      nationality:      [emp.nationality      ?? ''],
      salary_min:       [emp.salary_min       ?? null],
      salary_max:       [emp.salary_max       ?? null],
      salary_currency:  [emp.salary_currency  ?? ''],
      salary_type:      [emp.salary_type      ?? ''],
      skills:     this.fb.array((emp.skills    ?? []).map((s) => this.fb.group({ skill_name: [s.skill_name], proficiency: [s.proficiency ?? ''] }))),
      languages:  this.fb.array((emp.languages ?? []).map((l) => this.fb.group({ language: [l.language], proficiency: [l.proficiency ?? ''] }))),
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
    });
  }

  // ── FormArray getters ────────────────────────────────────────────────────────
  get skillsArray():    FormArray { return this.form!.get('skills')    as FormArray; }
  get languagesArray(): FormArray { return this.form!.get('languages') as FormArray; }
  get experienceArray():FormArray { return this.form!.get('experience') as FormArray; }
  get educationArray(): FormArray { return this.form!.get('education') as FormArray; }

  asGroup(c: import('@angular/forms').AbstractControl): FormGroup { return c as FormGroup; }

  addSkill():    void { this.skillsArray.push(this.fb.group({ skill_name: [''], proficiency: [''] })); }
  removeSkill(i: number): void { this.skillsArray.removeAt(i); }

  addLanguage():    void { this.languagesArray.push(this.fb.group({ language: [''], proficiency: [''] })); }
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
      start_year: [null], end_year: [null],
    }));
  }
  removeEducation(i: number): void { this.educationArray.removeAt(i); }

  // ── Submit ───────────────────────────────────────────────────────────────────
  submit(): void {
    if (!this.form || this.form.invalid) { this.form?.markAllAsTouched(); return; }
    if (this.existingRequest?.status === 'pending') return;

    this.submitting  = true;
    this.submitError = '';

    // Strip empty strings to undefined so the backend doesn't overwrite with blanks
    const raw = this.form.value;
    const clean = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== '' && v !== null),
    );

    this.editRequestService.submit(clean).subscribe({
      next: (res) => {
        this.submitting      = false;
        this.submitted       = true;
        this.existingRequest = res.request;
        this.toast.success('Edit request submitted and pending admin review.');
      },
      error: (err) => {
        this.submitting  = false;
        this.submitError = err?.error?.message ?? 'Failed to submit request.';
      },
    });
  }
}
