// src/app/features/admin/candidate-register/candidate-register.component.ts
import { Component, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import { CandidateService } from '../../../core/services/candidate.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { REGISTRATION_FEE_STATUS_OPTIONS, CV_FORMAT_OPTIONS, SOURCE_OPTIONS } from '../../../core/constants/candidate-options';

const DRAFT_KEY = 'th_register_draft';

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

@Component({
  selector: 'app-candidate-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, ChipMultiSelectComponent],
  templateUrl: './candidate-register.component.html',
})
export class CandidateRegisterComponent implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps  = 5;
  loading     = false;
  submitted   = false;
  errorMsg    = '';
  successMsg  = '';
  createdCandidateNumber = '';
  draftSaved  = false;

  pendingPhoto?:  File;
  pendingResume?: File;
  pendingVideo?:  File;
  pendingCerts: { name: string; issuer: string; issue_date: string; expiry_date: string; no_expiry: boolean; file?: File; filePreviewUrl?: string }[] = [];

  photoPreviewUrl?:  string;
  videoPreviewUrl?:  string;

  previewOpen  = false;
  previewType: 'image' | 'video' | 'pdf' | 'file' | null = null;
  previewUrl?: string;
  previewName?: string;

  private _objectUrls: string[] = [];

  form!: FormGroup;
  private draftSub?: Subscription;

  readonly STEPS = [
    { num: 1, label: 'Personal Details' },
    { num: 2, label: 'Professional'     },
    { num: 3, label: 'Experience/Education'        },
    { num: 4, label: 'Location'         },
    { num: 5, label: 'Review'           },
  ];

  readonly GENDERS      = ['male', 'female', 'non-binary', 'prefer_not_to_say'];
  readonly PROFICIENCY_SKILL = ['beginner', 'intermediate', 'expert'];
  readonly PROFICIENCY_LANG  = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'];
  readonly currentYear = new Date().getFullYear();

  readonly genderOptions: SelectOption[] = [
    { value: 'male',            label: 'Male'            },
    { value: 'female',          label: 'Female'          },
    { value: 'non-binary',      label: 'Non-binary'      },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];
  readonly proficiencySkillOptions: SelectOption[] = [
    { value: 'beginner',     label: 'Beginner'     },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert',       label: 'Expert'       },
  ];
  readonly proficiencyLangOptions: SelectOption[] = [
    { value: 'A1',     label: 'A1 — Beginner'       },
    { value: 'A2',     label: 'A2 — Elementary'      },
    { value: 'B1',     label: 'B1 — Intermediate'    },
    { value: 'B2',     label: 'B2 — Upper Intermediate' },
    { value: 'C1',     label: 'C1 — Advanced'        },
    { value: 'C2',     label: 'C2 — Proficient'      },
    { value: 'native', label: 'Native'                },
  ];
  readonly registrationFeeStatusOptions = REGISTRATION_FEE_STATUS_OPTIONS;
  readonly cvFormatOptions = CV_FORMAT_OPTIONS;
  readonly sourceOptions   = SOURCE_OPTIONS;

  // ── Computed SelectOption arrays from master data ─────────────────────────
  countryOptions    = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

  dialCodeOptions   = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.dial_code, label: `${c.flag_emoji} ${c.dial_code}`, sublabel: c.name })));

  cityOptions       = computed<SelectOption[]>(() =>
    this.master.cities().map(c => ({ value: c.name, label: c.name })));

  jobTitleOptions   = computed<SelectOption[]>(() =>
    this.master.jobTitles().map(j => ({ value: j.title, label: j.title, sublabel: j.occupation_name })));

  occupationOptions = computed<SelectOption[]>(() =>
    this.master.occupations().map(o => ({ value: o.name, label: o.name })));

  industryOptions   = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name })));

  languageOptions   = computed<SelectOption[]>(() =>
    this.master.languages().map(l => ({ value: l.name, label: l.name })));

  degreeOptions     = computed<SelectOption[]>(() =>
    this.master.degrees().map(d => ({ value: d.name, label: d.name })));

  fieldOfStudyOptions = computed<SelectOption[]>(() =>
    this.master.fieldsOfStudy().map(f => ({ value: f.name, label: f.name })));

  noticePeriodOptions = computed<SelectOption[]>(() =>
    this.master.noticePeriods().map(n => ({ value: n.id, label: n.label })));

  targetLocationChipOptions = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

  hobbyChipOptions = computed<ChipOption[]>(() =>
    this.master.hobbies().map(h => ({ value: h.name, label: h.name })));

  constructor(
    private fb: FormBuilder,
    private empSvc: CandidateService,
    private router: Router,
    public master: MasterDataService,
  ) {}

  ngOnInit(): void {
    this.master.loadAll();

    this.form = this.fb.group({
      first_name:    ['', [Validators.required, Validators.maxLength(100)]],
      last_name:     ['', [Validators.required, Validators.maxLength(100)]],
      date_of_birth: [''],
      gender:        [''],
      marital_status: [''],
      dial_code:            ['+1'],
      phone:                [''],
      whatsapp_number:      [''],
      whatsapp_same_as_phone: [false],
      bio:                  ['', Validators.maxLength(2000)],
      hobbies:       [[] as string[]],

      employment_status: [''],
      job_title:        [''],
      occupation:       [''],
      industry:         [''],
      years_experience: [null],
      linkedin_url:     [''],
      notice_period_id: [null],

      skills:    this.fb.array([]),
      languages: this.fb.array([]),

      current_country:  [''],
      current_city:     [''],
      nationality:      [''],
      postal_code:      ['', Validators.maxLength(20)],
      target_locations: [[]],

      experience: this.fb.array([]),
      education:  this.fb.array([]),

      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],

      registration_fee_status: ['pending_payment'],
      cv_format:               ['not_yet_created'],
      source:                  ['Other'],
      visa_status_select:      [''],
      visa_status_other:       [''],

      confirm_terms: [false],
      confirm_fee:   [false],
      confirm_docs:  [false],
    });

    this.addSkill();
    this.addLanguage();
    this.addExperience();
    this.addEducation();

    this.restoreDraft();

    // Subscribe to job_title changes for auto-fill
    this.form.get('job_title')!.valueChanges.subscribe(v => this.onJobTitleChange(v));
    // Subscribe to current_country changes for city cascade
    this.form.get('current_country')!.valueChanges.subscribe(v => this.onCountryChange(v));

    // WhatsApp "same as phone" sync
    this.form.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_number: `${raw.dial_code || ''}${raw.phone || ''}`.trim() }, { emitEvent: false });
      }
    });
    this.form.get('phone')!.valueChanges.subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_number: `${raw.dial_code || ''}${raw.phone || ''}`.trim() }, { emitEvent: false });
      }
    });
    this.form.get('dial_code')!.valueChanges.subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_number: `${raw.dial_code || ''}${raw.phone || ''}`.trim() }, { emitEvent: false });
      }
    });

    this.draftSub = this.form.valueChanges.pipe(debounceTime(800)).subscribe(() => {
      this.saveDraft();
    });

    this.draftSub.add(
      this.form.get('bio')!.valueChanges.subscribe((val: string | null) => {
        const text  = val ?? '';
        const words = text.trim() === '' ? [] : text.trim().split(/\s+/).filter(Boolean);
        if (words.length > this.BIO_WORD_LIMIT) {
          const clamped = words.slice(0, this.BIO_WORD_LIMIT).join(' ');
          this.form.get('bio')!.setValue(clamped, { emitEvent: false });
          this.bioWordCount = this.BIO_WORD_LIMIT;
        } else {
          this.bioWordCount = words.length;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.draftSub?.unsubscribe();
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }

  // ── Job Title → auto-fill Occupation ────────────────────────────────────────
  onJobTitleChange(titleName: string | number | null): void {
    if (!titleName) return;
    const jt = this.master.jobTitles().find(j => j.title === String(titleName));
    if (jt && !this.form.get('occupation')?.value) {
      this.form.patchValue({ occupation: jt.occupation_name }, { emitEvent: false });
    }
  }

  // ── Country change → load cities ────────────────────────────────────────────
  onCountryChange(countryName: string | number | null): void {
    this.form.patchValue({ current_city: '' }, { emitEvent: false });
    if (!countryName) { this.master.cities.set([]); return; }
    const country = this.master.countries().find(c => c.name === String(countryName));
    if (country) this.master.loadCities(country.id);
  }

  // ── Draft helpers ──────────────────────────────────────────────────────────
  private saveDraft(): void {
    try {
      const simple = { ...this.form.getRawValue() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(simple));
      this.draftSaved = true;
      setTimeout(() => (this.draftSaved = false), 3000);
    } catch { /* storage full */ }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const scalarKeys = [
        'first_name','last_name','date_of_birth','gender','marital_status','dial_code','phone','whatsapp_number','bio',
        'job_title','occupation','industry','years_experience','linkedin_url',
        'notice_period_id',
        'current_country','current_city','nationality','postal_code','target_locations',
        'email','password','hobbies','registration_fee_status','cv_format','source',
        'visa_status_select','visa_status_other','employment_status',
      ];      const patch: Record<string, unknown> = {};
      for (const k of scalarKeys) {
        if (draft[k] !== undefined && draft[k] !== null && draft[k] !== '') patch[k] = draft[k];
      }
      this.form.patchValue(patch, { emitEvent: false });
    } catch { /* corrupted draft */ }
  }

  private clearDraft(): void { localStorage.removeItem(DRAFT_KEY); }

  // ── FormArray helpers ──────────────────────────────────────────────────────
  get skills():     FormArray { return this.form.get('skills')     as FormArray; }
  get languages():  FormArray { return this.form.get('languages')  as FormArray; }
  get experience(): FormArray { return this.form.get('experience') as FormArray; }
  get education():  FormArray { return this.form.get('education')  as FormArray; }

  addSkill(): void {
    this.skills.push(this.fb.group({ skill_name: ['', Validators.required], proficiency: [''] }, { validators: skillGroupValidator }));
  }
  removeSkill(i: number): void { this.skills.removeAt(i); }

  addLanguage(): void {
    this.languages.push(this.fb.group({ language: ['', Validators.required], proficiency: [''] }, { validators: langGroupValidator }));
  }
  removeLanguage(i: number): void { this.languages.removeAt(i); }

  addExperience(): void {
    this.experience.push(this.fb.group({
      company_name: [''], job_title: [''], start_date: [''],
      end_date: [''], description: [''], location: [''],
      reason_for_leaving_select: [''],
      reason_for_leaving_other:  [''],
      currently_working: [false],
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
  private markStepTouched(step: number): void {
    const mark = (c: AbstractControl) => { c.markAsTouched(); c.updateValueAndValidity(); };
    switch (step) {
      case 1: mark(this.ctrl('first_name')); mark(this.ctrl('last_name')); break;
      case 2:
        this.skills.controls.forEach(g => {
          const name = g.get('skill_name')?.value?.trim();
          if (!name) return;
          mark(g.get('skill_name')!); mark(g.get('proficiency')!); g.updateValueAndValidity();
        });
        this.languages.controls.forEach(g => {
          const name = g.get('language')?.value?.trim();
          if (!name) return;
          mark(g.get('language')!); mark(g.get('proficiency')!); g.updateValueAndValidity();
        });
        break;
      case 5: mark(this.ctrl('email')); mark(this.ctrl('password')); break;
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1: return this.ctrl('first_name').valid && this.ctrl('last_name').valid;
      case 2: {
        const skillsOk = this.skills.controls.every(g => {
          const name = g.get('skill_name')?.value?.trim();
          if (!name) return true;
          return g.get('proficiency')!.valid;
        });
        const langsOk = this.languages.controls.every(g => {
          const name = g.get('language')?.value?.trim();
          if (!name) return true;
          return g.get('proficiency')!.valid;
        });
        return skillsOk && langsOk;
      }
      case 5: return this.ctrl('email').valid && this.ctrl('password').valid;
      default: return true;
    }
  }

  nextStep(): void {
    this.markStepTouched(this.currentStep);
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) this.currentStep++;
  }
  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }
  goToStep(n: number): void {
    if (n < this.currentStep) { this.currentStep = n; return; }
    this.markStepTouched(this.currentStep);
    if (this.isStepValid(this.currentStep)) this.currentStep = n;
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
    if (file.size > 200 * 1024 * 1024) {
      this.errorMsg = `Video exceeds the 200 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(1)} MB). Please choose a smaller file.`;
      (e.target as HTMLInputElement).value = '';
      return;
    }
    this.errorMsg = '';
    this.pendingVideo = file;
    if (this.videoPreviewUrl) { URL.revokeObjectURL(this.videoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.videoPreviewUrl); }
    this.videoPreviewUrl = URL.createObjectURL(file);
    this._objectUrls.push(this.videoPreviewUrl);
  }
  addCertEntry(): void {
    this.pendingCerts.push({ name: '', issuer: '', issue_date: '', expiry_date: '', no_expiry: false });
  }
  onCertFileSelected(i: number, e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const cert = this.pendingCerts[i];
    if (cert.filePreviewUrl) URL.revokeObjectURL(cert.filePreviewUrl);
    cert.file = file;
    cert.filePreviewUrl = URL.createObjectURL(file);
    this._objectUrls.push(cert.filePreviewUrl);
    if (!cert.name) cert.name = file.name.replace(/\.[^.]+$/, '');
    (e.target as HTMLInputElement).value = '';
  }
  toggleCertNoExpiry(i: number): void {
    const cert = this.pendingCerts[i];
    cert.no_expiry = !cert.no_expiry;
    if (cert.no_expiry) cert.expiry_date = '';
  }
  removeCert(i: number): void {
    const cert = this.pendingCerts[i];
    if (cert.filePreviewUrl) URL.revokeObjectURL(cert.filePreviewUrl);
    this.pendingCerts.splice(i, 1);
  }
  clearPhoto(): void {
    if (this.photoPreviewUrl) { URL.revokeObjectURL(this.photoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.photoPreviewUrl); }
    this.pendingPhoto = undefined; this.photoPreviewUrl = undefined;
  }
  clearResume(): void { this.pendingResume = undefined; }
  clearVideo(): void {
    if (this.videoPreviewUrl) { URL.revokeObjectURL(this.videoPreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.videoPreviewUrl); }
    this.pendingVideo = undefined; this.videoPreviewUrl = undefined;
  }

  openPreview(type: 'image' | 'video' | 'pdf' | 'file', url?: string, name?: string): void {
    this.previewType = type; this.previewUrl = url; this.previewName = name; this.previewOpen = true;
  }
  closePreview(): void {
    this.previewOpen = false; this.previewType = null; this.previewUrl = undefined; this.previewName = undefined;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  readonly BIO_WORD_LIMIT = 2000;
  bioWordCount = 0;

  countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';
    if (!this.isStepValid(5)) return;

    const raw = this.form.getRawValue();
    const skills      = raw.skills.filter((s: any) => s.skill_name?.trim());
    const languages   = raw.languages.filter((l: any) => l.language?.trim());
    const experience  = raw.experience
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
    const education   = raw.education.filter((e: any) => e.institution?.trim() || e.degree?.trim());

    const phone = raw.phone ? `${raw.dial_code || ''}${raw.phone}`.trim() : undefined;

    const payload = {
      email: raw.email, password: raw.password,
      first_name: raw.first_name, last_name: raw.last_name,
      date_of_birth:    raw.date_of_birth   || undefined,
      gender:           raw.gender          || undefined,
      marital_status:   raw.marital_status  || undefined,
      phone:            phone               || undefined,
      whatsapp_number:  raw.whatsapp_number || undefined,
      bio:              raw.bio             || undefined,
      employment_status: raw.employment_status || undefined,
      job_title:        raw.job_title       || undefined,
      occupation:       raw.occupation      || undefined,
      industry:         raw.industry        || undefined,
      years_experience: raw.years_experience || undefined,
      linkedin_url:     raw.linkedin_url    || undefined,
      notice_period_id: raw.notice_period_id || undefined,
      current_country:  raw.current_country || undefined,
      current_city:     raw.current_city    || undefined,
      nationality:      raw.nationality     || undefined,
      postal_code:      raw.postal_code     || undefined,
      target_locations: Array.isArray(raw.target_locations) ? raw.target_locations : [],
      hobbies: Array.isArray(raw.hobbies) ? raw.hobbies : [],
      registration_fee_status: raw.registration_fee_status || 'pending_payment',
      cv_format:               raw.cv_format               || 'not_yet_created',
      source:                  raw.source                  || 'Other',
      visa_status: raw.visa_status_select === 'other'
        ? (raw.visa_status_other?.trim() ? `Other: ${raw.visa_status_other.trim()}` : 'Other — specify')
        : (raw.visa_status_select || undefined),
      skills, languages, experience, education,
    };

    this.loading = true;
    this.empSvc.create(payload as any).subscribe({
      next: async (res) => {
        const id = res.candidate.id;
        await this.uploadPendingFiles(id);
        this.clearDraft();
        this.loading    = false;
        this.createdCandidateNumber = res.candidate.candidate_number ?? '';
        this.successMsg = `${res.candidate.first_name} ${res.candidate.last_name} registered successfully! Welcome email sent. WhatsApp notification dispatched (if number provided).`;
        setTimeout(() => this.router.navigate(['/admin/candidates']), 3000);
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message ?? 'Registration failed. Please try again.';
      },
    });
  }

  private async uploadPendingFiles(candidateId: string): Promise<void> {
    const uploads: Promise<any>[] = [];
    if (this.pendingPhoto)  uploads.push(this.empSvc.uploadFile(candidateId, 'profiles',     this.pendingPhoto).toPromise());
    if (this.pendingResume) uploads.push(this.empSvc.uploadFile(candidateId, 'resumes',      this.pendingResume).toPromise());
    if (this.pendingVideo)  uploads.push(this.empSvc.uploadFile(candidateId, 'videos',       this.pendingVideo).toPromise());
    for (const cert of this.pendingCerts) {
      if (!cert.file) continue;
      uploads.push(this.empSvc.uploadCertificate(candidateId, cert.file, {
        name:        cert.name || cert.file.name,
        issuer:      cert.issuer      || undefined,
        issue_date:  cert.issue_date  || undefined,
        expiry_date: cert.no_expiry   ? null : (cert.expiry_date || null),
        no_expiry:   cert.no_expiry,
      }).toPromise());
    }
    await Promise.allSettled(uploads);
  }
}
