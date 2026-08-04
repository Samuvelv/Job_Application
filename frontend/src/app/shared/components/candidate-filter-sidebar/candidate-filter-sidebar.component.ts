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
import { REGISTRATION_FEE_STATUS_OPTIONS, SOURCE_OPTIONS, PROFILE_STATUS_OPTIONS } from '../../../core/constants/candidate-options';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export type FilterApplyEvent = CandidateFilters;

// ── Option lists (mirrors candidate-register form) ────────────────────────────

const INDUSTRY_OPTIONS: ChipOption[] = [
  { value: 'Technology',         label: 'FILTER_OPTIONS.ind_technology'    },
  { value: 'Healthcare',         label: 'FILTER_OPTIONS.ind_healthcare'    },
  { value: 'Finance',            label: 'FILTER_OPTIONS.ind_finance'       },
  { value: 'Education',          label: 'FILTER_OPTIONS.ind_education'     },
  { value: 'Engineering',        label: 'FILTER_OPTIONS.ind_engineering'   },
  { value: 'Marketing',          label: 'FILTER_OPTIONS.ind_marketing'     },
  { value: 'Sales',              label: 'FILTER_OPTIONS.ind_sales'         },
  { value: 'Legal',              label: 'FILTER_OPTIONS.ind_legal'         },
  { value: 'Manufacturing',      label: 'FILTER_OPTIONS.ind_manufacturing' },
  { value: 'Retail',             label: 'FILTER_OPTIONS.ind_retail'        },
  { value: 'Media & Entertainment', label: 'FILTER_OPTIONS.ind_media'      },
  { value: 'Hospitality',        label: 'FILTER_OPTIONS.ind_hospitality'   },
  { value: 'Construction',       label: 'FILTER_OPTIONS.ind_construction'  },
  { value: 'Transportation',     label: 'FILTER_OPTIONS.ind_transportation'},
  { value: 'Agriculture',        label: 'FILTER_OPTIONS.ind_agriculture'   },
  { value: 'Government',         label: 'FILTER_OPTIONS.ind_government'    },
  { value: 'Non-Profit',         label: 'FILTER_OPTIONS.ind_nonprofit'     },
  { value: 'Other',              label: 'FILTER_OPTIONS.ind_other'         },
];

const EDUCATION_LEVEL_OPTIONS: ChipOption[] = [
  { value: 'Diploma',     label: 'FILTER_OPTIONS.edu_diploma'    },
  { value: 'Bachelors',   label: 'FILTER_OPTIONS.edu_bachelors'  },
  { value: 'Masters',     label: 'FILTER_OPTIONS.edu_masters'    },
  { value: 'PhD',         label: 'FILTER_OPTIONS.edu_phd'        },
  { value: 'Certificate', label: 'FILTER_OPTIONS.edu_certificate'},
  { value: 'High School', label: 'FILTER_OPTIONS.edu_highschool' },
];

const FIELD_OF_STUDY_OPTIONS: SelectOption[] = [
  { value: 'Engineering',           label: 'FILTER_OPTIONS.fos_engineering' },
  { value: 'Information Technology',label: 'FILTER_OPTIONS.fos_it'          },
  { value: 'Healthcare & Medicine', label: 'FILTER_OPTIONS.fos_healthcare'  },
  { value: 'Business & Management', label: 'FILTER_OPTIONS.fos_business'    },
  { value: 'Law',                   label: 'FILTER_OPTIONS.fos_law'         },
  { value: 'Science',               label: 'FILTER_OPTIONS.fos_science'     },
  { value: 'Arts & Humanities',     label: 'FILTER_OPTIONS.fos_arts'        },
  { value: 'Education',             label: 'FILTER_OPTIONS.fos_education'   },
  { value: 'Finance & Accounting',  label: 'FILTER_OPTIONS.fos_finance'     },
  { value: 'Social Sciences',       label: 'FILTER_OPTIONS.fos_social'      },
  { value: 'Other',                 label: 'FILTER_OPTIONS.fos_other'       },
];

const LANGUAGE_OPTIONS: ChipOption[] = [
  { value: 'English',    label: 'FILTER_OPTIONS.lang_english'    },
  { value: 'French',     label: 'FILTER_OPTIONS.lang_french'     },
  { value: 'Spanish',    label: 'FILTER_OPTIONS.lang_spanish'    },
  { value: 'Arabic',     label: 'FILTER_OPTIONS.lang_arabic'     },
  { value: 'Tamil',      label: 'FILTER_OPTIONS.lang_tamil'      },
  { value: 'Hindi',      label: 'FILTER_OPTIONS.lang_hindi'      },
  { value: 'Mandarin',   label: 'FILTER_OPTIONS.lang_mandarin'   },
  { value: 'German',     label: 'FILTER_OPTIONS.lang_german'     },
  { value: 'Portuguese', label: 'FILTER_OPTIONS.lang_portuguese' },
  { value: 'Japanese',   label: 'FILTER_OPTIONS.lang_japanese'   },
  { value: 'Italian',    label: 'FILTER_OPTIONS.lang_italian'    },
  { value: 'Russian',    label: 'FILTER_OPTIONS.lang_russian'    },
  { value: 'Korean',     label: 'FILTER_OPTIONS.lang_korean'     },
  { value: 'Turkish',    label: 'FILTER_OPTIONS.lang_turkish'    },
  { value: 'Malay',      label: 'FILTER_OPTIONS.lang_malay'      },
  { value: 'Bengali',    label: 'FILTER_OPTIONS.lang_bengali'    },
  { value: 'Other',      label: 'FILTER_OPTIONS.lang_other'      },
];

const GENDER_OPTIONS: SelectOption[] = [
  { value: 'male',              label: 'FILTER_OPTIONS.gen_male'       },
  { value: 'female',            label: 'FILTER_OPTIONS.gen_female'     },
  { value: 'non-binary',        label: 'FILTER_OPTIONS.gen_non_binary' },
  { value: 'prefer_not_to_say', label: 'FILTER_OPTIONS.gen_prefer_not' },
];

const VISA_OPTIONS: SelectOption[] = [
  { value: 'has_visa',          label: 'FILTER_OPTIONS.visa_has'     },
  { value: 'needs_sponsorship', label: 'FILTER_OPTIONS.visa_needs'   },
  { value: 'citizen',           label: 'FILTER_OPTIONS.visa_citizen' },
];

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: 'immediate', label: 'FILTER_OPTIONS.avail_immediate' },
  { value: '1_month',   label: 'FILTER_OPTIONS.avail_1month'    },
  { value: '3_months',  label: 'FILTER_OPTIONS.avail_3months'   },
];




@Component({
  selector: 'app-candidate-filter-sidebar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TagInputComponent, ChipMultiSelectComponent, SearchableSelectComponent, TranslateModule],
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
          {{ 'FILTER.title' | translate }}
          @if (activeCount > 0) {
            <span class="cfs-sidebar__count">{{ activeCount }}</span>
          }
        </div>
        <div class="d-flex align-items-center gap-2">
          @if (activeCount > 0) {
            <button type="button" class="cfs-sidebar__clear-all" (click)="clearAll()">
              {{ 'FILTER.clear_all' | translate }}
            </button>
          }
          <button type="button" class="cfs-sidebar__close" [attr.aria-label]="'COMMON.close' | translate" (click)="closeSidebar()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="apply()">

        <!-- 1. Industry — ChipMultiSelect -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.industry' | translate }}
            @if (form.get('industryList')?.value?.length) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-chip-multi-select
              formControlName="industryList"
              [options]="INDUSTRY_OPTIONS"
              [placeholder]="'FILTER.select_industries' | translate">
            </app-chip-multi-select>
          </div>
        </div>

        <!-- 2. Work Experience (range) -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.work_experience' | translate }}
            @if (form.get('yearsExpMin')?.value || form.get('yearsExpMax')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <div class="cfs-range-row">
              <input type="number" class="form-control form-control-sm" formControlName="yearsExpMin"
                [placeholder]="'FILTER.years_range_min' | translate" min="0" max="25">
              <span>–</span>
              <input type="number" class="form-control form-control-sm" formControlName="yearsExpMax"
                [placeholder]="'FILTER.years_range_max' | translate" min="0" max="25">
            </div>
            <div class="cfs-range-labels mt-1"><span>0 {{ 'FILTER.yrs' | translate }}</span><span>25 {{ 'FILTER.yrs' | translate }}</span></div>
          </div>
        </div>

        <!-- 3. Skills — TagInput -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.skills' | translate }}
            @if (form.get('skillTags')?.value?.length) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-tag-input formControlName="skillTags" [placeholder]="'FILTER.skills_hint' | translate">
            </app-tag-input>
            <div class="mt-1" style="font-size:.7rem;color:var(--th-text-secondary)">
              {{ 'FILTER.skills_hint' | translate }}
            </div>
          </div>
        </div>

        <!-- 4. Current Location -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.current_location' | translate }}
            @if (form.get('currentCountry')?.value || form.get('currentCity')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <label class="cfs-field-label">{{ 'FILTER.country' | translate }}</label>
            <input type="text" class="form-control form-control-sm mb-2"
              formControlName="currentCountry" [placeholder]="'FILTER.country_placeholder' | translate">
            <label class="cfs-field-label">{{ 'FILTER.city' | translate }}</label>
            <input type="text" class="form-control form-control-sm"
              formControlName="currentCity" [placeholder]="'FILTER.city_placeholder' | translate">
          </div>
        </div>

        <!-- 5. Nationality / Origin -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.nationality' | translate }}
            @if (form.get('nationality')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <input type="text" class="form-control form-control-sm"
              formControlName="nationality" [placeholder]="'FILTER.nationality_placeholder' | translate">
          </div>
        </div>

        <!-- 6. Target Country -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.target_country' | translate }}
            @if (form.get('targetCountry')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <input type="text" class="form-control form-control-sm"
              formControlName="targetCountry" [placeholder]="'FILTER.target_placeholder' | translate">
          </div>
        </div>

        <!-- 7. Education -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.education' | translate }}
            @if (form.get('educationLevelList')?.value?.length || form.get('fieldOfStudy')?.value || form.get('university')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <label class="cfs-field-label">{{ 'FILTER.edu_level' | translate }}</label>
            <app-chip-multi-select
              formControlName="educationLevelList"
              [options]="EDUCATION_LEVEL_OPTIONS"
              [placeholder]="'FILTER.select_levels' | translate"
              class="mb-2 d-block">
            </app-chip-multi-select>
            <label class="cfs-field-label">{{ 'FILTER.field_of_study' | translate }}</label>
            <app-searchable-select
              formControlName="fieldOfStudy"
              [options]="FIELD_OF_STUDY_OPTIONS"
              [placeholder]="'FILTER.select_field' | translate"
              class="mb-2 d-block">
            </app-searchable-select>
            <label class="cfs-field-label">{{ 'FILTER.university' | translate }}</label>
            <input type="text" class="form-control form-control-sm"
              formControlName="university" [placeholder]="'FILTER.university_placeholder' | translate">
          </div>
        </div>

        <!-- 8. Language — ChipMultiSelect -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.language' | translate }}
            @if (form.get('languageList')?.value?.length) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-chip-multi-select
              formControlName="languageList"
              [options]="LANGUAGE_OPTIONS"
              [placeholder]="'FILTER.select_languages' | translate">
            </app-chip-multi-select>
          </div>
        </div>

        <!-- 9. Age Range -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.age_range' | translate }}
            @if (form.get('ageMin')?.value || form.get('ageMax')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <div class="cfs-range-row">
              <input type="number" class="form-control form-control-sm"
                formControlName="ageMin" [placeholder]="'FILTER.years_range_min' | translate" min="18" max="70">
              <span>–</span>
              <input type="number" class="form-control form-control-sm"
                formControlName="ageMax" [placeholder]="'FILTER.years_range_max' | translate" min="18" max="70">
            </div>
            <div class="cfs-range-labels mt-1"><span>18</span><span>70</span></div>
          </div>
        </div>

        <!-- 11. Visa Status -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.visa_status' | translate }}
            @if (form.get('visaStatus')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-searchable-select
              formControlName="visaStatus"
              [options]="VISA_OPTIONS"
              [placeholder]="'FILTER.any_visa' | translate">
            </app-searchable-select>
          </div>
        </div>

        <!-- 12. Availability -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.availability' | translate }}
            @if (form.get('availability')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-searchable-select
              formControlName="availability"
              [options]="AVAILABILITY_OPTIONS"
              [placeholder]="'FILTER.any_availability' | translate">
            </app-searchable-select>
          </div>
        </div>

        <!-- 13. Gender -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.gender' | translate }}
            <span style="font-size:.7rem;font-weight:400;color:var(--th-text-secondary)"> {{ 'FILTER.optional' | translate }}</span>
            @if (form.get('gender')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <app-searchable-select
              formControlName="gender"
              [options]="GENDER_OPTIONS"
              [placeholder]="'FILTER.any_gender' | translate">
            </app-searchable-select>
          </div>
        </div>

        <!-- 14. Has Video — Toggle -->
        <div class="cfs-section">
          <div class="cfs-section__label">
            {{ 'FILTER.has_video' | translate }}
            @if (form.get('hasVideo')?.value) {
              <span class="cfs-section__active-dot"></span>
            }
          </div>
          <div class="cfs-section__body open">
            <div class="cfs-toggle-row">
              <span class="cfs-toggle-label">{{ 'FILTER.video_hint' | translate }}</span>
              <label class="cfs-toggle">
                <input type="checkbox" formControlName="hasVideo">
                <span class="cfs-toggle__track"></span>
              </label>
            </div>
            <div class="cfs-toggle-row mt-2">
              <span class="cfs-toggle-label">
                {{ 'FILTER.has_cv' | translate }}
                <span class="cfs-field-hint">{{ 'FILTER.cv_hint' | translate }}</span>
              </span>
              <label class="cfs-toggle">
                <input type="checkbox" formControlName="hasCV">
                <span class="cfs-toggle__track"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- 15 & 16. Admin-only status filters -->
        @if (showProfileStatus) {
          <div class="cfs-section">
            <div class="cfs-section__label">
              {{ 'FILTER.profile_status' | translate }}
              @if (form.get('profileStatus')?.value) {
                <span class="cfs-section__active-dot"></span>
              }
            </div>
            <div class="cfs-section__body open">
              <app-searchable-select
                formControlName="profileStatus"
                [options]="PROFILE_STATUS_OPTIONS"
                [placeholder]="'FILTER.all_statuses' | translate">
              </app-searchable-select>
            </div>
          </div>

          <div class="cfs-section">
            <div class="cfs-section__label">
              {{ 'FILTER.reg_fee' | translate }}
              @if (form.get('registrationFeeStatus')?.value) {
                <span class="cfs-section__active-dot"></span>
              }
            </div>
            <div class="cfs-section__body open">
              <app-searchable-select
                formControlName="registrationFeeStatus"
                [options]="REGISTRATION_FEE_STATUS_OPTIONS"
                [placeholder]="'FILTER.all_payment' | translate">
              </app-searchable-select>
            </div>
          </div>

          <div class="cfs-section">
            <div class="cfs-section__label">
              {{ 'FILTER.source' | translate }}
              @if (form.get('sourceList')?.value?.length) {
                <span class="cfs-section__active-dot"></span>
              }
            </div>
            <div class="cfs-section__body open">
              <app-chip-multi-select
                formControlName="sourceList"
                [options]="SOURCE_OPTIONS"
                [placeholder]="'FILTER.select_sources' | translate">
              </app-chip-multi-select>
            </div>
          </div>
        }

        <!-- Apply button (sticky footer) -->
        <div class="cfs-apply-footer">
          <button type="submit" class="filter-search-btn w-100">
            <i class="bi bi-search"></i> {{ 'FILTER.apply' | translate }}
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
  readonly PROFILE_STATUS_OPTIONS             = PROFILE_STATUS_OPTIONS;
  readonly REGISTRATION_FEE_STATUS_OPTIONS    = REGISTRATION_FEE_STATUS_OPTIONS;
  readonly SOURCE_OPTIONS                     = SOURCE_OPTIONS as ChipOption[];

  form!: FormGroup;
  sidebarOpen = signal(false);

  private lastAppliedSnapshot: any = null;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private translate: TranslateService) {}

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
      // Age
      ageMin:             [null],
      ageMax:             [null],
      // Flags (single searchable-select or toggle)
      gender:                  [null],
      visaStatus:              [null],
      availability:            [null],
      hasVideo:                [false],
      hasCV:                   [false],
      profileStatus:           [null],
      registrationFeeStatus:   [null],
      sourceList:              [[]],
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
    if (v.gender)                     n++;
    if (v.visaStatus)                 n++;
    if (v.availability)               n++;
    if (v.hasVideo)                   n++;
    if (v.hasCV)                      n++;
    if (v.sourceList?.length)         n++;
    if (v.profileStatus)              n++;
    if (v.registrationFeeStatus)      n++;
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
    if (v.gender)             f.gender         = v.gender;
    if (v.visaStatus)         f.visaStatus     = v.visaStatus;
    if (v.availability)       f.availability   = v.availability;
    if (v.hasVideo)                 f.hasVideo              = 'true';
    if (v.hasCV)                    f.hasCV                 = 'true';
    if (v.sourceList?.length)       f.source                = (v.sourceList as string[]).join(',');
    if (v.profileStatus)            f.profileStatus         = v.profileStatus;
    if (v.registrationFeeStatus)    f.registrationFeeStatus = v.registrationFeeStatus;

    this.lastAppliedSnapshot = this.form.value;
    this.filtersApplied.emit(f);
    if (window.innerWidth < 992) this.closeSidebar();
  }

  clearAll(): void {
    const empty = {
      industryList: [], educationLevelList: [], languageList: [], skillTags: [],
      yearsExpMin: null, yearsExpMax: null, occupation: '',
      currentCountry: '', currentCity: '', nationality: '', targetCountry: '',
      university: '', fieldOfStudy: null,
      ageMin: null, ageMax: null,
      gender: null, visaStatus: null, availability: null,
      hasVideo: false, hasCV: false, sourceList: [],
      profileStatus: null, registrationFeeStatus: null,
    };
    this.form.reset(empty);
    this.lastAppliedSnapshot = empty;
    this.filtersApplied.emit({});
  }

  @HostListener('window:keydown.escape')
  onEscape(): void { this.closeSidebar(); }
}
