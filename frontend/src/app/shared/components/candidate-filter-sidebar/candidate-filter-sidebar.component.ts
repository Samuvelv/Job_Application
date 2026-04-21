// src/app/shared/components/candidate-filter-sidebar/candidate-filter-sidebar.component.ts
import {
  Component, OnInit, OnDestroy, Output, EventEmitter, Input, signal, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { CandidateFilters } from '../../../core/models/candidate.model';
import { TagInputComponent } from '../tag-input/tag-input.component';
import { ChipMultiSelectComponent, ChipOption } from '../chip-multi-select/chip-multi-select.component';
import { SearchableSelectComponent, SelectOption } from '../searchable-select/searchable-select.component';

export type FilterApplyEvent = CandidateFilters;

// ── Option lists (mirrors candidate-register form) ────────────────────────────

const INDUSTRY_OPTIONS: ChipOption[] = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Engineering',
  'Marketing', 'Sales', 'Legal', 'Manufacturing', 'Retail',
  'Media & Entertainment', 'Hospitality', 'Construction', 'Transportation',
  'Agriculture', 'Government', 'Non-Profit', 'Other',
].map(v => ({ value: v, label: v }));

const EDUCATION_LEVEL_OPTIONS: ChipOption[] = [
  { value: 'Diploma',   label: 'Diploma' },
  { value: 'Bachelors', label: "Bachelor's" },
  { value: 'Masters',   label: "Master's" },
  { value: 'PhD',       label: 'PhD / Doctorate' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'High School', label: 'High School' },
];

const FIELD_OF_STUDY_OPTIONS: SelectOption[] = [
  'Engineering', 'Information Technology', 'Healthcare & Medicine',
  'Business & Management', 'Law', 'Science', 'Arts & Humanities',
  'Education', 'Finance & Accounting', 'Social Sciences', 'Other',
].map(v => ({ value: v, label: v }));

const LANGUAGE_OPTIONS: ChipOption[] = [
  'English', 'French', 'Spanish', 'Arabic', 'Tamil', 'Hindi',
  'Mandarin', 'German', 'Portuguese', 'Japanese', 'Italian',
  'Russian', 'Korean', 'Turkish', 'Malay', 'Bengali', 'Other',
].map(v => ({ value: v, label: v }));

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'male',              label: 'Male' },
  { value: 'female',            label: 'Female' },
  { value: 'non-binary',        label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const VISA_OPTIONS: SelectOption[] = [
  { value: 'has_visa',          label: 'Has Visa / Work Permit' },
  { value: 'needs_sponsorship', label: 'Needs Sponsorship' },
  { value: 'citizen',           label: 'Citizen / Permanent Resident' },
];

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: '1_month',   label: 'Within 1 Month' },
  { value: '3_months',  label: 'Within 3 Months' },
];

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'GBP', label: 'GBP – British Pound' },
  { value: 'EUR', label: 'EUR – Euro' },
  { value: 'AUD', label: 'AUD – Australian Dollar' },
  { value: 'INR', label: 'INR – Indian Rupee' },
  { value: 'CAD', label: 'CAD – Canadian Dollar' },
  { value: 'SGD', label: 'SGD – Singapore Dollar' },
];

const PROFILE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active',       label: 'Active' },
  { value: 'pending_edit', label: 'Pending Edit' },
  { value: 'inactive',     label: 'Inactive' },
];

@Component({
  selector: 'app-candidate-filter-sidebar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TagInputComponent, ChipMultiSelectComponent, SearchableSelectComponent],
  template: `
    <!-- ── Backdrop ──────────────────────────────────────────────────────────── -->
    <div class="cfs-backdrop" [class.cfs-backdrop--visible]="sidebarOpen()"></div>

    <!-- ── Right-side off-canvas panel ───────────────────────────────────────── -->
    <aside class="cfs-sidebar"
      [class.cfs-sidebar--open]="sidebarOpen()">

      <!-- Header -->
      <div class="cfs-sidebar__header">
        <div class="cfs-sidebar__title">
          <i class="bi bi-sliders2"></i>
          Advanced Filters
          @if (activeCount > 0) {
            <span class="cfs-sidebar__count">{{ activeCount }}</span>
          }
        </div>
        <div class="d-flex align-items-center gap-2">
          @if (activeCount > 0) {
            <button type="button" class="cfs-sidebar__clear-all" (click)="clearAll()">
              Clear all
            </button>
          }
          <button type="button" class="cfs-sidebar__close" aria-label="Close" (click)="closeSidebar()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="apply()">

        <!-- 1. Industry — ChipMultiSelect -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Industry
            @if (form.get('industryList')?.value?.length) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-chip-multi-select
              formControlName="industryList"
              [options]="INDUSTRY_OPTIONS"
              placeholder="Select industries…">
            </app-chip-multi-select>
          </div>
        </div>

        <!-- 2. Work Experience (range) -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Work Experience (Years)
            @if (form.get('yearsExpMin')?.value || form.get('yearsExpMax')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <div class="cfs-range-row">
              <input type="number" class="form-control form-control-sm" formControlName="yearsExpMin"
                placeholder="Min" min="0" max="50">
              <span>–</span>
              <input type="number" class="form-control form-control-sm" formControlName="yearsExpMax"
                placeholder="Max" min="0" max="50">
            </div>
            <div class="cfs-range-labels mt-1"><span>0 yrs</span><span>50 yrs</span></div>
          </div>
        </div>

        <!-- 3. Skills — TagInput -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Skills
            @if (form.get('skillTags')?.value?.length) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-tag-input formControlName="skillTags" placeholder="Type skill, press Enter…">
            </app-tag-input>
            <div class="mt-1" style="font-size:.7rem;color:var(--th-text-secondary)">
              Press Enter or comma to add
            </div>
          </div>
        </div>

        <!-- 4. Current Location -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Current Location
            @if (form.get('currentCountry')?.value || form.get('currentCity')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <label class="cfs-field-label">Country</label>
            <input type="text" class="form-control form-control-sm mb-2"
              formControlName="currentCountry" placeholder="e.g. Australia">
            <label class="cfs-field-label">City</label>
            <input type="text" class="form-control form-control-sm"
              formControlName="currentCity" placeholder="e.g. Sydney">
          </div>
        </div>

        <!-- 5. Nationality / Origin -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Nationality / Origin
            @if (form.get('nationality')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <input type="text" class="form-control form-control-sm"
              formControlName="nationality" placeholder="e.g. Indian, British">
          </div>
        </div>

        <!-- 6. Target Country -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Target Country (Work Location)
            @if (form.get('targetCountry')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <input type="text" class="form-control form-control-sm"
              formControlName="targetCountry" placeholder="Where they want to work">
          </div>
        </div>

        <!-- 7. Education -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Education
            @if (form.get('educationLevelList')?.value?.length || form.get('fieldOfStudy')?.value || form.get('university')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <label class="cfs-field-label">Education Level</label>
            <app-chip-multi-select
              formControlName="educationLevelList"
              [options]="EDUCATION_LEVEL_OPTIONS"
              placeholder="Select levels…"
              class="mb-2 d-block">
            </app-chip-multi-select>
            <label class="cfs-field-label">Field of Study</label>
            <app-searchable-select
              formControlName="fieldOfStudy"
              [options]="FIELD_OF_STUDY_OPTIONS"
              placeholder="Select field…"
              class="mb-2 d-block">
            </app-searchable-select>
            <label class="cfs-field-label">University / College</label>
            <input type="text" class="form-control form-control-sm"
              formControlName="university" placeholder="Search institution…">
          </div>
        </div>

        <!-- 8. Language — ChipMultiSelect -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Language
            @if (form.get('languageList')?.value?.length) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-chip-multi-select
              formControlName="languageList"
              [options]="LANGUAGE_OPTIONS"
              placeholder="Select languages…">
            </app-chip-multi-select>
          </div>
        </div>

        <!-- 9. Age Range -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Age Range
            @if (form.get('ageMin')?.value || form.get('ageMax')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <div class="cfs-range-row">
              <input type="number" class="form-control form-control-sm"
                formControlName="ageMin" placeholder="Min" min="18" max="70">
              <span>–</span>
              <input type="number" class="form-control form-control-sm"
                formControlName="ageMax" placeholder="Max" min="18" max="70">
            </div>
            <div class="cfs-range-labels mt-1"><span>18</span><span>70</span></div>
          </div>
        </div>

        <!-- 10. Salary Expectation -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Salary Expectation
            @if (form.get('salaryMin')?.value || form.get('salaryMax')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <label class="cfs-field-label">Currency</label>
            <app-searchable-select
              formControlName="salaryCurrency"
              [options]="CURRENCY_OPTIONS"
              placeholder="Any currency"
              class="mb-2 d-block">
            </app-searchable-select>
            <label class="cfs-field-label">Range</label>
            <div class="cfs-range-row">
              <input type="number" class="form-control form-control-sm"
                formControlName="salaryMin" placeholder="Min" min="0">
              <span>–</span>
              <input type="number" class="form-control form-control-sm"
                formControlName="salaryMax" placeholder="Max" min="0">
            </div>
          </div>
        </div>

        <!-- 11. Visa Status -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Visa Status
            @if (form.get('visaStatus')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-searchable-select
              formControlName="visaStatus"
              [options]="VISA_OPTIONS"
              placeholder="Any visa status">
            </app-searchable-select>
          </div>
        </div>

        <!-- 12. Availability -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Availability
            @if (form.get('availability')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-searchable-select
              formControlName="availability"
              [options]="AVAILABILITY_OPTIONS"
              placeholder="Any availability">
            </app-searchable-select>
          </div>
        </div>

        <!-- 13. Gender -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Gender
            <span style="font-size:.7rem;font-weight:400;color:var(--th-text-secondary)"> (optional)</span>
            @if (form.get('gender')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-searchable-select
              formControlName="gender"
              [options]="GENDER_OPTIONS"
              placeholder="Any gender">
            </app-searchable-select>
          </div>
        </div>

        <!-- 14. Has Video — Toggle -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            Has Introduction Video
            @if (form.get('hasVideo')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <div class="cfs-toggle-row">
              <span class="cfs-toggle-label">Only show profiles with video</span>
              <label class="cfs-toggle">
                <input type="checkbox" formControlName="hasVideo">
                <span class="cfs-toggle__track"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 15. Profile Status (admin only) -->
        @if (showProfileStatus) {
          <div class="cfs-section">
            <div class="cfs-section__label">
              Profile Status
              @if (form.get('profileStatus')?.value) {
                <span class="cfs-section__active-dot"></span>
              }
            </div>
            <div class="cfs-section__body open">
              <app-searchable-select
                formControlName="profileStatus"
                [options]="PROFILE_STATUS_OPTIONS"
                placeholder="All statuses">
              </app-searchable-select>
            </div>
          </div>
        }

        <!-- Apply button (sticky footer) -->
        <div class="cfs-apply-footer">
          <button type="submit" class="filter-search-btn w-100">
            <i class="bi bi-search"></i> Apply Filters
          </button>
        </div>

      </form>
    </aside>
  `,
})
export class CandidateFilterSidebarComponent implements OnInit, OnDestroy {
  @Input() showProfileStatus = false;
  @Output() filtersApplied = new EventEmitter<FilterApplyEvent>();
  @Output() sidebarToggled = new EventEmitter<boolean>();

  readonly INDUSTRY_OPTIONS         = INDUSTRY_OPTIONS;
  readonly EDUCATION_LEVEL_OPTIONS  = EDUCATION_LEVEL_OPTIONS;
  readonly FIELD_OF_STUDY_OPTIONS   = FIELD_OF_STUDY_OPTIONS;
  readonly LANGUAGE_OPTIONS         = LANGUAGE_OPTIONS;
  readonly GENDER_OPTIONS           = GENDER_OPTIONS;
  readonly VISA_OPTIONS             = VISA_OPTIONS;
  readonly AVAILABILITY_OPTIONS     = AVAILABILITY_OPTIONS;
  readonly CURRENCY_OPTIONS         = CURRENCY_OPTIONS;
  readonly PROFILE_STATUS_OPTIONS   = PROFILE_STATUS_OPTIONS;

  form!: FormGroup;
  sidebarOpen = signal(false);

  private lastAppliedSnapshot: any = null;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // Multi-select arrays
      industryList:       [[]],
      educationLevelList: [[]],
      languageList:       [[]],
      // Tags
      skillTags:          [[]],
      // Professional
      yearsExpMin:        [null],
      yearsExpMax:        [null],
      occupation:         [''],
      // Location
      currentCountry:     [''],
      currentCity:        [''],
      nationality:        [''],
      targetCountry:      [''],
      // Education
      university:         [''],
      fieldOfStudy:       [null],
      // Salary
      salaryCurrency:     [null],
      salaryMin:          [null],
      salaryMax:          [null],
      // Age
      ageMin:             [null],
      ageMax:             [null],
      // Flags (single searchable-select or toggle)
      gender:             [null],
      visaStatus:         [null],
      availability:       [null],
      hasVideo:           [false],
      profileStatus:      [null],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openSidebar(): void {
    this.lastAppliedSnapshot = this.form.value;
    this.sidebarOpen.set(true);
    this.sidebarToggled.emit(true);
  }

  closeSidebar(): void {
    if (this.lastAppliedSnapshot !== null) {
      this.form.reset(this.lastAppliedSnapshot);
    }
    this.sidebarOpen.set(false);
    this.sidebarToggled.emit(false);
  }

  get activeCount(): number {
    const v = this.form.value;
    let n = 0;
    if (v.industryList?.length)       n++;
    if (v.educationLevelList?.length) n++;
    if (v.languageList?.length)       n++;
    if (v.skillTags?.length)          n++;
    if (v.yearsExpMin || v.yearsExpMax) n++;
    if (v.currentCountry)             n++;
    if (v.currentCity)                n++;
    if (v.nationality)                n++;
    if (v.targetCountry)              n++;
    if (v.university)                 n++;
    if (v.fieldOfStudy)               n++;
    if (v.ageMin || v.ageMax)         n++;
    if (v.salaryCurrency || v.salaryMin || v.salaryMax) n++;
    if (v.gender)                     n++;
    if (v.visaStatus)                 n++;
    if (v.availability)               n++;
    if (v.hasVideo)                   n++;
    if (v.profileStatus)              n++;
    return n;
  }

  apply(): void {
    const v = this.form.value;
    const f: CandidateFilters = {};

    if (v.industryList?.length)       f.industry       = (v.industryList as string[]).join(',');
    if (v.educationLevelList?.length) f.educationLevel = (v.educationLevelList as string[]).join(',');
    if (v.languageList?.length)       f.languages      = (v.languageList as string[]).join(',');
    if (v.skillTags?.length)          f.skills         = (v.skillTags as string[]).join(',');
    if (v.yearsExpMin != null && v.yearsExpMin !== '') f.yearsExpMin = +v.yearsExpMin;
    if (v.yearsExpMax != null && v.yearsExpMax !== '') f.yearsExpMax = +v.yearsExpMax;
    if (v.occupation)         f.occupation     = v.occupation;
    if (v.currentCountry)     f.currentCountry = v.currentCountry;
    if (v.currentCity)        f.currentCity    = v.currentCity;
    if (v.nationality)        f.nationality    = v.nationality;
    if (v.targetCountry)      f.targetCountry  = v.targetCountry;
    if (v.university)         f.university     = v.university;
    if (v.fieldOfStudy)       f.fieldOfStudy   = v.fieldOfStudy;
    if (v.ageMin != null && v.ageMin !== '')    f.ageMin    = +v.ageMin;
    if (v.ageMax != null && v.ageMax !== '')    f.ageMax    = +v.ageMax;
    if (v.salaryCurrency)     f.salaryCurrency = v.salaryCurrency;
    if (v.salaryMin != null && v.salaryMin !== '') f.salaryMin = +v.salaryMin;
    if (v.salaryMax != null && v.salaryMax !== '') f.salaryMax = +v.salaryMax;
    if (v.gender)             f.gender         = v.gender;
    if (v.visaStatus)         f.visaStatus     = v.visaStatus;
    if (v.availability)       f.availability   = v.availability;
    if (v.hasVideo)           f.hasVideo       = 'true';
    if (v.profileStatus)      f.profileStatus  = v.profileStatus;

    this.lastAppliedSnapshot = this.form.value;
    this.filtersApplied.emit(f);
    if (window.innerWidth < 992) this.closeSidebar();
  }

  clearAll(): void {
    const empty = {
      industryList: [], educationLevelList: [], languageList: [], skillTags: [],
      yearsExpMin: null, yearsExpMax: null, occupation: '',
      currentCountry: '', currentCity: '', nationality: '', targetCountry: '',
      university: '', fieldOfStudy: null, salaryCurrency: null,
      salaryMin: null, salaryMax: null, ageMin: null, ageMax: null,
      gender: null, visaStatus: null, availability: null,
      hasVideo: false, profileStatus: null,
    };
    this.form.reset(empty);
    this.lastAppliedSnapshot = empty;
    this.filtersApplied.emit({});
  }

  @HostListener('window:keydown.escape')
  onEscape(): void { this.closeSidebar(); }
}
