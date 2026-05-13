// src/app/features/admin/candidate-edit/candidate-edit.component.ts
import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CandidateService } from '../../../core/services/candidate.service';
import { ToastService } from '../../../core/services/toast.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { VolunteerService } from '../../../core/services/volunteer.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { Candidate, Certificate } from '../../../core/models/candidate.model';
import { REGISTRATION_FEE_STATUS_OPTIONS, CV_FORMAT_OPTIONS, SOURCE_OPTIONS, EMPLOYMENT_STATUS_OPTIONS, VISA_STATUS_OPTIONS, REASON_FOR_LEAVING_OPTIONS } from '../../../core/constants/candidate-options';

// ── LinkedIn URL validator ─────────────────────────────────────────────────
function linkedInValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null;
    const ok = /^https?:\/\/(www\.)?linkedin\.com\/(in|company|pub|school)\/[a-zA-Z0-9\-_%]+\/?/.test(v);
    return ok ? null : { invalidLinkedIn: true };
  };
}

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

// ── Phone rules ────────────────────────────────────────────────────────────
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

function passwordsMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw  = g.get('new_password')?.value;
  const cpw = g.get('confirm_password')?.value;
  if (!pw) return null;
  return pw === cpw ? null : { passwordsMismatch: true };
}

// ── Education year validator ───────────────────────────────────────────────
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
  const start = Number(g.get('start_year')?.value);
  const end   = Number(g.get('end_year')?.value);
  const endCtrl = g.get('end_year');
  if (!endCtrl) return null;
  if (!g.get('start_year')?.value || !g.get('end_year')?.value) {
    const cur = endCtrl.errors;
    if (cur?.['endBeforeStart']) { const { endBeforeStart: _, ...rest } = cur; endCtrl.setErrors(Object.keys(rest).length ? rest : null); }
    return null;
  }
  if (end < start) {
    endCtrl.setErrors({ ...(endCtrl.errors || {}), endBeforeStart: true });
    return { endBeforeStart: true };
  }
  const cur = endCtrl.errors;
  if (cur?.['endBeforeStart']) { const { endBeforeStart: _, ...rest } = cur; endCtrl.setErrors(Object.keys(rest).length ? rest : null); }
  return null;
}

// ── Postal code rules ──────────────────────────────────────────────────────
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

  isExperienceBased = false;

  // Volunteer invitation prompt
  showPlacedPrompt = false;
  inviteSending    = false;
  inviteError      = '';

  form!: FormGroup;

  mediaLoading: Record<string, boolean> = {};
  certDeleting: number | null = null;

  // Per-cert inline editing
  editingCertId: number | null = null;
  certEditForm: FormGroup | null = null;

  // New cert pending card
  pendingNewCert: { name: string; issuer: string; issue_date: string; expiry_date: string; no_expiry: boolean; file?: File } | null = null;

  // Password section visibility toggles
  showCurrentPw = false;
  showNewPw     = false;
  showConfirmPw = false;

  previewOpen = false;
  previewType: 'image' | 'video' | 'pdf' | null = null;
  previewUrl: string | undefined;
  previewName: string | undefined;

  private loadedCountry: string | null = null;

  readonly GENDERS       = ['male', 'female', 'non-binary', 'prefer_not_to_say'];
  readonly SALARY_TYPES  = ['monthly', 'annual', 'hourly'];
  readonly PROFICIENCY_SKILL = ['beginner', 'intermediate', 'expert'];
  readonly PROFICIENCY_LANG  = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'];
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
  readonly statusOptions: SelectOption[] = [
    { value: 'active',       label: 'Active'       },
    { value: 'inactive',     label: 'Inactive'     },
    { value: 'pending_edit', label: 'Pending Edit' },
    { value: 'placed',       label: 'Placed'       },
  ];
  readonly registrationFeeStatusOptions = REGISTRATION_FEE_STATUS_OPTIONS;
  readonly cvFormatOptions             = CV_FORMAT_OPTIONS;
  readonly sourceOptions               = SOURCE_OPTIONS;
  readonly maritalStatusOptions: SelectOption[] = [
    { value: 'single',   label: 'Single'   },
    { value: 'married',  label: 'Married'  },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed',  label: 'Widowed'  },
  ];
  readonly employmentStatusOptions     = EMPLOYMENT_STATUS_OPTIONS;
  readonly visaStatusOptions           = VISA_STATUS_OPTIONS;
  readonly reasonForLeavingOptions     = REASON_FOR_LEAVING_OPTIONS;

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

  noticePeriodOptions = computed<SelectOption[]>(() =>
    this.master.noticePeriods().map(n => ({ value: n.id, label: n.label })));

  targetLocationChipOptions = computed<ChipOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })));

  hobbyChipOptions = computed<ChipOption[]>(() =>
    this.master.hobbies().map(h => ({ value: h.name, label: h.name })));

  get safePreviewUrl(): SafeResourceUrl | undefined {
    if (!this.previewUrl) return undefined;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private empSvc: CandidateService,
    private toast: ToastService,
    public master: MasterDataService,
    private sanitizer: DomSanitizer,
    private volunteerSvc: VolunteerService,
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
          // WhatsApp "same as phone" sync
          f.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
            if (checked) {
              const raw = f.getRawValue();
              f.patchValue({ whatsapp_dial_code: raw.dial_code || '+1', whatsapp_number: raw.phone || '' }, { emitEvent: false });
              f.get('whatsapp_number')!.updateValueAndValidity();
            }
          });
          f.get('phone')!.valueChanges.subscribe(() => {
            if (f.get('whatsapp_same_as_phone')?.value) {
              const raw = f.getRawValue();
              f.patchValue({ whatsapp_dial_code: raw.dial_code || '+1', whatsapp_number: raw.phone || '' }, { emitEvent: false });
              f.get('whatsapp_number')!.updateValueAndValidity();
            }
          });
          f.get('dial_code')!.valueChanges.subscribe(() => {
            if (f.get('whatsapp_same_as_phone')?.value) {
              const raw = f.getRawValue();
              f.patchValue({ whatsapp_dial_code: raw.dial_code || '+1', whatsapp_number: raw.phone || '' }, { emitEvent: false });
              f.get('whatsapp_number')!.updateValueAndValidity();
            }
          });
          // Pre-load cities if country already set
          const country = res.candidate.current_country;
          this.loadedCountry = country ?? null;
          if (country) {
            const found = this.master.countries().find(c => c.name === country);
            if (found) this.master.loadCities(found.id);
          }
          // has_passport → nationality required
          f.get('has_passport')!.valueChanges.subscribe((hasPassport: boolean) => {
            const natCtrl = f.get('nationality')!;
            if (hasPassport) {
              natCtrl.addValidators(Validators.required);
            } else {
              natCtrl.removeValidators(Validators.required);
              if (natCtrl.errors?.['required']) natCtrl.setErrors(null);
            }
            natCtrl.updateValueAndValidity({ emitEvent: false });
          });
          // Set initial nationality requirement based on loaded value
          if (res.candidate.has_passport) {
            f.get('nationality')!.addValidators(Validators.required);
            f.get('nationality')!.updateValueAndValidity({ emitEvent: false });
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
    const newCountry = countryName ? String(countryName) : null;
    // Only clear city when user picks a different country (not on initial load)
    if (newCountry !== this.loadedCountry) {
      this.form.patchValue({ current_city: '' }, { emitEvent: false });
    }
    this.loadedCountry = newCountry;
    if (!newCountry) { this.master.cities.set([]); return; }
    const country = this.master.countries().find(c => c.name === newCountry);
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
      company_name: ['', Validators.required], job_title: ['', Validators.required], start_date: ['', Validators.required],
      end_date: [''], description: [''], location: ['', Validators.required],
      reason_for_leaving_select: [''],
      reason_for_leaving_other:  [''],
      currently_working: [false],
    }));
  }
  removeExperience(i: number): void { this.experience.removeAt(i); }

  addEducation(): void {
    const yr = new Date().getFullYear();
    this.education.push(this.fb.group({
      institution:    ['', Validators.required],
      degree:         ['', Validators.required],
      field_of_study: ['', Validators.required],
      start_year: [null as number | null, eduYearValidator(1950, yr)],
      end_year:   [null as number | null, eduYearValidator(1950, yr + 6)],
      location:       ['', Validators.required],
    }, { validators: eduEndYearGroupValidator }));
  }

  toggleExperienceBased(checked: boolean): void {
    this.isExperienceBased = checked;
    if (checked) {
      while (this.education.length) this.education.removeAt(0);
    }
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

  // ── Bio word counter ────────────────────────────────────────────────────────
  readonly BIO_WORD_LIMIT = 2000;

  get bioWordCount(): number {
    return this.countWords(this.form?.get('bio')?.value ?? '');
  }

  countWords(text: string): number {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
  }

  bioWordLimitValidator(limit: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const wordCount = this.countWords(control.value ?? '');
      return wordCount > limit ? { bioWordLimit: { actual: wordCount, max: limit } } : null;
    };
  }

  // ── Media handlers ─────────────────────────────────────────────────────────
  uploadFile(type: 'profiles' | 'resumes' | 'videos' | 'certificates', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.candidate) return;
    if (type === 'videos' && file.size > 200 * 1024 * 1024) {
      this.toast.error(`Video exceeds the 200 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(1)} MB). Please choose a smaller file.`);
      (event.target as HTMLInputElement).value = '';
      return;
    }
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

  startEditCert(cert: Certificate): void {
    this.editingCertId = cert.id ?? null;
    this.certEditForm = this.fb.group({
      name:        [cert.name        ?? ''],
      issuer:      [cert.issuer      ?? ''],
      issue_date:  [cert.issue_date  ?? ''],
      expiry_date: [cert.expiry_date ?? ''],
      no_expiry:   [cert.no_expiry   ?? false],
    });
  }

  cancelEditCert(): void {
    this.editingCertId = null;
    this.certEditForm  = null;
  }

  saveCertMetadata(): void {
    if (!this.certEditForm || !this.editingCertId) return;
    const v = this.certEditForm.value;
    this.empSvc.updateCertificate(this.candidateId, this.editingCertId, {
      name:        v.name        || undefined,
      issuer:      v.issuer      || undefined,
      issue_date:  v.issue_date  || null,
      expiry_date: v.no_expiry ? null : (v.expiry_date || null),
      no_expiry:   v.no_expiry,
    }).subscribe({
      next: () => {
        this.toast.success('Certificate updated');
        this.cancelEditCert();
        this.empSvc.getById(this.candidateId).subscribe(r => { this.candidate = r.candidate; });
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to update certificate'),
    });
  }

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
    if (!this.pendingNewCert.name) this.pendingNewCert.name = file.name.replace(/\.[^.]+$/, '');
    (event.target as HTMLInputElement).value = '';
  }

  submitNewCert(): void {
    const c = this.pendingNewCert;
    if (!c || !c.file) { this.toast.error('Please attach a file'); return; }
    this.mediaLoading['certificates'] = true;
    this.empSvc.uploadCertificate(this.candidateId, c.file, {
      name:        c.name || c.file.name,
      issuer:      c.issuer      || undefined,
      issue_date:  c.issue_date  || undefined,
      expiry_date: c.no_expiry   ? null : (c.expiry_date || null),
      no_expiry:   c.no_expiry,
    }).subscribe({
      next: () => {
        this.mediaLoading['certificates'] = false;
        this.pendingNewCert = null;
        this.toast.success('Certificate uploaded');
        this.empSvc.getById(this.candidateId).subscribe(r => { this.candidate = r.candidate; });
      },
      error: (err) => {
        this.mediaLoading['certificates'] = false;
        this.toast.error(err?.error?.message ?? 'Upload failed');
      },
    });
  }

  // ── Build form prefilled with candidate data ───────────────────────────────
  private buildForm(emp: Candidate): void {
    // Set experience-based flag from loaded candidate
    this.isExperienceBased = emp.is_experience_based ?? false;

    const { dialCode, number: phoneNumber } = this.splitPhone(emp.phone ?? '');
    const { dialCode: waDial, number: waNumber } = this.splitPhone(emp.whatsapp_number ?? '');

    // Parse stored visa_status back into select + other controls
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
      first_name:    [emp.first_name, [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-]+$/)]],
      last_name:     [emp.last_name,  [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-]+$/)]],
      date_of_birth: [emp.date_of_birth ?? '', [Validators.required, dobValidator()]],
      gender:        [emp.gender ?? '', Validators.required],
      marital_status: [emp.marital_status ?? ''],
      dial_code:     [dialCode],
      phone:         [phoneNumber, Validators.required],
      whatsapp_dial_code:    [waDial],
      whatsapp_number:       [waNumber, Validators.required],
      whatsapp_same_as_phone: [false],
      bio:           [emp.bio ?? '', this.bioWordLimitValidator(this.BIO_WORD_LIMIT)],
      profile_status:          [emp.profile_status          ?? 'active'],
      registration_fee_status: [emp.registration_fee_status ?? 'pending_payment'],
      cv_format:               [emp.cv_format               ?? 'not_yet_created'],
      source:                  [emp.source                  ?? 'Other'],

      visa_status_select: [visaSelect],
      visa_status_other:  [visaOther],

      employment_status: [emp.employment_status ?? '', Validators.required],
      job_title:        [emp.job_title ?? '',        Validators.required],
      occupation:       [emp.occupation ?? '',       Validators.required],
      industry:         [emp.industry ?? '',         Validators.required],
      years_experience: [emp.years_experience ?? 0],
      linkedin_url:     [emp.linkedin_url ?? '', linkedInValidator()],
      notice_period_id: [(emp as any).notice_period_id ?? null],

      current_country:  [emp.current_country ?? '', Validators.required],
      current_city:     [emp.current_city ?? '',    Validators.required],
      nationality:      [emp.nationality ?? ''],
      has_passport:     [emp.has_passport ?? false],
      postal_code:      [emp.postal_code ?? '', Validators.maxLength(20)],
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
          ? emp.experience.map(e => {
              let rflSel = '', rflOther = '';
              if (e.reason_for_leaving?.startsWith('Other: ')) {
                rflSel = 'Other'; rflOther = e.reason_for_leaving.slice(7);
              } else if (e.reason_for_leaving === 'Other') {
                rflSel = 'Other';
              } else {
                rflSel = e.reason_for_leaving ?? '';
              }
              return this.fb.group({
                company_name: [e.company_name ?? '', Validators.required], job_title: [e.job_title ?? '', Validators.required],
                start_date: [e.start_date ?? '', Validators.required], end_date: [e.end_date ?? ''],
                description: [e.description ?? ''], location: [e.location ?? '', Validators.required],
                reason_for_leaving_select: [rflSel],
                reason_for_leaving_other:  [rflOther],
                currently_working: [!e.end_date],
              });
            })
          : [this.fb.group({ company_name: ['', Validators.required], job_title: ['', Validators.required], start_date: ['', Validators.required], end_date: [''], description: [''], location: ['', Validators.required], reason_for_leaving_select: [''], reason_for_leaving_other: [''], currently_working: [false] })]
      ),
      education: this.fb.array(
        this.isExperienceBased
          ? []
          : emp.education?.length
            ? emp.education.map(e => { const yr = new Date().getFullYear(); return this.fb.group({
                institution: [e.institution ?? '', Validators.required], degree: [e.degree ?? '', Validators.required],
                field_of_study: [e.field_of_study ?? '', Validators.required], start_year: [e.start_year ?? null, eduYearValidator(1950, yr)],
                end_year: [e.end_year ?? null, eduYearValidator(1950, yr + 6)], location: [e.location ?? '', Validators.required],
              }, { validators: eduEndYearGroupValidator }); })
            : [(() => { const yr = new Date().getFullYear(); return this.fb.group({ institution: ['', Validators.required], degree: ['', Validators.required], field_of_study: ['', Validators.required], start_year: [null as number | null, eduYearValidator(1950, yr)], end_year: [null as number | null, eduYearValidator(1950, yr + 6)], location: ['', Validators.required] }, { validators: eduEndYearGroupValidator }); })()]
      ),

      // Credentials (optional)
      new_password:     ['', [Validators.minLength(8)]],
      confirm_password: [''],
    }, {
      validators: [
        passwordsMatchValidator,
        makePhoneGroupValidator('dial_code', 'phone'),
        makePhoneGroupValidator('whatsapp_dial_code', 'whatsapp_number'),
        makePostalCodeGroupValidator('current_country', 'postal_code'),
      ],
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving   = true;
    this.errorMsg = '';

    const raw = this.form.getRawValue();
    const phone = raw.phone ? `${raw.dial_code || ''}${raw.phone}`.trim() : undefined;
    const whatsapp = raw.whatsapp_number ? `${raw.whatsapp_dial_code || ''}${raw.whatsapp_number}`.trim() : undefined;
    const education = this.isExperienceBased ? [] : raw.education.filter((e: any) => e.institution?.trim() || e.degree?.trim());

    const payload = {
      first_name:    raw.first_name,
      last_name:     raw.last_name,
      date_of_birth: raw.date_of_birth   || undefined,
      gender:        raw.gender          || undefined,
      marital_status: raw.marital_status || undefined,
      phone:         phone               || undefined,
      whatsapp_number: whatsapp          || undefined,
      bio:           raw.bio             || undefined,
      profile_status:          raw.profile_status          || undefined,
      registration_fee_status: raw.registration_fee_status || undefined,
      cv_format:               raw.cv_format               || undefined,
      source:                  raw.source                  || undefined,
      visa_status: raw.visa_status_select === 'other'
        ? (raw.visa_status_other?.trim() ? `Other: ${raw.visa_status_other.trim()}` : 'Other — specify')
        : (raw.visa_status_select || undefined),
      job_title:     raw.job_title       || undefined,
      occupation:    raw.occupation      || undefined,
      industry:      raw.industry        || undefined,
      years_experience: raw.years_experience ?? undefined,
      linkedin_url:  raw.linkedin_url    || undefined,
      notice_period_id: raw.notice_period_id || undefined,
      current_country: raw.current_country || undefined,
      current_city:  raw.current_city    || undefined,
      nationality:   raw.nationality     || undefined,
      postal_code:   raw.postal_code     || undefined,
      has_passport:  raw.has_passport    ?? false,
      target_locations: Array.isArray(raw.target_locations) ? raw.target_locations : [],
      hobbies: Array.isArray(raw.hobbies) ? raw.hobbies : [],
      new_password: raw.new_password || undefined,
      skills:    raw.skills.filter((s: any) => s.skill_name?.trim()),
      languages: raw.languages.filter((l: any) => l.language?.trim()),
      experience: raw.experience
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
        }),
      education,
      is_experience_based: this.isExperienceBased,
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
        const c = this.candidate!;
        const langNames = (c.languages ?? []).map((l: any) => l.language).filter(Boolean);
        const placedReferral = (c.referrals ?? []).find((r: any) => r.status === 'placed');
        const countryPlaced  = placedReferral?.country ?? c.current_country ?? null;

        const payload = {
          name:             `${c.first_name} ${c.last_name}`.trim(),
          email:            c.email            ?? undefined,
          phone:            c.phone            ?? undefined,
          whatsapp_number:  c.whatsapp_number  ?? undefined,
          nationality:      c.nationality      ?? undefined,
          country_placed:   countryPlaced      ?? undefined,
          role:             c.job_title        ?? undefined,
          sector:           c.industry         ?? undefined,
          languages:        langNames.length ? langNames : undefined,
          photo_url:        c.profile_photo_url ?? undefined,
          availability:     'Active' as const,
          consent:          false,
        };

        this.volunteerSvc.create(payload).subscribe({
          next: (res) => {
            this.inviteSending    = false;
            this.showPlacedPrompt = false;
            this.toast.success('Volunteer created! Please complete their profile.');
            this.router.navigate(['/admin/volunteers', res.volunteer.id]);
          },
          error: (err) => {
            this.inviteSending = false;
            this.inviteError   = err?.error?.message ?? 'Failed to create volunteer.';
          },
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
