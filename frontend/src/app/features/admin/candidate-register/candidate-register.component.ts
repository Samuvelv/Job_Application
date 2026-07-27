// src/app/features/admin/candidate-register/candidate-register.component.ts
import { Component, OnInit, OnDestroy, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateUserDataPipe } from '../../../core/pipes/translate-user-data.pipe';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  FormArray, Validators, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, debounceTime } from 'rxjs';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CandidateService } from '../../../core/services/candidate.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { REGISTRATION_FEE_STATUS_OPTIONS, CV_FORMAT_OPTIONS, SOURCE_OPTIONS, EMPLOYMENT_STATUS_OPTIONS, VISA_STATUS_OPTIONS, REASON_FOR_LEAVING_OPTIONS } from '../../../core/constants/candidate-options';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';

function draftKey(userId: string): string {
  return `th_register_draft_${userId}`;
}

// ── Phone rules map ────────────────────────────────────────────────────────
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

function getPhoneRule(dialCode: string): PhoneRule {
  return PHONE_RULES[dialCode] ?? PHONE_FALLBACK;
}

// ── Date of Birth validator ────────────────────────────────────────────────
function dobValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = ctrl.value;
    if (!v) return null; // required handles empty
    const date = new Date(v);
    if (isNaN(date.getTime())) return { invalidDate: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date >= today) return { futureDate: true };
    const age = today.getFullYear() - date.getFullYear()
      - (today < new Date(today.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0);
    if (age < 16) return { tooYoung: true };
    if (age > 100) return { tooOld: true };
    return null;
  };
}

// ── Phone group validator factory ──────────────────────────────────────────
// Sets / clears errors on the number control; applied as a root-form validator.
function makePhoneGroupValidator(dialCtrl: string, numCtrl: string): ValidatorFn {  return (group: AbstractControl): ValidationErrors | null => {
    const dial = group.get(dialCtrl)?.value as string || '';
    const num  = (group.get(numCtrl)?.value as string || '').replace(/\s+/g, '');
    const numControl = group.get(numCtrl);
    if (!numControl) return null;

    // Don't override the required error — let Validators.required handle blank
    if (!num) {
      const cur = numControl.errors;
      if (cur?.['phoneInvalid']) {
        const { phoneInvalid: _, ...rest } = cur;
        numControl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }

    const rule = getPhoneRule(dial);
    const digitsOnly = /^\d+$/.test(num);
    const lenOk = num.length >= rule.minLen && num.length <= rule.maxLen;
    const patOk = rule.pattern ? rule.pattern.test(num) : true;

    if (!digitsOnly || !lenOk || !patOk) {
      const msg = `Invalid number for ${dial}. Expected: ${rule.hint}.`;
      numControl.setErrors({ ...(numControl.errors || {}), phoneInvalid: msg });
      return { phoneInvalid: true };
    }

    // Clear phoneInvalid if all else is fine
    const cur = numControl.errors;
    if (cur?.['phoneInvalid']) {
      const { phoneInvalid: _, ...rest } = cur;
      numControl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

// ── LinkedIn URL validator ─────────────────────────────────────────────────
function linkedInValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null; // required handles empty
    const ok = /^https?:\/\/(www\.)?linkedin\.com\/(in|company|pub|school)\/[a-zA-Z0-9\-_%]+\/?/.test(v);
    return ok ? null : { invalidLinkedIn: true };
  };
}

// ── Email validator (trims before checking) ────────────────────────────────
function emailValidator(): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = (ctrl.value as string || '').trim();
    if (!v) return null; // Validators.required handles empty
    // RFC-5322 simplified: must have local@domain.tld
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return ok ? null : { invalidEmail: true };
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

// ── Education year validator ───────────────────────────────────────────────
function eduYearValidator(minYear: number, maxYear: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = ctrl.value;
    if (v === null || v === '' || v === undefined) return null; // blank is ok
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

// ── Experience month/year helpers ─────────────────────────────────────────
function parseMonthFromDate(dateStr?: string | null): number {
  if (!dateStr) return 1;
  const m = dateStr.match(/^\d{4}-(\d{2})/);
  return m ? parseInt(m[1], 10) : 1;
}
function parseYearFromDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-\d{2}/);
  return m ? parseInt(m[1], 10) : null;
}

// ── Experience year validator (mirrors eduYearValidator) ───────────────────
function expYearValidator(minYear: number, maxYear: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const v = ctrl.value;
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n))                    return { expYearInvalid: 'Must be a whole number.' };
    if (String(v).replace('-', '').length !== 4) return { expYearInvalid: 'Must be a 4-digit year.' };
    if (n < minYear)                             return { expYearInvalid: `Year must be ${minYear} or later.` };
    if (n > maxYear)                             return { expYearInvalid: `Year must be ${maxYear} or earlier.` };
    return null;
  };
}

// ── Experience end-date group validator ────────────────────────────────────
function expEndDateGroupValidator(g: AbstractControl): ValidationErrors | null {
  if (g.get('currently_working')?.value) {
    const endCtrl = g.get('end_year');
    if (endCtrl?.errors?.['endBeforeStart']) {
      const { endBeforeStart: _, ...rest } = endCtrl.errors;
      endCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  }
  const start      = Number(g.get('start_year')?.value);
  const end        = Number(g.get('end_year')?.value);
  const startMonth = Number(g.get('start_month')?.value);
  const endMonth   = Number(g.get('end_month')?.value);
  const endCtrl    = g.get('end_year');
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

// ── Postal code rules ──────────────────────────────────────────────────────
interface PostalRule { pattern: RegExp; hint: string; }
const POSTAL_CODE_RULES: Record<string, PostalRule> = {
  'India':          { pattern: /^\d{6}$/,                           hint: '6-digit PIN code (e.g. 400001)' },
  'United States':  { pattern: /^\d{5}(-\d{4})?$/,                 hint: '5-digit ZIP or ZIP+4 (e.g. 94105)' },
  'United Kingdom': { pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, hint: 'UK postcode (e.g. SW1A 1AA)' },
  'Canada':         { pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,     hint: 'Canadian postal code (e.g. K1A 0A9)' },
  'Australia':      { pattern: /^\d{4}$/,                           hint: '4-digit postcode (e.g. 2000)' },
  'Germany':        { pattern: /^\d{5}$/,                           hint: '5-digit PLZ (e.g. 10115)' },
  'France':         { pattern: /^\d{5}$/,                           hint: '5-digit code (e.g. 75001)' },
  'South Africa':   { pattern: /^\d{4}$/,                           hint: '4-digit code (e.g. 2000)' },
  'Nigeria':        { pattern: /^\d{6}$/,                           hint: '6-digit postal code' },
  'Kenya':          { pattern: /^\d{5}$/,                           hint: '5-digit postal code' },
  'Pakistan':       { pattern: /^\d{5}$/,                           hint: '5-digit postal code' },
  'Bangladesh':     { pattern: /^\d{4}$/,                           hint: '4-digit postal code' },
  'Singapore':      { pattern: /^\d{6}$/,                           hint: '6-digit postal code (e.g. 018956)' },
  'Netherlands':    { pattern: /^\d{4}\s?[A-Z]{2}$/i,              hint: 'Dutch postcode (e.g. 1234 AB)' },
  'Brazil':         { pattern: /^\d{5}-?\d{3}$/,                    hint: 'Brazilian CEP (e.g. 01310-100)' },
  'China':          { pattern: /^\d{6}$/,                           hint: '6-digit postal code' },
  'Japan':          { pattern: /^\d{3}-?\d{4}$/,                    hint: 'Japanese postcode (e.g. 100-0001)' },
  'New Zealand':    { pattern: /^\d{4}$/,                           hint: '4-digit postcode' },
  'Ireland':        { pattern: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i,      hint: 'Eircode (e.g. D02 AF30)' },
};
const POSTAL_FALLBACK: PostalRule = { pattern: /^[a-zA-Z0-9\s\-]{3,10}$/, hint: '3–10 alphanumeric characters' };

function makePostalCodeGroupValidator(countryCtrl: string, postalCtrl: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const country  = (group.get(countryCtrl)?.value as string || '').trim();
    const postal   = (group.get(postalCtrl)?.value  as string || '').trim();
    const posCtrl  = group.get(postalCtrl);
    if (!posCtrl) return null;

    // If postal is empty, let Validators.required handle the empty case
    if (!postal) {
      const cur = posCtrl.errors;
      if (cur?.['postalCodeInvalid']) {
        const { postalCodeInvalid: _, ...rest } = cur;
        posCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }

    // Skip format validation for countries with no formal system (UAE, etc.)
    const noFormatCountries = ['United Arab Emirates', 'Hong Kong', 'Macau'];
    if (noFormatCountries.includes(country)) {
      const cur = posCtrl.errors;
      if (cur?.['postalCodeInvalid']) {
        const { postalCodeInvalid: _, ...rest } = cur;
        posCtrl.setErrors(Object.keys(rest).length ? rest : null);
      }
      return null;
    }

    const rule = POSTAL_CODE_RULES[country] ?? POSTAL_FALLBACK;
    if (!rule.pattern.test(postal)) {
      posCtrl.setErrors({ ...(posCtrl.errors || {}), postalCodeInvalid: rule.hint });
      return { postalCodeInvalid: true };
    }

    const cur = posCtrl.errors;
    if (cur?.['postalCodeInvalid']) {
      const { postalCodeInvalid: _, ...rest } = cur;
      posCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

@Component({
  selector: 'app-candidate-register',
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, ChipMultiSelectComponent, DragDropModule, TranslateUserDataPipe],
  templateUrl: './candidate-register.component.html',
})
export class CandidateRegisterComponent implements OnInit, OnDestroy, HasUnsavedChanges {
  currentStep = 1;
  totalSteps  = 5;
  loading     = false;
  submitted   = false;
  errorMsg    = '';
  successMsg  = '';
  createdCandidateNumber = '';
  createdLoginId = 0;
  draftSaved    = false;
  draftRestored = false;
  private _submitSuccess = false;

  pendingPhoto?:  File;
  pendingResume?: File;
  resumePreviewUrl?: string;
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

  isExperienceBased = false;

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
  readonly MONTHS = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' },
  ];

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
  readonly maritalStatusOptions: SelectOption[] = [
    { value: 'single',   label: 'Single'   },
    { value: 'married',  label: 'Married'  },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed',  label: 'Widowed'  },
  ];
  readonly registrationFeeStatusOptions = REGISTRATION_FEE_STATUS_OPTIONS;
  readonly cvFormatOptions             = CV_FORMAT_OPTIONS;
  readonly sourceOptions               = SOURCE_OPTIONS;
  readonly employmentStatusOptions     = EMPLOYMENT_STATUS_OPTIONS;
  readonly visaStatusOptions           = VISA_STATUS_OPTIONS;
  readonly reasonForLeavingOptions     = REASON_FOR_LEAVING_OPTIONS;

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

  targetLocationChipOptions = computed<ChipOption[]>(() => [
    { value: 'Any Location', label: '🌍 Any Location' },
    ...this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` })),
  ]);

  hobbyChipOptions = computed<ChipOption[]>(() =>
    this.master.hobbies().map(h => ({ value: h.name, label: h.name })));

  constructor(
    private fb: FormBuilder,
    private empSvc: CandidateService,
    private router: Router,
    public master: MasterDataService,
    private sanitizer: DomSanitizer,
    private auth: AuthService,
  ) {}

  get safePreviewUrl(): SafeResourceUrl | undefined {
    if (!this.previewUrl) return undefined;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
  }

  ngOnInit(): void {
    this.master.loadAll();

    this.form = this.fb.group({
      first_name:    ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-]+$/)]],
      last_name:     ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-zA-Z\s'\-]+$/)]],
      date_of_birth: ['', [Validators.required, dobValidator()]],
      gender:        ['', Validators.required],
      marital_status: [''],
      dial_code:            ['+1'],
      phone:                ['', Validators.required],
      whatsapp_dial_code:   ['+1'],
      whatsapp_number:      ['', Validators.required],
      whatsapp_same_as_phone: [false],
      bio:                  ['', this.bioWordLimitValidator(this.BIO_WORD_LIMIT)],
      hobbies:       [[] as string[]],

      employment_status: ['', Validators.required],
      job_title:        ['', Validators.required],
      occupation:       ['', Validators.required],
      industry:         ['', Validators.required],
      years_experience: [0],
      linkedin_url:     ['', linkedInValidator()],
      notice_period_id: [null],

      skills:    this.fb.array([]),
      languages: this.fb.array([]),

      current_country:  ['', Validators.required],
      current_city:     ['', Validators.required],
      nationality:      [''],
      postal_code:      ['', Validators.maxLength(20)],
      has_passport:     [false],
      target_locations: [[]],

      experience: this.fb.array([]),
      education:  this.fb.array([]),

      email:    ['', [Validators.required, emailValidator()]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)]],

      registration_fee_status: ['pending_payment'],
      cv_format:               ['not_yet_created'],
      source:                  ['Other'],
      visa_status_select:      [''],
      visa_status_other:       [''],

      confirm_terms: [false],
      confirm_docs:  [false],
    }, {
      validators: [
        makePhoneGroupValidator('dial_code', 'phone'),
        makePhoneGroupValidator('whatsapp_dial_code', 'whatsapp_number'),
        makePostalCodeGroupValidator('current_country', 'postal_code'),
      ],
    });

    this.addSkill();
    this.addLanguage();

    this.restoreDraft();

    // Subscribe to job_title changes for auto-fill
    this.form.get('job_title')!.valueChanges.subscribe(v => this.onJobTitleChange(v));
    // Subscribe to current_country changes for city cascade
    this.form.get('current_country')!.valueChanges.subscribe(v => this.onCountryChange(v));

    // WhatsApp "same as phone" sync
    this.form.get('whatsapp_same_as_phone')!.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_dial_code: raw.dial_code || '+1', whatsapp_number: raw.phone || '' }, { emitEvent: false });
        this.ctrl('whatsapp_number').updateValueAndValidity();
      }
    });
    this.form.get('phone')!.valueChanges.subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_dial_code: raw.dial_code || '+1', whatsapp_number: raw.phone || '' }, { emitEvent: false });
        this.ctrl('whatsapp_number').updateValueAndValidity();
      }
    });
    this.form.get('dial_code')!.valueChanges.subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) {
        const raw = this.form.getRawValue();
        this.form.patchValue({ whatsapp_dial_code: raw.dial_code || '+1', whatsapp_number: raw.phone || '' }, { emitEvent: false });
        this.ctrl('whatsapp_number').updateValueAndValidity();
      }
    });

    this.draftSub = this.form.valueChanges.pipe(debounceTime(800)).subscribe(() => {
      this.saveDraft();
    });

    // has_passport → nationality required
    this.form.get('has_passport')!.valueChanges.subscribe((hasPassport: boolean) => {
      const natCtrl = this.ctrl('nationality');
      if (hasPassport) {
        natCtrl.addValidators(Validators.required);
      } else {
        natCtrl.removeValidators(Validators.required);
        if (natCtrl.errors?.['required']) natCtrl.setErrors(null);
      }
      natCtrl.updateValueAndValidity({ emitEvent: false });
    });

  }

  ngOnDestroy(): void {
    this.draftSub?.unsubscribe();
    // Flush any pending draft on navigation/destroy — skip if form was successfully submitted
    if (!this._submitSuccess && this.isDirty()) this.saveDraft();
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this._submitSuccess && this.isDirty()) {
      this.saveDraft();
      event.preventDefault();
    }
  }

  isDirty(): boolean {
    return this.form?.dirty ?? false;
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
  private get _draftKey(): string {
    return draftKey(this.auth.currentUser()?.id ?? 'anon');
  }

  private saveDraft(): void {
    try {
      const raw = this.form.getRawValue();
      const data = {
        scalars: {
          first_name: raw.first_name, last_name: raw.last_name, date_of_birth: raw.date_of_birth,
          gender: raw.gender, marital_status: raw.marital_status, dial_code: raw.dial_code,
          phone: raw.phone, whatsapp_dial_code: raw.whatsapp_dial_code, whatsapp_number: raw.whatsapp_number,
          whatsapp_same_as_phone: raw.whatsapp_same_as_phone,
          bio: raw.bio, hobbies: raw.hobbies, employment_status: raw.employment_status,
          job_title: raw.job_title, occupation: raw.occupation, industry: raw.industry,
          years_experience: raw.years_experience, linkedin_url: raw.linkedin_url,
          notice_period_id: raw.notice_period_id, current_country: raw.current_country,
          current_city: raw.current_city, nationality: raw.nationality, postal_code: raw.postal_code,
          has_passport: raw.has_passport, target_locations: raw.target_locations,
          email: raw.email, password: raw.password, registration_fee_status: raw.registration_fee_status,
          cv_format: raw.cv_format, source: raw.source, visa_status_select: raw.visa_status_select,
          visa_status_other: raw.visa_status_other,
        },
        skills:     raw.skills,
        languages:  raw.languages,
        experience: raw.experience,
        education:  raw.education,
        isExperienceBased: this.isExperienceBased,
      };
      localStorage.setItem(this._draftKey, JSON.stringify(data));
      this.draftSaved = true;
      setTimeout(() => (this.draftSaved = false), 3000);
    } catch { /* storage full */ }
  }

  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this._draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);

      // Restore scalar fields
      if (draft.scalars) {
        this.form.patchValue(draft.scalars, { emitEvent: false });
      }

      // Restore isExperienceBased
      if (draft.isExperienceBased) {
        this.isExperienceBased = true;
      }

      // Restore skills
      if (Array.isArray(draft.skills) && draft.skills.length) {
        while (this.skills.length) this.skills.removeAt(0);
        for (const s of draft.skills) {
          this.skills.push(this.fb.group(
            { skill_name: [s.skill_name ?? ''], proficiency: [s.proficiency ?? ''] },
            { validators: skillGroupValidator }
          ));
        }
      }

      // Restore languages
      if (Array.isArray(draft.languages) && draft.languages.length) {
        while (this.languages.length) this.languages.removeAt(0);
        for (const l of draft.languages) {
          this.languages.push(this.fb.group(
            { language: [l.language ?? ''], proficiency: [l.proficiency ?? ''] },
            { validators: langGroupValidator }
          ));
        }
      }

      // Restore experience
      if (Array.isArray(draft.experience) && draft.experience.length) {
        const yr = new Date().getFullYear();
        for (const e of draft.experience) {
          this.experience.push(this.fb.group({
            company_name:              [e.company_name ?? ''],
            job_title:                 [e.job_title ?? ''],
            start_month:               [e.start_month ?? 1],
            start_year:                [e.start_year ?? null, [Validators.required, expYearValidator(1950, yr)]],
            end_month:                 [e.end_month ?? 1],
            end_year:                  [e.end_year ?? null, expYearValidator(1950, yr + 2)],
            description:               [e.description ?? ''],
            location:                  [e.location ?? ''],
            reason_for_leaving_select: [e.reason_for_leaving_select ?? ''],
            reason_for_leaving_other:  [e.reason_for_leaving_other ?? ''],
            currently_working:         [e.currently_working ?? false],
          }, { validators: expEndDateGroupValidator }));
        }
      }

      // Restore education
      if (Array.isArray(draft.education) && draft.education.length) {
        for (const ed of draft.education) {
          this.education.push(this.fb.group({
            institution:    [ed.institution ?? ''],
            degree:         [ed.degree ?? ''],
            field_of_study: [ed.field_of_study ?? ''],
            start_year:     [ed.start_year ?? null, eduYearValidator(1950, this.currentYear)],
            start_month:    [ed.start_month ?? 1],
            end_year:       [ed.end_year ?? null, eduYearValidator(1950, this.currentYear + 6)],
            end_month:      [ed.end_month ?? 1],
            location:       [ed.location ?? ''],
          }, { validators: eduEndYearGroupValidator }));
        }
      }

      this.draftRestored = true;
    } catch { /* corrupted draft */ }
  }

  dismissDraftBanner(): void { this.draftRestored = false; }

  private clearDraft(): void { localStorage.removeItem(this._draftKey); }

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
    const yr = new Date().getFullYear();
    this.experience.push(this.fb.group({
      company_name:              ['', Validators.required],
      job_title:                 ['', Validators.required],
      start_month:               [1  as number | null],
      start_year:                [null as number | null, [Validators.required, expYearValidator(1950, yr)]],
      end_month:                 [1  as number | null],
      end_year:                  [null as number | null, expYearValidator(1950, yr + 2)],
      description:               [''],
      location:                  ['', Validators.required],
      reason_for_leaving_select: [''],
      reason_for_leaving_other:  [''],
      currently_working:         [false],
    }, { validators: expEndDateGroupValidator }));
  }
  removeExperience(i: number): void { this.experience.removeAt(i); }

  addEducation(): void {
    this.education.push(this.fb.group({
      institution:    ['', Validators.required],
      degree:         ['', Validators.required],
      field_of_study: ['', Validators.required],
      start_year:     [null, eduYearValidator(1950, this.currentYear)],
      start_month:    [1],
      end_year:       [null, eduYearValidator(1950, this.currentYear + 6)],
      end_month:      [1],
      location:       ['', Validators.required],
    }, { validators: eduEndYearGroupValidator }));
  }

  toggleExperienceBased(checked: boolean): void {
    this.isExperienceBased = checked;
    if (checked) {
      // Clear education entries and certificates — not needed for experience-based profiles
      while (this.education.length) this.education.removeAt(0);
      this.pendingCerts = [];
    }
  }
  removeEducation(i: number): void { this.education.removeAt(i); }

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  dropExperience(event: CdkDragDrop<AbstractControl[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const fa = this.experience;
    const ctrl = fa.at(event.previousIndex);
    fa.removeAt(event.previousIndex);
    fa.insert(event.currentIndex, ctrl);
  }

  dropEducation(event: CdkDragDrop<AbstractControl[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const fa = this.education;
    const ctrl = fa.at(event.previousIndex);
    fa.removeAt(event.previousIndex);
    fa.insert(event.currentIndex, ctrl);
  }

  ctrl(name: string): AbstractControl { return this.form.get(name)!; }

  get hasFilledSkill(): boolean {
    return this.skills.controls.some(g => !!(g.get('skill_name')?.value?.trim()));
  }
  get hasFilledLanguage(): boolean {
    return this.languages.controls.some(g => !!(g.get('language')?.value?.trim()));
  }

  get filledSkillsCount(): number {
    return this.skills.controls.filter(g => g.get('skill_name')?.value?.trim()).length;
  }

  get filledExperienceCount(): number {
    return this.experience.controls.filter(g =>
      g.get('company_name')?.value?.trim() || g.get('job_title')?.value?.trim()
    ).length;
  }

  // ── Show/hide password toggle ───────────────────────────────────────────────
  showPassword = false;

  // ── Review & Submit summary ────────────────────────────────────────────────
  get reviewSummary() {
    const v = this.form.getRawValue();
    const firstName = (v.first_name ?? '').trim();
    const lastName  = (v.last_name  ?? '').trim();
    return {
      name:       [firstName, lastName].filter(Boolean).join(' ') || null,
      jobTitle:   (v.job_title  ?? '').trim()  || (v.occupation ?? '').trim() || null,
      industry:   (v.industry   ?? '').trim()  || null,
      country:    (v.current_country ?? '').trim() || null,
      city:       (v.current_city    ?? '').trim() || null,
      yearsExp:   v.years_experience ?? 0,
      skillCount:  this.filledSkillsCount,
      expCount:    this.filledExperienceCount,
      eduCount:    this.education.controls.filter(g => g.get('institution')?.value?.trim()).length,
      langCount:   this.languages.controls.filter(g => g.get('language')?.value?.trim()).length,
      skillNames:  this.skills.controls
                     .map(g => g.get('skill_name')?.value?.trim())
                     .filter(Boolean) as string[],
      langNames:   this.languages.controls
                     .map(g => g.get('language')?.value?.trim())
                     .filter(Boolean) as string[],
    };
  }

  // ── Step validation ────────────────────────────────────────────────────────
  private markStepTouched(step: number): void {
    const mark = (c: AbstractControl) => { c.markAsTouched(); c.updateValueAndValidity({ emitEvent: false }); };
    switch (step) {
      case 1:
        mark(this.ctrl('first_name'));
        mark(this.ctrl('last_name'));
        mark(this.ctrl('date_of_birth'));
        mark(this.ctrl('gender'));
        mark(this.ctrl('phone'));
        mark(this.ctrl('whatsapp_number'));
        this.form.updateValueAndValidity();
        break;
      case 2:
        mark(this.ctrl('employment_status'));
        mark(this.ctrl('job_title'));
        mark(this.ctrl('occupation'));
        mark(this.ctrl('industry'));
        mark(this.ctrl('linkedin_url'));
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
      case 4:
        mark(this.ctrl('current_country'));
        mark(this.ctrl('current_city'));
        if (this.ctrl('has_passport').value) mark(this.ctrl('nationality'));
        this.form.updateValueAndValidity();
        break;
      case 3:
        this.experience.controls.forEach(g => {
          ['company_name','job_title','start_year','location'].forEach(f => mark(g.get(f)!));
          g.updateValueAndValidity();
        });
        if (!this.isExperienceBased) {
          this.education.controls.forEach(g => {
            ['institution','degree','field_of_study','location','start_year','end_year'].forEach(f => mark(g.get(f)!));
            g.updateValueAndValidity();
          });
        }
        break;
    }
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return this.ctrl('first_name').valid
          && this.ctrl('last_name').valid
          && this.ctrl('date_of_birth').valid
          && this.ctrl('gender').valid
          && this.ctrl('phone').valid
          && this.ctrl('whatsapp_number').valid;
      case 2: {
        const coreOk = this.ctrl('employment_status').valid
          && this.ctrl('job_title').valid
          && this.ctrl('occupation').valid
          && this.ctrl('industry').valid
          && this.ctrl('linkedin_url').valid;
        const hasSkill = this.skills.controls.some(g => g.get('skill_name')?.value?.trim());
        const hasLang  = this.languages.controls.some(g => g.get('language')?.value?.trim());
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
        return coreOk && hasSkill && hasLang && skillsOk && langsOk;
      }
      case 5: return this.ctrl('email').valid && this.ctrl('password').valid;
      case 4:
        return this.ctrl('current_country').valid
          && this.ctrl('current_city').valid
          && (this.ctrl('has_passport').value ? this.ctrl('nationality').valid : true);
      case 3: {
        const yrsExp = Number(this.ctrl('years_experience').value) || 0;
        const expRows = this.experience.controls;
        if (yrsExp > 0 && expRows.length === 0) return false;
        const expOk = expRows.every(g => g.valid);
        const eduOk = this.isExperienceBased || this.education.controls.every(g => g.valid);
        return expOk && eduOk;
      }
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
    if (this.resumePreviewUrl) { URL.revokeObjectURL(this.resumePreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.resumePreviewUrl); }
    this.pendingResume = file;
    this.resumePreviewUrl = URL.createObjectURL(file);
    this._objectUrls.push(this.resumePreviewUrl);
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
  clearResume(): void {
    if (this.resumePreviewUrl) { URL.revokeObjectURL(this.resumePreviewUrl); this._objectUrls = this._objectUrls.filter(u => u !== this.resumePreviewUrl); }
    this.pendingResume = undefined;
    this.resumePreviewUrl = undefined;
  }
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';
    this.markStepTouched(5);
    if (!this.isStepValid(5)) return;

    const raw = this.form.getRawValue();
    const skills      = raw.skills.filter((s: any) => s.skill_name?.trim());
    const languages   = raw.languages.filter((l: any) => l.language?.trim());
    const experience  = raw.experience
      .filter((e: any) => e.company_name?.trim() || e.job_title?.trim())
      .map((e: any, idx: number) => {
        const {
          reason_for_leaving_select: sel,
          reason_for_leaving_other:  other,
          currently_working:         cw,
          start_month, start_year,
          end_month,   end_year,
          ...rest
        } = e;
        const toDateStr = (yr: number | null, mo: number | null): string | null =>
          (yr && mo) ? `${yr}-${String(mo).padStart(2, '0')}-01` : null;
        return {
          ...rest,
          start_date: toDateStr(start_year, start_month),
          end_date:   cw ? null : toDateStr(end_year, end_month),
          reason_for_leaving: sel === 'Other'
            ? (other?.trim() ? `Other: ${other.trim()}` : 'Other')
            : (sel || undefined),
          display_order: idx,
        };
      });
    const education   = raw.education
      .filter((e: any) => e.institution?.trim() || e.degree?.trim())
      .map((e: any, idx: number) => ({ ...e, display_order: idx }));

    const phone = raw.phone ? `${raw.dial_code || ''}${raw.phone}`.trim() : undefined;
    const whatsapp = raw.whatsapp_number ? `${raw.whatsapp_dial_code || ''}${raw.whatsapp_number}`.trim() : undefined;

    const payload = {
      email: raw.email, password: raw.password,
      first_name: raw.first_name, last_name: raw.last_name,
      date_of_birth:    raw.date_of_birth   || undefined,
      gender:           raw.gender          || undefined,
      marital_status:   raw.marital_status  || undefined,
      phone:            phone               || undefined,
      whatsapp_number:  whatsapp            || undefined,
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
      has_passport:     raw.has_passport    ?? false,
      target_locations: Array.isArray(raw.target_locations) ? raw.target_locations : [],
      hobbies: Array.isArray(raw.hobbies) ? raw.hobbies : [],
      registration_fee_status: raw.registration_fee_status || 'pending_payment',
      cv_format:               raw.cv_format               || 'not_yet_created',
      source:                  raw.source                  || 'Other',
      visa_status: raw.visa_status_select === 'other'
        ? (raw.visa_status_other?.trim() ? `Other: ${raw.visa_status_other.trim()}` : 'Other — specify')
        : (raw.visa_status_select || undefined),
      skills, languages, experience, education,
      is_experience_based: this.isExperienceBased,
    };

    this.loading = true;
    this.empSvc.create(payload as any).subscribe({
      next: async (res) => {
        const id = res.candidate.id;
        await this.uploadPendingFiles(id);
        this.clearDraft();
        this.form.markAsPristine();       // Clear dirty state so the route guard allows navigation
        this._submitSuccess = true;       // Prevent ngOnDestroy/beforeunload from re-saving draft
        this.draftSub?.unsubscribe();     // Stop auto-save during the redirect delay
        this.draftRestored = false;       // Dismiss the draft-restored banner if visible
        this.loading    = false;
        this.createdCandidateNumber = res.candidate.candidate_number ?? '';
        this.createdLoginId         = res.candidate.login_id ?? 0;
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

