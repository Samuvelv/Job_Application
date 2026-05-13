// src/app/features/admin/volunteers/volunteer-create.component.ts
import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription, merge } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { VolunteerService } from '../../../core/services/volunteer.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { ChipMultiSelectComponent, ChipOption } from '../../../shared/components/chip-multi-select/chip-multi-select.component';
import { CandidateService } from '../../../core/services/candidate.service';

// ── Phone rules (same as candidate-register) ──────────────────────────────
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

function makePhoneGroupValidator(dialCtrl: string, numCtrl: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const dial = (group.get(dialCtrl)?.value as string) || '';
    const num  = ((group.get(numCtrl)?.value as string) || '').replace(/\s+/g, '');
    const numControl = group.get(numCtrl);
    if (!numControl) return null;

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

    const cur = numControl.errors;
    if (cur?.['phoneInvalid']) {
      const { phoneInvalid: _, ...rest } = cur;
      numControl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}

@Component({
  selector: 'app-volunteer-create',
  standalone: true,
  templateUrl: './volunteer-create.component.html',
  styleUrl: './volunteer-create.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SearchableSelectComponent,
    ChipMultiSelectComponent,
  ],
})
export class VolunteerCreateComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  submitting = false;
  error = '';

  editId: string | null = null;

  photoFile: File | null = null;
  photoPreview = signal<string | null>(null);
  photoError = '';

  private _subs: Subscription[] = [];
  private _objectUrls: string[] = [];

  // ── Computed options ────────────────────────────────────────────────────
  readonly dialCodeOptions = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({
      value: c.dial_code,
      label: `${c.flag_emoji} ${c.dial_code}`,
      sublabel: c.name,
    }))
  );

  readonly countryOpts = computed<SelectOption[]>(() =>
    this.master.countries().map(c => ({ value: c.name, label: `${c.flag_emoji} ${c.name}` }))
  );

  readonly industryOpts = computed<SelectOption[]>(() =>
    this.master.industries().map(i => ({ value: i.name, label: i.name }))
  );

  readonly languageOptions = computed<ChipOption[]>(() =>
    this.master.languages().map(l => ({ value: l.name, label: l.name }))
  );

  readonly supportMethodOpts: SelectOption[] = [
    { value: 'WhatsApp Support',        label: 'WhatsApp Support' },
    { value: 'Phone Call Support',      label: 'Phone Call Support' },
    { value: 'Platform Messaging Only', label: 'Platform Messaging Only' },
  ];

  readonly contactPrefOpts: SelectOption[] = [
    { value: 'WhatsApp',      label: 'WhatsApp' },
    { value: 'Email',         label: 'Email' },
    { value: 'Platform Only', label: 'Platform Only' },
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

  constructor(
    private fb: FormBuilder,
    private volunteerSvc: VolunteerService,
    private master: MasterDataService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private candidateSvc: CandidateService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.master.loadAll();
    this.form = this.buildForm();
    this.wireWhatsAppSync();

    this.editId = this.route.snapshot.queryParamMap.get('edit');

    // Pre-fill from a candidate when navigating from the placed-candidate prompt
    const fromCandidateId = this.route.snapshot.queryParamMap.get('fromCandidate');
    if (fromCandidateId) {
      this.candidateSvc.getById(fromCandidateId).subscribe({
        next: ({ candidate: c }) => {
          const langNames = (c.languages ?? [])
            .map((l: any) => (typeof l === 'string' ? l : (l.language ?? '')))
            .filter(Boolean);

          const placedReferral = (c.referrals ?? []).find((r: any) => r.status === 'placed');
          const countryPlaced  = placedReferral?.country ?? c.current_country ?? null;

          const { dialCode: pDial, number: pNum } = this.splitPhone(c.phone ?? '');
          const { dialCode: wDial, number: wNum }  = this.splitPhone(c.whatsapp_number ?? '');

          this.form.patchValue({
            name:               [c.first_name, c.last_name].filter(Boolean).join(' '),
            email:              c.email         ?? '',
            dial_code:          pDial,
            phone:              pNum,
            whatsapp_dial_code: wDial,
            whatsapp_number:    wNum,
            nationality:        c.nationality   ?? null,
            country_placed:     countryPlaced,
            role:               c.job_title     ?? '',
            sector:             c.industry      ?? null,
            languages:          langNames.length ? langNames : [],
          });
        },
        error: () => this.toast.error('Could not pre-fill candidate details'),
      });
    }

    if (this.editId) {
      this.volunteerSvc.getById(this.editId).subscribe({
        next: ({ volunteer: v }) => {
          const { dialCode: pDial, number: pNum } = this.splitPhone(v.phone ?? '');
          const { dialCode: wDial, number: wNum }  = this.splitPhone(v.whatsapp_number ?? '');

          this.form.patchValue({
            name:               v.name,
            email:              v.email              ?? '',
            dial_code:          pDial,
            phone:              pNum,
            whatsapp_dial_code: wDial,
            whatsapp_number:    wNum,
            nationality:        v.nationality        ?? null,
            country_placed:     v.country_placed     ?? null,
            role:               v.role               ?? '',
            sector:             v.sector             ?? null,
            company_joined:     v.company_joined     ?? '',
            year_placed:        v.year_placed        ? String(v.year_placed) : null,
            languages:          v.languages          ?? [],
            success_story:      v.success_story      ?? '',
            support_method:     v.support_method     ?? '',
            contact_preference: v.contact_preference ?? '',
            availability:       v.availability       ?? '',
            notes:              v.notes              ?? '',
            consent:            v.consent            ?? false,
          });

          if (v.photo_url) this.photoPreview.set(v.photo_url);
        },
        error: () => this.toast.error('Failed to load volunteer for editing'),
      });
    }
  }

  ngOnDestroy(): void {
    this._subs.forEach(s => s.unsubscribe());
    this._objectUrls.forEach(u => URL.revokeObjectURL(u));
  }

  private buildForm(): FormGroup {
    return this.fb.group(
      {
        name:               ['', Validators.required],
        email:              ['', Validators.email],
        dial_code:          ['+1'],
        phone:              [''],
        whatsapp_same_as_phone: [false],
        whatsapp_dial_code: ['+1'],
        whatsapp_number:    [''],
        nationality:        [null, Validators.required],
        country_placed:     [null, Validators.required],
        role:               ['', Validators.required],
        sector:             [null],
        company_joined:     [''],
        year_placed:        [null, Validators.required],
        languages:          [[]],
        success_story:      [''],
        support_method:     ['', Validators.required],
        contact_preference: ['', Validators.required],
        availability:       ['', Validators.required],
        notes:              [''],
        consent:            [false, Validators.requiredTrue],
      },
      {
        validators: [
          makePhoneGroupValidator('dial_code', 'phone'),
          makePhoneGroupValidator('whatsapp_dial_code', 'whatsapp_number'),
        ],
      }
    );
  }

  private wireWhatsAppSync(): void {
    // Toggle: enable/disable WhatsApp fields based on checkbox
    const sub1 = this.form.get('whatsapp_same_as_phone')!.valueChanges
      .subscribe((checked: boolean) => {
        if (checked) {
          this.syncWhatsApp();
          this.form.get('whatsapp_dial_code')!.disable({ emitEvent: false });
          this.form.get('whatsapp_number')!.disable({ emitEvent: false });
        } else {
          this.form.get('whatsapp_dial_code')!.enable({ emitEvent: false });
          this.form.get('whatsapp_number')!.enable({ emitEvent: false });
        }
      });

    // Live update when phone/dial_code changes while checkbox is on
    const sub2 = merge(
      this.form.get('dial_code')!.valueChanges,
      this.form.get('phone')!.valueChanges,
    ).subscribe(() => {
      if (this.form.get('whatsapp_same_as_phone')?.value) this.syncWhatsApp();
    });

    this._subs.push(sub1, sub2);
  }

  private syncWhatsApp(): void {
    const raw = this.form.getRawValue();
    this.form.get('whatsapp_dial_code')!.setValue(raw.dial_code, { emitEvent: false });
    this.form.get('whatsapp_number')!.setValue(raw.phone,        { emitEvent: false });
  }

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

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  // ── Photo ────────────────────────────────────────────────────────────────
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.photoError = '';
    if (file.size > 5 * 1024 * 1024) {
      this.photoError = 'Image is too large. Maximum size is 5 MB.';
      input.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.photoError = 'Only JPEG, PNG, or WebP images are allowed.';
      input.value = '';
      return;
    }

    this.photoFile = file;
    const url = URL.createObjectURL(file);
    if (this.photoPreview()) {
      const prev = this._objectUrls.indexOf(this.photoPreview()!);
      if (prev !== -1) { URL.revokeObjectURL(this.photoPreview()!); this._objectUrls.splice(prev, 1); }
    }
    this._objectUrls.push(url);
    this.photoPreview.set(url);
    input.value = '';
  }

  clearPhoto(): void {
    if (this.photoPreview()) {
      const idx = this._objectUrls.indexOf(this.photoPreview()!);
      if (idx !== -1) { URL.revokeObjectURL(this.photoPreview()!); this._objectUrls.splice(idx, 1); }
    }
    this.photoFile = null;
    this.photoPreview.set(null);
    this.photoError = '';
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting = true;
    this.error = '';

    const raw = this.form.getRawValue();
    const phone    = raw.phone    ? `${raw.dial_code || ''}${raw.phone}`.trim()             : undefined;
    const whatsapp = raw.whatsapp_number
      ? `${raw.whatsapp_dial_code || ''}${raw.whatsapp_number}`.trim()
      : undefined;

    const payload = {
      name:               raw.name.trim(),
      email:              raw.email?.trim()          || undefined,
      phone:              phone                      || undefined,
      whatsapp_number:    whatsapp                   || undefined,
      nationality:        raw.nationality            || undefined,
      country_placed:     raw.country_placed         || undefined,
      role:               raw.role?.trim()           || undefined,
      sector:             raw.sector                 || undefined,
      company_joined:     raw.company_joined?.trim() || undefined,
      year_placed:        raw.year_placed            ? Number(raw.year_placed) : undefined,
      languages:          raw.languages?.length      ? raw.languages : undefined,
      success_story:      raw.success_story?.trim()  || undefined,
      support_method:     raw.support_method         || undefined,
      contact_preference: raw.contact_preference     || undefined,
      availability:       raw.availability           || undefined,
      notes:              raw.notes?.trim()          || undefined,
      consent:            raw.consent,
    };

    if (this.editId) {
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
          this.router.navigate(['/admin/volunteers', id]);
        },
        error: (err) => {
          this.submitting = false;
          this.error = err?.error?.message ?? 'Failed to update volunteer.';
        },
      });

    } else {
      this.volunteerSvc.create(payload).pipe(
        switchMap((res) => {
          if (this.photoFile) {
            return this.volunteerSvc.uploadPhoto(res.volunteer.id, this.photoFile!);
          }
          return [res];
        }),
      ).subscribe({
        next: () => {
          this.submitting = false;
          this.toast.success('Volunteer added successfully');
          this.router.navigate(['/admin/volunteers']);
        },
        error: (err) => {
          this.submitting = false;
          this.error = err?.error?.message ?? 'Failed to save volunteer.';
        },
      });
    }
  }

  get cancelRoute(): string {
    return this.editId ? `/admin/volunteers/${this.editId}` : '/admin/volunteers';
  }
}
