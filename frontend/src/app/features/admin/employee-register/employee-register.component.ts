// src/app/features/admin/employee-register/employee-register.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';

const DRAFT_KEY = 'th_register_draft';

@Component({
  selector: 'app-employee-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employee-register.component.html',
})
export class EmployeeRegisterComponent implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps  = 5;
  loading     = false;
  submitted   = false;
  errorMsg    = '';
  successMsg  = '';
  draftSaved  = false;

  pendingPhoto?:  File;
  pendingResume?: File;
  pendingVideo?:  File;
  pendingCerts: { file: File; name: string }[] = [];

  // Preview state
  photoPreviewUrl?:  string;
  videoPreviewUrl?:  string;

  previewOpen  = false;
  previewType: 'image' | 'video' | 'pdf' | 'file' | null = null;
  previewUrl?: string;
  previewName?: string;

  // Track created object URLs for cleanup
  private _objectUrls: string[] = [];

  form!: FormGroup;
  private draftSub?: Subscription;

  readonly STEPS = [
    { num: 1, label: 'Personal'     },
    { num: 2, label: 'Professional' },
    { num: 3, label: 'Location'     },
    { num: 4, label: 'Education'    },
    { num: 5, label: 'Credentials'  },
  ];

  readonly GENDERS      = ['male', 'female', 'non-binary', 'prefer_not_to_say'];
  readonly SALARY_TYPES = ['monthly', 'annual', 'hourly'];
  readonly CURRENCIES   = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'INR', 'AUD', 'CAD'];
  readonly PROFICIENCY_SKILL = ['beginner', 'intermediate', 'expert'];
  readonly PROFICIENCY_LANG  = ['basic', 'conversational', 'fluent', 'native'];
  readonly currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private empSvc: EmployeeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      first_name:    ['', [Validators.required, Validators.maxLength(100)]],
      last_name:     ['', [Validators.required, Validators.maxLength(100)]],
      date_of_birth: [''],
      gender:        [''],
      phone:         [''],
      bio:           ['', Validators.maxLength(2000)],

      job_title:        [''],
      occupation:       [''],
      industry:         [''],
      years_experience: [null],
      linkedin_url:     [''],
      salary_min:       [null],
      salary_max:       [null],
      salary_currency:  ['USD'],
      salary_type:      ['monthly'],

      skills:    this.fb.array([]),
      languages: this.fb.array([]),

      current_country:  [''],
      current_city:     [''],
      nationality:      [''],
      target_locations: [''],

      experience: this.fb.array([]),
      education:  this.fb.array([]),

      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this.addSkill();
    this.addLanguage();
    this.addExperience();
    this.addEducation();

    // Restore draft
    this.restoreDraft();

    // Auto-save draft on changes
    this.draftSub = this.form.valueChanges.pipe(debounceTime(800)).subscribe(() => {
      this.saveDraft();
    });
  }

  ngOnDestroy(): void {
    this.draftSub?.unsubscribe();
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }

  // ── Draft helpers ──────────────────────────────────────────────────────────
  private saveDraft(): void {
    try {
      const simple = { ...this.form.getRawValue() };
      // Don't persist FormArrays as they get complex — store top-level scalars only
      localStorage.setItem(DRAFT_KEY, JSON.stringify(simple));
      this.draftSaved = true;
      setTimeout(() => (this.draftSaved = false), 3000);
    } catch { /* storage full — ignore */ }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      // Only patch scalar fields (not FormArrays)
      const scalarKeys = [
        'first_name','last_name','date_of_birth','gender','phone','bio',
        'job_title','occupation','industry','years_experience','linkedin_url',
        'salary_min','salary_max','salary_currency','salary_type',
        'current_country','current_city','nationality','target_locations',
        'email','password',
      ];
      const patch: Record<string, unknown> = {};
      for (const k of scalarKeys) {
        if (draft[k] !== undefined && draft[k] !== null && draft[k] !== '') patch[k] = draft[k];
      }
      this.form.patchValue(patch, { emitEvent: false });
    } catch { /* corrupted draft — ignore */ }
  }

  private clearDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
  }

  // ── FormArray helpers ──────────────────────────────────────────────────────
  get skills():     FormArray { return this.form.get('skills')     as FormArray; }
  get languages():  FormArray { return this.form.get('languages')  as FormArray; }
  get experience(): FormArray { return this.form.get('experience') as FormArray; }
  get education():  FormArray { return this.form.get('education')  as FormArray; }

  addSkill(): void {
    this.skills.push(this.fb.group({ skill_name: [''], proficiency: [''] }));
  }
  removeSkill(i: number): void { this.skills.removeAt(i); }

  addLanguage(): void {
    this.languages.push(this.fb.group({ language: [''], proficiency: [''] }));
  }
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
      start_year: [null], end_year: [null], location: [''],
    }));
  }
  removeEducation(i: number): void { this.education.removeAt(i); }

  ctrl(name: string): AbstractControl { return this.form.get(name)!; }

  // ── Step validation ────────────────────────────────────────────────────────
  isStepValid(step: number): boolean {
    switch (step) {
      case 1: return this.ctrl('first_name').valid && this.ctrl('last_name').valid;
      case 5: return this.ctrl('email').valid && this.ctrl('password').valid;
      default: return true;
    }
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++;
    }
  }
  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }
  goToStep(n: number): void {
    if (n < this.currentStep || this.isStepValid(this.currentStep)) {
      this.currentStep = n;
    }
  }

  // ── File selection ─────────────────────────────────────────────────────────
  onPhotoSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingPhoto = file;
    if (this.photoPreviewUrl) { URL.revokeObjectURL(this.photoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.photoPreviewUrl); }
    this.photoPreviewUrl = URL.createObjectURL(file);
    this._objectUrls.push(this.photoPreviewUrl);
  }

  onResumeSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingResume = file;
  }

  onVideoSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingVideo = file;
    if (this.videoPreviewUrl) { URL.revokeObjectURL(this.videoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.videoPreviewUrl); }
    this.videoPreviewUrl = URL.createObjectURL(file);
    this._objectUrls.push(this.videoPreviewUrl);
  }

  onCertSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.pendingCerts.push({ file, name: file.name });
    // Reset input so same file can be re-selected
    (e.target as HTMLInputElement).value = '';
  }

  removeCert(i: number): void { this.pendingCerts.splice(i, 1); }

  clearPhoto(): void {
    if (this.photoPreviewUrl) { URL.revokeObjectURL(this.photoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.photoPreviewUrl); }
    this.pendingPhoto = undefined;
    this.photoPreviewUrl = undefined;
  }

  clearResume(): void { this.pendingResume = undefined; }

  clearVideo(): void {
    if (this.videoPreviewUrl) { URL.revokeObjectURL(this.videoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.videoPreviewUrl); }
    this.pendingVideo = undefined;
    this.videoPreviewUrl = undefined;
  }

  // ── Preview modal ──────────────────────────────────────────────────────────
  openPreview(type: 'image' | 'video' | 'pdf' | 'file', url?: string, name?: string): void {
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

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';
    if (!this.isStepValid(5)) return;

    const raw = this.form.getRawValue();
    const skills      = raw.skills.filter((s: any) => s.skill_name?.trim());
    const languages   = raw.languages.filter((l: any) => l.language?.trim());
    const experience  = raw.experience.filter((e: any) => e.company_name?.trim() || e.job_title?.trim());
    const education   = raw.education.filter((e: any) => e.institution?.trim() || e.degree?.trim());

    const payload = {
      email:    raw.email,
      password: raw.password,
      first_name: raw.first_name, last_name: raw.last_name,
      date_of_birth:   raw.date_of_birth   || undefined,
      gender:          raw.gender          || undefined,
      phone:           raw.phone           || undefined,
      bio:             raw.bio             || undefined,
      job_title:       raw.job_title       || undefined,
      occupation:      raw.occupation      || undefined,
      industry:        raw.industry        || undefined,
      years_experience: raw.years_experience || undefined,
      linkedin_url:    raw.linkedin_url    || undefined,
      salary_min:      raw.salary_min      || undefined,
      salary_max:      raw.salary_max      || undefined,
      salary_currency: raw.salary_currency || undefined,
      salary_type:     raw.salary_type     || undefined,
      current_country: raw.current_country || undefined,
      current_city:    raw.current_city    || undefined,
      nationality:     raw.nationality     || undefined,
      target_locations: raw.target_locations
        ? raw.target_locations.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      skills, languages, experience, education,
    };

    this.loading = true;
    this.empSvc.create(payload as any).subscribe({
      next: async (res) => {
        const id = res.employee.id;
        await this.uploadPendingFiles(id);
        this.clearDraft();
        this.loading    = false;
        this.successMsg = `Employee ${res.employee.first_name} registered successfully! Credentials emailed.`;
        setTimeout(() => this.router.navigate(['/admin/employees']), 2000);
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message ?? 'Registration failed. Please try again.';
      },
    });
  }

  private async uploadPendingFiles(employeeId: string): Promise<void> {
    const uploads: Promise<any>[] = [];
    if (this.pendingPhoto)  uploads.push(this.empSvc.uploadFile(employeeId, 'profiles',     this.pendingPhoto).toPromise());
    if (this.pendingResume) uploads.push(this.empSvc.uploadFile(employeeId, 'resumes',      this.pendingResume).toPromise());
    if (this.pendingVideo)  uploads.push(this.empSvc.uploadFile(employeeId, 'videos',       this.pendingVideo).toPromise());
    for (const cert of this.pendingCerts) {
      uploads.push(this.empSvc.uploadFile(employeeId, 'certificates', cert.file, cert.name).toPromise());
    }
    await Promise.allSettled(uploads);
  }
}
