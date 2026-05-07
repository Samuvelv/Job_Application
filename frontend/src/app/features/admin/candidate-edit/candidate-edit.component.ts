// src/app/features/admin/candidate-edit/candidate-edit.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CandidateService } from '../../../core/services/candidate.service';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { Candidate, Certificate } from '../../../core/models/candidate.model';
import { REGISTRATION_FEE_STATUS_OPTIONS, CV_FORMAT_OPTIONS, SOURCE_OPTIONS } from '../../../core/constants/candidate-options';

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

function passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw  = g.get('new_password')?.value;
  const cpw = g.get('confirm_password')?.value;
  if (!pw) return null;
  return pw === cpw ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-candidate-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, ChipMultiSelectComponent],
  templateUrl: './candidate-edit.component.html',
})
export class CandidateEditComponent implements OnInit {
  candidateId = '';
  candidate: Candidate | null = null;
  loadError = '';
  saving = false;
  successMsg = '';
  errorMsg = '';

  // Volunteer invitation prompt
  showPlacedPrompt = false;
  inviteSending    = false;
  inviteError      = '';

  form!: FormGroup;

  mediaLoading: Record<string, boolean> = {};
  certDeleting: number | null = null;

  // Password section visibility toggles
  showCurrentPw = false;
  showNewPw     = false;
  showConfirmPw = false;

  previewOpen = false;
  previewType: 'image' | 'video' | 'pdf' | null = null;
  previewUrl: string | undefined;
  previewName: string | undefined;

  readonly GENDERS       = ['male', 'female', 'non-binary', 'prefer_not_to_say'];
  readonly SALARY_TYPES  = ['monthly', 'annual', 'hourly'];
  readonly PROFICIENCY_SKILL = ['beginner', 'intermediate', 'expert'];
  readonly PROFICIENCY_LANG  = ['basic', 'conversational', 'fluent', 'native'];
  readonly STATUSES = [
    { value: 'active',       label: 'Active'       },
    { value: 'inactive',     label: 'Inactive'     },
    { value: 'pending_edit', label: 'Pending Edit' },
    { value: 'placed',       label: 'Placed'       },
  ];
  readonly currentYear = new Date().getFullYear();

  readonly genderOptions: SelectOption[] = [
    { value: 'male',              label: 'Male'              },
    { value: 'female',            label: 'Female'            },
    { value: 'non-binary',        label: 'Non-binary'        },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];
  readonly salaryTypeOptions: SelectOption[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'annual',  label: 'Annual'  },
    { value: 'hourly',  label: 'Hourly'  },
  ];
  readonly proficiencySkillOptions: SelectOption[] = [
    { value: 'beginner',     label: 'Beginner'     },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert',       label: 'Expert'       },
  ];
  readonly proficiencyLangOptions: SelectOption[] = [
    { value: 'basic',          label: 'Basic'          },
    { value: 'conversational', label: 'Conversational' },
    { value: 'fluent',         label: 'Fluent'         },
    { value: 'native',         label: 'Native'         },
  ];
  readonly statusOptions: SelectOption[] = [
    { value: 'active',       label: 'Active'       },
    { value: 'inactive',     label: 'Inactive'     },
    { value: 'pending_edit', label: 'Pending Edit' },
    { value: 'placed',       label: 'Placed'       },
  ];
  readonly registrationFeeStatusOptions = REGISTRATION_FEE_STATUS_OPTIONS;
  readonly cvFormatOptions = CV_FORMAT_OPTIONS;
  readonly sourceOptions   = SOURCE_OPTIONS;

  // ── Computed SelectOption arrays ──────────────────────────────────────────
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

  currencyOptions   = computed<SelectOption[]>(() =>
    this.master.currencies().map(c => ({ value: c.code, label: `${c.code} — ${c.name}`, sublabel: c.symbol })));

  noticePeriodOptions = computed<SelectOption[]>(() =>
    this.master.noticePeriods().map(n => ({ value: n.id, label: n.label })));

  targetLocationChipOptions = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

  hobbyChipOptions = computed<ChipOption[]>(() =>
    this.master.hobbies().map(h => ({ value: h.name, label: h.name })));

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private empSvc: CandidateService,
    private toast: ToastService,
    public master: MasterDataService,
  ) {}

  ngOnInit(): void {
    this.master.loadAll();
    this.candidateId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.candidateId) { this.loadError = 'Invalid candidate ID.'; return; }
    this.loadCandidate();
  }

  private loadCandidate(): void {
    this.empSvc.getById(this.candidateId).subscribe({
      next: (res) => {
        this.candidate = res.candidate;
        if (!this.form) {
          this.buildForm(res.candidate);
          const f = this.form as FormGroup;
          // After form is built, subscribe to country changes for city cascade
          f.get('current_country')!.valueChanges.subscribe((v: any) => this.onCountryChange(v));
          // Subscribe to job_title for auto-fill occupation
          f.get('job_title')!.valueChanges.subscribe((v: any) => this.onJobTitleChange(v));
          // Pre-load cities if country already set
          const country = res.candidate.current_country;
          if (country) {
            const found = this.master.countries().find(c => c.name === country);
            if (found) this.master.loadCities(found.id);
          }
        }
      },
      error: (err) => (this.loadError = err?.error?.message ?? 'Failed to load candidate.'),
    });
  }

  // ── Phone split helper ────────────────────────────────────────────────────
  // Given a stored phone string like "+12025551234" tries to detect the dial
  // code prefix (matching against known codes, longest-first) and returns
  // { dialCode, number }. Falls back to { '+1', original } if no match.
  private splitPhone(phone: string): { dialCode: string; number: string } {
    if (!phone) return { dialCode: '+1', number: '' };
    const codes = this.master.countries()
      .map(c => c.dial_code)
      .filter((v, i, a) => a.indexOf(v) === i)   // unique
      .sort((a, b) => b.length - a.length);        // longest first
    for (const code of codes) {
      if (phone.startsWith(code)) {
        return { dialCode: code, number: phone.slice(code.length).trim() };
      }
    }
    return { dialCode: '+1', number: phone };
  }

  // ── Job Title → auto-fill Occupation ────────────────────────────────────
  onJobTitleChange(titleName: string | number | null): void {
    if (!titleName || !this.form) return;
    const jt = this.master.jobTitles().find(j => j.title === String(titleName));
    if (jt && !this.form.get('occupation')?.value) {
      this.form.patchValue({ occupation: jt.occupation_name }, { emitEvent: false });
    }
  }

  // ── Country change → load cities ──────────────────────────────────────────
  onCountryChange(countryName: string | number | null): void {
    if (!this.form) return;
    this.form.patchValue({ current_city: '' }, { emitEvent: false });
    if (!countryName) { this.master.cities.set([]); return; }
    const country = this.master.countries().find(c => c.name === String(countryName));
    if (country) this.master.loadCities(country.id);
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

  addExperience(): void {    this.experience.push(this.fb.group({
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
  uploadFile(type: 'profiles' | 'resumes' | 'videos' | 'certificates', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.candidate) return;
    this.mediaLoading[type] = true;
    const name = type === 'certificates' ? file.name.replace(/\.[^.]+$/, '') : undefined;
    this.empSvc.uploadFile(this.candidateId, type, file, name).subscribe({
      next: () => {
        this.mediaLoading[type] = false;
        this.toast.success('File uploaded');
        this.empSvc.getById(this.candidateId).subscribe(r => { this.candidate = r.candidate; });
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
    if (!this.candidate) return;
    this.mediaLoading[type] = true;
    this.empSvc.deleteFile(this.candidateId, type).subscribe({
      next: () => {
        this.mediaLoading[type] = false;
        this.toast.success('File removed');
        this.empSvc.getById(this.candidateId).subscribe(r => { this.candidate = r.candidate; });
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
    this.empSvc.deleteCertificate(this.candidateId, cert.id).subscribe({
      next: () => {
        this.certDeleting = null;
        this.toast.success('Certificate removed');
        this.empSvc.getById(this.candidateId).subscribe(r => { this.candidate = r.candidate; });
      },
      error: (err) => {
        this.certDeleting = null;
        this.toast.error(err?.error?.message ?? 'Failed to remove certificate');
      },
    });
  }

  // ── Build form prefilled with candidate data ───────────────────────────────
  private buildForm(emp: Candidate): void {
    const { dialCode, number: phoneNumber } = this.splitPhone(emp.phone ?? '');
    this.form = this.fb.group({
      first_name:    [emp.first_name, [Validators.required, Validators.maxLength(100)]],
      last_name:     [emp.last_name,  [Validators.required, Validators.maxLength(100)]],
      date_of_birth: [emp.date_of_birth ?? ''],
      gender:        [emp.gender ?? ''],
      dial_code:     [dialCode],
      phone:         [phoneNumber],
      bio:           [emp.bio ?? '', Validators.maxLength(2000)],
      profile_status:          [emp.profile_status          ?? 'active'],
      registration_fee_status: [emp.registration_fee_status ?? 'pending_payment'],
      cv_format:               [emp.cv_format               ?? 'not_yet_created'],
      source:                  [emp.source                  ?? 'Other'],

      job_title:        [emp.job_title ?? ''],
      occupation:       [emp.occupation ?? ''],
      industry:         [emp.industry ?? ''],
      years_experience: [emp.years_experience ?? null],
      linkedin_url:     [emp.linkedin_url ?? ''],
      salary_min:       [emp.salary_min ?? null],
      salary_max:       [emp.salary_max ?? null],
      salary_currency:  [emp.salary_currency ?? 'USD'],
      salary_type:      [emp.salary_type ?? 'monthly'],
      notice_period_id: [(emp as any).notice_period_id ?? null],

      current_country:  [emp.current_country ?? ''],
      current_city:     [emp.current_city ?? ''],
      nationality:      [emp.nationality ?? ''],
      target_locations: [Array.isArray(emp.target_locations) ? emp.target_locations : []],
      hobbies:          [Array.isArray(emp.hobbies) ? emp.hobbies : []],

      skills: this.fb.array(
        emp.skills?.length
          ? emp.skills.map(s => this.fb.group({ skill_name: [s.skill_name ?? '', Validators.required], proficiency: [s.proficiency ?? ''] }, { validators: skillGroupValidator }))
          : []
      ),
      languages: this.fb.array(
        emp.languages?.length
          ? emp.languages.map(l => this.fb.group({ language: [l.language ?? '', Validators.required], proficiency: [l.proficiency ?? ''] }, { validators: langGroupValidator }))
          : []
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

      // Credentials (optional)
      new_password:     ['', [Validators.minLength(8)]],
      confirm_password: [''],
    }, { validators: passwordsMatchValidator });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving   = true;
    this.errorMsg = '';

    const raw = this.form.getRawValue();
    const phone = raw.phone ? `${raw.dial_code || ''}${raw.phone}`.trim() : undefined;

    const payload = {
      first_name:    raw.first_name,
      last_name:     raw.last_name,
      date_of_birth: raw.date_of_birth   || undefined,
      gender:        raw.gender          || undefined,
      phone:         phone               || undefined,
      bio:           raw.bio             || undefined,
      profile_status:          raw.profile_status          || undefined,
      registration_fee_status: raw.registration_fee_status || undefined,
      cv_format:               raw.cv_format               || undefined,
      source:                  raw.source                  || undefined,
      job_title:     raw.job_title       || undefined,
      occupation:    raw.occupation      || undefined,
      industry:      raw.industry        || undefined,
      years_experience: raw.years_experience ?? undefined,
      linkedin_url:  raw.linkedin_url    || undefined,
      salary_min:    raw.salary_min      ?? undefined,
      salary_max:    raw.salary_max      ?? undefined,
      salary_currency: raw.salary_currency || undefined,
      salary_type:   raw.salary_type     || undefined,
      notice_period_id: raw.notice_period_id || undefined,
      current_country: raw.current_country || undefined,
      current_city:  raw.current_city    || undefined,
      nationality:   raw.nationality     || undefined,
      target_locations: Array.isArray(raw.target_locations) ? raw.target_locations : [],
      hobbies: Array.isArray(raw.hobbies) ? raw.hobbies : [],
      new_password: raw.new_password || undefined,
      skills:    raw.skills.filter((s: any) => s.skill_name?.trim()),
      languages: raw.languages.filter((l: any) => l.language?.trim()),
      experience: raw.experience.filter((e: any) => e.company_name?.trim() || e.job_title?.trim()),
      education:  raw.education.filter((e: any) => e.institution?.trim() || e.degree?.trim()),
    };

    this.empSvc.update(this.candidateId, payload as any).subscribe({
      next: (res) => {
        this.saving     = false;
        this.candidate   = res.candidate;
        this.successMsg = 'Candidate updated successfully!';
        this.toast.success('Candidate updated');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (raw.profile_status === 'placed' && !res.candidate.is_volunteer) {
          // Show volunteer invitation prompt only if not already a volunteer
          this.showPlacedPrompt = true;
        } else {
          setTimeout(() => this.router.navigate(['/admin/candidates', this.candidateId]), 1500);
        }
      },
      error: (err) => {
        this.saving   = false;
        this.errorMsg = err?.error?.message ?? 'Update failed. Please try again.';
      },
    });
  }

  // ── Volunteer invitation (shown after placing a candidate) ────────────────

  sendInvitation(): void {
    this.inviteSending = true;
    this.inviteError   = '';
    this.empSvc.inviteVolunteer(this.candidateId).subscribe({
      next: () => {
        this.inviteSending    = false;
        this.showPlacedPrompt = false;
        this.toast.success('Invitation sent successfully!');
        this.router.navigate(['/admin/volunteers/create'], {
          queryParams: { fromCandidate: this.candidateId },
        });
      },
      error: (err) => {
        this.inviteSending = false;
        this.inviteError   = err?.error?.message ?? 'Failed to send invitation.';
      },
    });
  }

  skipInvitation(): void {
    this.showPlacedPrompt = false;
    this.router.navigate(['/admin/candidates', this.candidateId]);
  }
}
