// src/app/shared/components/candidate-profile/candidate-profile.component.ts
import { Component, Input, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocaleDatePipe } from '../../../core/pipes/locale-date.pipe';
import { Candidate } from '../../../core/models/candidate.model';
import { CandidateService, CandidateActivity } from '../../../core/services/candidate.service';
import { BulkTranslationService } from '../../../core/services/bulk-translation.service';
import { LanguageService } from '../../../core/services/language.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type Tab = 'overview' | 'experience' | 'education' | 'documents' | 'activity';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [LocaleDatePipe, CommonModule, TranslateModule],
  template: `
    @if (!candidate) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">{{ 'COMMON.loading_profile' | translate }}</div>
      </div>
    } @else {

      <!-- ══ Profile Hero V2 ══════════════════════════════════════════════ -->
      <div class="profile-hero-v2">
        <div class="profile-hero-v2__cover"></div>
        <div class="profile-hero-v2__body">

          <!-- Avatar -->
          <div class="profile-hero-v2__avatar-wrap">
            @if (candidate.profile_photo_url) {
              <img [src]="candidate.profile_photo_url" alt="Profile photo"
                class="profile-hero-v2__avatar">
            } @else {
              <div class="profile-hero-v2__avatar-placeholder">
                {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
              </div>
            }
            @if (candidate.profile_status === 'active') {
              <div class="profile-hero-v2__online-dot" [title]="'COMMON.active' | translate"></div>
            }
          </div>

          <!-- Name + meta -->
          <div class="profile-hero-v2__info flex-grow-1">
            <div class="profile-hero-v2__name-row">
              <h2 class="profile-hero-v2__name mb-0">
                {{ candidate.first_name }} {{ candidate.last_name }}
              </h2>
              @if (candidate.candidate_number) {
                <span class="autocode-badge autocode-badge--lg">{{ candidate.candidate_number }}</span>
              }
              @if (candidate.login_id) {
                <span class="autocode-badge autocode-badge--login-id" [title]="'CANDIDATE_PROFILE.login_id_tooltip' | translate">
                  <i class="bi bi-key-fill" style="font-size:.75rem;margin-right:.25rem"></i>{{ candidate.login_id }}
                </span>
              }
              <span class="badge rounded-pill px-3 py-2"
                [class.badge-status-active]="candidate.profile_status === 'active'"
                [class.badge-status-pending]="candidate.profile_status === 'pending_edit'"
                [class.badge-status-inactive]="candidate.profile_status === 'inactive'">
                {{ candidate.profile_status | titlecase }}
              </span>
            </div>

            <div class="profile-hero-v2__headline">
              @if (candidate.job_title) {
                @if (isTranslatingProfessional()) {
                  <span style="opacity:.6">{{ 'COMMON.translating' | translate }}…</span>
                } @else {
                  <span>{{ translatedProfessional()['job_title'] || candidate.job_title }}</span>
                }
              }
              @if (candidate.job_title && candidate.industry) { <span class="sep">·</span> }
              @if (candidate.industry) {
                @if (isTranslatingProfessional()) {
                  <span style="opacity:.6">{{ 'COMMON.translating' | translate }}…</span>
                } @else {
                  <span>{{ translatedProfessional()['industry'] || candidate.industry }}</span>
                }
              }
              @if ((candidate.job_title || candidate.industry) && candidate.years_experience != null) {
                <span class="sep">·</span>
              }
              @if (candidate.years_experience != null) {
                <span>{{ candidate.years_experience }} {{ 'CANDIDATE_PROFILE.years_exp_suffix' | translate }}</span>
              }
            </div>

            <div class="profile-hero-v2__meta">
              @if (candidate.current_city || candidate.current_country) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-geo-alt-fill"></i>
                  {{ translatedProfile()['city'] || candidate.current_city }}{{ candidate.current_city && candidate.current_country ? ', ' : '' }}{{ translatedProfile()['country'] || candidate.current_country }}
                </span>
              }
              <!-- Email chip -->
              @if (contactLocked) {
                <span class="profile-hero-v2__meta-chip contact-locked-chip">
                  <i class="bi bi-lock-fill"></i>{{ 'CANDIDATE_PROFILE.email_hidden' | translate }}
                </span>
              } @else if (candidate.email) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-envelope-fill"></i>{{ candidate.email }}
                </span>
              }
              <!-- Phone chip -->
              @if (contactLocked) {
                <span class="profile-hero-v2__meta-chip contact-locked-chip">
                  <i class="bi bi-lock-fill"></i>{{ 'CANDIDATE_PROFILE.phone_hidden' | translate }}
                </span>
              } @else if (candidate.phone) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-telephone-fill"></i>{{ candidate.phone }}
                </span>
              }
              @if (!contactLocked && candidate.whatsapp_number) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-whatsapp text-success"></i>{{ candidate.whatsapp_number }}
                </span>
              }
              @if (candidate.nationality) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-flag-fill"></i>{{ translatedProfile()['nationality'] || candidate.nationality }}
                </span>
              }
            </div>
          </div>

          <!-- Action buttons -->
          <div class="profile-hero-v2__actions">
            @if (contactLocked) {
              <span class="profile-hero-v2__action-btn contact-locked-btn">
                <i class="bi bi-lock-fill"></i>{{ 'CANDIDATE_PROFILE.cv_hidden' | translate }}
              </span>
            } @else if (candidate.resume_url) {
              <a [href]="candidate.resume_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--cv">
                <i class="bi bi-file-earmark-person-fill"></i>{{ 'CANDIDATE_PROFILE.download_cv' | translate }}
              </a>
            }
            @if (candidate.intro_video_url) {
              <a [href]="candidate.intro_video_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--video">
                <i class="bi bi-camera-video-fill"></i>{{ 'CANDIDATE_PROFILE.intro_video' | translate }}
              </a>
            }
            <!-- LinkedIn -->
            @if (contactLocked) {
              <span class="profile-hero-v2__action-btn contact-locked-btn">
                <i class="bi bi-lock-fill"></i>{{ 'CANDIDATE_PROFILE.linkedin_hidden' | translate }}
              </span>
            } @else if (candidate.linkedin_url) {
              <a [href]="candidate.linkedin_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--linkedin">
                <i class="bi bi-linkedin"></i>LinkedIn
              </a>
            }
          </div>

        </div>
      </div>

      <!-- ══ Tab Nav V2 ════════════════════════════════════════════════════ -->
      <div class="profile-tabs-v2">
        @for (tab of tabs; track tab.id) {
          <button class="profile-tab-v2"
            [class.active]="activeTab() === tab.id"
            (click)="setTab(tab.id)">
            <i [class]="'bi ' + tab.icon"></i>{{ tab.labelKey | translate }}
            @if (tab.id === 'experience' && candidate.experience?.length) {
              <span style="font-size:.65rem;padding:.1rem .45rem;border-radius:999px;
                background:var(--th-primary-soft);color:var(--th-primary);font-weight:700;margin-left:.2rem">
                {{ candidate.experience!.length }}
              </span>
            }
            @if (tab.id === 'education' && candidate.is_experience_based) {
              <span style="font-size:.65rem;padding:.1rem .45rem;border-radius:999px;
                background:#f3e8ff;color:#7c3aed;font-weight:700;margin-left:.2rem">
                💼
              </span>
            } @else if (tab.id === 'education' && (candidate.education?.length || candidate.certificates?.length)) {
              <span style="font-size:.65rem;padding:.1rem .45rem;border-radius:999px;
                background:var(--th-emerald-soft);color:var(--th-emerald);font-weight:700;margin-left:.2rem">
                {{ (candidate.education?.length ?? 0) + (candidate.certificates?.length ?? 0) }}
              </span>
            }
          </button>
        }
      </div>

      <!-- ══ TAB: Overview ════════════════════════════════════════════════ -->
      @if (activeTab() === 'overview') {
        <div class="row g-3">

          <!-- Left column -->
          <div class="col-lg-4">

            <!-- Contact Card -->
            <div class="profile-section-card mb-3">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon"
                  style="background:var(--th-gradient-primary)">
                  <i class="bi bi-person-lines-fill"></i>
                </div>
                <h6>{{ 'CANDIDATE_PROFILE.contact_info' | translate }}</h6>
              </div>
              <div class="profile-section-card__body">
                @if (contactLocked) {
                  <div class="contact-locked-card">
                    <div class="contact-locked-card__icon"><i class="bi bi-lock-fill"></i></div>
                    <div class="contact-locked-card__text">
                      <div class="contact-locked-card__title">{{ 'CANDIDATE_PROFILE.contact_info_hidden' | translate }}</div>
                      <div class="contact-locked-card__sub">{{ 'CANDIDATE_PROFILE.contact_locked_hint' | translate }}</div>
                    </div>
                  </div>
                } @else {
                  @if (candidate.phone) {
                    <div class="info-pill-row">
                      <div class="info-pill-row__icon"><i class="bi bi-telephone-fill"></i></div>
                      <div class="info-pill-row__label">{{ 'COMMON.phone' | translate }}</div>
                      <div class="info-pill-row__value">{{ candidate.phone }}</div>
                    </div>
                  }
                  @if (candidate.whatsapp_number) {
                    <div class="info-pill-row">
                      <div class="info-pill-row__icon"><i class="bi bi-whatsapp text-success"></i></div>
                      <div class="info-pill-row__label">WhatsApp</div>
                      <div class="info-pill-row__value">{{ candidate.whatsapp_number }}</div>
                    </div>
                  }
                }
                @if (candidate.nationality) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-flag-fill"></i></div>
                    <div class="info-pill-row__label">{{ 'CANDIDATE_PROFILE.passport_nationality' | translate }}</div>
                    <div class="info-pill-row__value">{{ translatedProfile()['nationality'] || candidate.nationality }}</div>
                  </div>
                }
                @if (candidate.current_country) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-house-fill"></i></div>
                    <div class="info-pill-row__label">{{ 'CANDIDATE_PROFILE.country_of_residence' | translate }}</div>
                    <div class="info-pill-row__value">{{ translatedProfile()['country'] || candidate.current_country }}</div>
                  </div>
                }
                @if (candidate.date_of_birth) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-calendar3"></i></div>
                    <div class="info-pill-row__label">{{ 'CANDIDATE_PROFILE.birthday' | translate }}</div>
                    <div class="info-pill-row__value">{{ candidate.date_of_birth | localeDate:'mediumDate' }}</div>
                  </div>
                }
                @if (candidate.gender) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-gender-ambiguous"></i></div>
                    <div class="info-pill-row__label">{{ 'CANDIDATE_PROFILE.gender' | translate }}</div>
                    <div class="info-pill-row__value">{{ (translatedProfile()['gender'] || candidate.gender) | titlecase }}</div>
                  </div>
                }
                @if (candidate.marital_status) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-heart"></i></div>
                    <div class="info-pill-row__label">{{ 'CANDIDATE_PROFILE.marital_status' | translate }}</div>
                    <div class="info-pill-row__value">{{ (translatedProfile()['marital_status'] || candidate.marital_status) | titlecase }}</div>
                  </div>
                }
                @if (!candidate.phone && !candidate.nationality && !candidate.date_of_birth && !candidate.gender && !candidate.marital_status) {
                  <p class="text-muted small mb-0">{{ 'CANDIDATE_PROFILE.no_contact_details' | translate }}</p>
                }
              </div>
            </div>

            <!-- Target Locations Card -->
            @if (candidate.target_locations?.length) {
              <div class="profile-section-card mb-3">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-success)">
                    <i class="bi bi-pin-map-fill"></i>
                  </div>
                  <h6>{{ 'CANDIDATE_PROFILE.target_locations' | translate }}</h6>
                </div>
                <div class="profile-section-card__body">
                  <div class="d-flex flex-wrap gap-2">
                    @for (loc of candidate.target_locations; track loc; let $index = $index) {
                      <span style="display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;
                        background:var(--th-emerald-soft);color:var(--th-emerald);border-radius:999px;
                        font-size:.75rem;font-weight:600;border:1px solid rgba(16,185,129,.2)">
                        <i class="bi bi-geo-alt" style="font-size:.7rem"></i>{{ translatedTargetLocations()[$index] || loc }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Hobbies Card -->
            @if (candidate.hobbies?.length) {
              <div class="profile-section-card mb-3">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-primary)">
                    <i class="bi bi-controller"></i>
                  </div>
                  <h6>{{ 'CANDIDATE_PROFILE.hobbies' | translate }}</h6>
                </div>
                <div class="profile-section-card__body">
                  @if (isTranslatingHobbies()) {
                    <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                      <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);
                        border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                      {{ 'CANDIDATE_PROFILE.translating_hobbies' | translate }}
                    </div>
                  } @else {
                    <div class="d-flex flex-wrap gap-2">
                      @for (hobby of candidate.hobbies; track $index) {
                        <span style="display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;
                          background:var(--th-primary-soft);color:var(--th-primary);border-radius:999px;
                          font-size:.75rem;font-weight:600;border:1px solid rgba(99,102,241,.2)">
                          {{ translatedHobbies()[$index] || hobby }}
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Admin Info Card -->
            @if (showAdminInfo && candidate.registration_fee_status) {
              <div class="profile-section-card mb-3">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-warning)">
                    <i class="bi bi-shield-fill-check"></i>
                  </div>
                  <h6>{{ 'CANDIDATE_PROFILE.admin_info' | translate }}</h6>
                </div>
                <div class="profile-section-card__body">
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"
                      style="background:var(--th-amber-soft);color:var(--th-amber)">
                      <i class="bi bi-credit-card-fill"></i>
                    </div>
                    <div class="info-pill-row__label">{{ 'CANDIDATE_PROFILE.registration_fee' | translate }}</div>
                    <div class="info-pill-row__value">
                      <span class="badge rounded-pill"
                        [class.badge-status-active]="candidate.registration_fee_status === 'paid'"
                        [class.badge-status-pending]="candidate.registration_fee_status === 'pending_payment'"
                        [class.badge-status-inactive]="candidate.registration_fee_status === 'waived'">
                        {{ candidate.registration_fee_status === 'paid' ? ('CANDIDATE_PROFILE.fee_paid' | translate) :
                           candidate.registration_fee_status === 'pending_payment' ? ('COMMON.pending' | translate) : ('CANDIDATE_PROFILE.fee_waived' | translate) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Languages Card -->
            @if (candidate.languages?.length) {
              <div class="profile-section-card">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-info)">
                    <i class="bi bi-translate"></i>
                  </div>
                  <h6>{{ 'CANDIDATE_PROFILE.languages' | translate }}</h6>
                </div>
                <div class="profile-section-card__body">
                  @for (lang of candidate.languages; track lang.language; let $index = $index) {
                    <div class="info-pill-row">
                      <div class="info-pill-row__icon"
                        style="background:var(--th-info-soft);color:var(--th-info)">
                        <i class="bi bi-globe2"></i>
                      </div>
                      <div class="info-pill-row__label">{{ translatedLanguageNames()[$index] || lang.language }}</div>
                      <div class="info-pill-row__value">
                        <span style="font-size:.7rem;font-weight:600;padding:.15rem .5rem;border-radius:999px;
                          background:var(--th-info-soft);color:var(--th-info)">
                          {{ lang.proficiency | titlecase }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Right column -->
          <div class="col-lg-8">

            <!-- Bio Card -->
            @if (candidate.bio) {
              <div class="profile-section-card mb-3">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-purple)">
                    <i class="bi bi-chat-quote-fill"></i>
                  </div>
                  <h6>{{ 'CANDIDATE_PROFILE.about' | translate }}</h6>
                  @if (translatedBio() && currentLanguage() !== 'en') {
                    <span style="margin-left:auto;font-size:.65rem;color:var(--th-muted);font-style:italic">
                      {{ 'CANDIDATE_PROFILE.translated_by_ai' | translate }}
                    </span>
                  }
                </div>
                <div class="profile-section-card__body">
                  @if (isTranslatingBio()) {
                    <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                      <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);
                        border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                      {{ 'COMMON.translating' | translate }}…
                    </div>
                   } @else if (translatedBio() && currentLanguage() !== 'en') {
                     <p style="font-size:.875rem;line-height:1.75;color:var(--th-text-secondary);margin:0">
                       {{ translatedBio() }}
                     </p>
                     <p style="font-size:.8rem;color:var(--th-muted);margin:0.75rem 0 0 0;font-style:italic;padding:.5rem;
                       background:var(--th-surface-raised);border-radius:var(--th-radius);border-left:2px solid var(--th-primary)">
                       {{ 'CANDIDATE_PROFILE.original_prefix' | translate }} {{ candidate.bio }}
                     </p>
                   } @else {
                     <p style="font-size:.875rem;line-height:1.75;color:var(--th-text-secondary);margin:0">
                       {{ candidate.bio }}
                     </p>
                   }
                </div>
              </div>
            }

            <!-- Professional Card -->
            <div class="profile-section-card mb-3">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon"
                  style="background:var(--th-gradient-info)">
                  <i class="bi bi-briefcase-fill"></i>
                </div>
                <h6>{{ 'CANDIDATE_PROFILE.professional_details' | translate }}</h6>
              </div>
              <div class="profile-section-card__body">
                <div class="row g-2">
                   <div class="col-sm-6">
                     <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                       border:1px solid var(--th-border)">
                       <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                         color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'CANDIDATE_PROFILE.occupation' | translate }}</div>
                        <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                          @if (translatedProfessional()['occupation'] && currentLanguage() !== 'en') {
                            {{ translatedProfessional()['occupation'] }}
                          } @else {
                            {{ candidate.occupation || '—' }}
                          }
                        </div>
                     </div>
                   </div>
                   <div class="col-sm-6">
                     <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                       border:1px solid var(--th-border)">
                       <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                         color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'COMMON.industry' | translate }}</div>
                        <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                          @if (translatedProfessional()['industry'] && currentLanguage() !== 'en') {
                            {{ translatedProfessional()['industry'] }}
                          } @else {
                            {{ candidate.industry || '—' }}
                          }
                        </div>
                     </div>
                   </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'COMMON.experience' | translate }}</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ candidate.years_experience != null ? candidate.years_experience + ' ' + ('COMMON.years' | translate) : '—' }}
                      </div>
                    </div>
                  </div>
                  @if (candidate.employment_status) {
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'CANDIDATE_PROFILE.employment_status' | translate }}</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text);display:flex;align-items:center;gap:.4rem">
                        <i class="bi bi-person-workspace" style="color:var(--th-primary)"></i>
                        {{ translatedProfile()['employment_status'] || candidate.employment_status }}
                      </div>
                    </div>
                  </div>
                  }
                   <div class="col-sm-6">
                     <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                       border:1px solid var(--th-border)">
                       <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                         color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'CANDIDATE_PROFILE.job_title' | translate }}</div>
                        <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                          @if (translatedProfessional()['job_title'] && currentLanguage() !== 'en') {
                            {{ translatedProfessional()['job_title'] }}
                          } @else {
                            {{ candidate.job_title || '—' }}
                          }
                        </div>
                     </div>
                   </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'CANDIDATE_PROFILE.cv_format' | translate }}</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ candidate.cv_format ? cvFormatLabel(candidate.cv_format) : '—' }}
                      </div>
                    </div>
                  </div>
                  @if (candidate.visa_status) {
                    <div class="col-sm-6">
                      <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                        border:1px solid var(--th-border)">
                        <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                          color:var(--th-muted);font-weight:600;margin-bottom:.3rem">{{ 'CANDIDATE_PROFILE.visa_work_permit' | translate }}</div>
                        <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                          {{ translatedProfile()['visa_status'] || candidate.visa_status }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Skills Card -->
            @if (candidate.skills?.length) {
              <div class="profile-section-card">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-teal)">
                    <i class="bi bi-tools"></i>
                  </div>
                  <h6>{{ 'CANDIDATE_PROFILE.skills' | translate }}</h6>
                  <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                    {{ 'CANDIDATE_PROFILE.skills_count' | translate:{ count: candidate.skills!.length } }}
                  </span>
                </div>
                <div class="profile-section-card__body">
                  @if (isTranslatingSkills()) {
                    <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                      <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);
                        border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                      {{ 'CANDIDATE_PROFILE.translating_skills' | translate }}
                    </div>
                  } @else {
                    <div class="d-flex flex-wrap gap-2">
                      @for (skill of candidate.skills; track $index) {
                        <span class="skill-pill">
                          <span class="skill-pill__dot"></span>
                          {{ translatedSkills()[$index] || skill.skill_name }}
                          @if (skill.proficiency) {
                            <span style="opacity:.6;font-size:.7rem">· {{ skill.proficiency }}</span>
                          }
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ══ TAB: Experience ═══════════════════════════════════════════════ -->
      @if (activeTab() === 'experience') {
        @if (!candidate.experience?.length) {
          <div class="empty-state">
            <div class="empty-state__icon" style="background:var(--th-gradient-info)">
              <i class="bi bi-briefcase"></i>
            </div>
            <div class="empty-state__title">{{ 'CANDIDATE_PROFILE.no_experience_title' | translate }}</div>
            <div class="empty-state__description">{{ 'CANDIDATE_PROFILE.no_experience_desc' | translate }}</div>
          </div>
        } @else {
          <div class="profile-section-card">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon"
                style="background:var(--th-gradient-primary)">
                <i class="bi bi-briefcase-fill"></i>
              </div>
              <h6>{{ 'CANDIDATE_PROFILE.experience' | translate }}</h6>
              <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                {{ 'CANDIDATE_PROFILE.positions_count' | translate:{ count: candidate.experience!.length, plural: candidate.experience!.length > 1 ? 's' : '' } }}
              </span>
            </div>
            <div class="profile-section-card__body">
              @if (isTranslatingExperiences()) {
                <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                  <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);
                    border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                  {{ 'CANDIDATE_PROFILE.translating_experience' | translate }}
                </div>
              } @else {
                <div class="exp-timeline">
                  @for (exp of candidate.experience; track $index) {
                    <div class="exp-timeline__item">
                      <div class="exp-timeline__title">{{ translatedExperiences()[$index]?.['job_title'] || exp.job_title }}</div>
                      <div class="exp-timeline__org">
                        <i class="bi bi-building" style="color:var(--th-muted);font-size:.8rem"></i>
                        {{ translatedExperiences()[$index]?.['company_name'] || exp.company_name }}
                        @if (exp.location) {
                          <span class="dot">·</span>
                          <span>{{ translatedExperiences()[$index]?.['location'] || exp.location }}</span>
                        }
                      </div>
                      <div class="exp-timeline__period">
                        <i class="bi bi-calendar3"></i>
                        {{ exp.start_date | localeDate:'MMM yyyy' }} —
                        {{ exp.end_date ? (exp.end_date | localeDate:'MMM yyyy') : ('COMMON.present' | translate) }}
                      </div>
                       @if (exp.description) {
                        <div class="exp-timeline__desc" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
                          <div style="flex:1">{{ translatedExperiences()[$index]?.['description'] || exp.description }}</div>
                          @if (currentLanguage() !== 'en') {
                            <span style="font-size:.65rem;color:var(--th-muted);font-style:italic;white-space:nowrap;margin-top:.2rem">
                              {{ 'COMMON.translated' | translate }}
                            </span>
                          }
                        </div>
                      }
                      @if (exp.reason_for_leaving) {
                        <div class="exp-timeline__period" style="margin-top:.35rem;opacity:.8">
                          <i class="bi bi-box-arrow-right"></i>
                          {{ 'CANDIDATE_PROFILE.left_prefix' | translate }} {{ translatedExperiences()[$index]?.['reason'] || exp.reason_for_leaving }}
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- ══ TAB: Education ════════════════════════════════════════════════ -->
      @if (activeTab() === 'education') {
        @if (candidate.is_experience_based) {
          <!-- Experience Based Profile badge -->
          <div class="profile-section-card mb-3">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon" style="background:linear-gradient(135deg,#7c3aed,#a855f7)">
                <i class="bi bi-briefcase-fill"></i>
              </div>
              <h6>{{ 'CANDIDATE_PROFILE.experience_based_profile' | translate }}</h6>
            </div>
            <div class="profile-section-card__body">
              <div class="d-flex align-items-start gap-3 py-1">
                <div class="flex-shrink-0 mt-1">
                  <span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#f3e8ff;">
                    <i class="bi bi-briefcase-fill" style="color:#7c3aed;font-size:1rem;"></i>
                  </span>
                </div>
                <div>
                  <div class="fw-semibold" style="font-size:.95rem;color:var(--th-text-primary)">{{ 'CANDIDATE_PROFILE.professionally_qualified' | translate }}</div>
                  <p class="text-muted mb-0 mt-1" style="font-size:.85rem;line-height:1.6">
                    {{ 'CANDIDATE_PROFILE.experience_based_desc' | translate }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        } @else if (!candidate.education?.length && !candidate.certificates?.length) {
          <div class="profile-section-card mb-3">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon" style="background:var(--th-gradient-success)">
                <i class="bi bi-mortarboard-fill"></i>
              </div>
              <h6>{{ 'CANDIDATE_PROFILE.education' | translate }}</h6>
            </div>
            <div class="profile-section-card__body">
              <p class="text-muted fst-italic mb-0" style="font-size:.875rem">
                {{ 'CANDIDATE_PROFILE.no_education' | translate }}
              </p>
            </div>
          </div>
          <div class="profile-section-card">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon" style="background:var(--th-gradient-warning)">
                <i class="bi bi-patch-check-fill"></i>
              </div>
              <h6>{{ 'CANDIDATE_PROFILE.certificates' | translate }}</h6>
            </div>
            <div class="profile-section-card__body">
              <p class="text-muted fst-italic mb-0" style="font-size:.875rem">
                {{ 'CANDIDATE_PROFILE.no_certificates' | translate }}
              </p>
            </div>
          </div>
        } @else {
          @if (candidate.education?.length) {
            <div class="profile-section-card mb-3">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon"
                  style="background:var(--th-gradient-success)">
                  <i class="bi bi-mortarboard-fill"></i>
                </div>
                <h6>{{ 'CANDIDATE_PROFILE.education' | translate }}</h6>
              </div>
              <div class="profile-section-card__body">
                @if (isTranslatingEducations()) {
                  <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                    <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);
                      border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                    {{ 'CANDIDATE_PROFILE.translating_education' | translate }}
                  </div>
                } @else {
                  <div class="exp-timeline" style="--th-primary:#10b981">
                    @for (edu of candidate.education; track $index) {
                      <div class="exp-timeline__item"
                        style="--exp-dot-bg:var(--th-emerald)">
                        <div class="exp-timeline__title">
                          {{ translatedEducations()[$index]?.['degree'] || edu.degree }}@if (edu.field_of_study) { <span style="font-weight:500;color:var(--th-text-secondary)"> in {{ translatedEducations()[$index]?.['field'] || edu.field_of_study }}</span> }
                        </div>
                        <div class="exp-timeline__org">
                          <i class="bi bi-building" style="color:var(--th-muted);font-size:.8rem"></i>
                          {{ translatedEducations()[$index]?.['institution'] || edu.institution }}
                          @if (edu.location) {
                            <span class="dot">·</span>
                            <span>{{ translatedEducations()[$index]?.['location'] || edu.location }}</span>
                          }
                        </div>
                        @if (edu.start_year || edu.end_year) {
                          <div class="exp-timeline__period"
                            style="background:var(--th-emerald-soft);border-color:rgba(16,185,129,.2)">
                            <i class="bi bi-calendar3"></i>
                            {{ formatEduDate(edu.start_month, edu.start_year) }} — {{ edu.end_year ? formatEduDate(edu.end_month, edu.end_year) : ('COMMON.present' | translate) }}
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="profile-section-card mb-3">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon" style="background:var(--th-gradient-success)">
                  <i class="bi bi-mortarboard-fill"></i>
                </div>
                <h6>{{ 'CANDIDATE_PROFILE.education' | translate }}</h6>
              </div>
              <div class="profile-section-card__body">
                <p class="text-muted fst-italic mb-0" style="font-size:.875rem">
                  {{ 'CANDIDATE_PROFILE.experience_based_see_history' | translate }}
                </p>
              </div>
            </div>
          }

          @if (candidate.certificates?.length) {
            <div class="profile-section-card">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon"
                  style="background:var(--th-gradient-warning)">
                  <i class="bi bi-patch-check-fill"></i>
                </div>
                <h6>{{ 'CANDIDATE_PROFILE.certificates' | translate }}</h6>
                <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                  {{ 'CANDIDATE_PROFILE.certs_count' | translate:{ count: candidate.certificates!.length, plural: candidate.certificates!.length > 1 ? 's' : '' } }}
                </span>
              </div>
              <div class="profile-section-card__body">
                @if (isTranslatingCertificates()) {
                  <div style="display:flex;align-items:center;gap:.5rem;color:var(--th-muted);font-size:.875rem">
                    <span style="display:inline-block;width:14px;height:14px;border:2px solid var(--th-primary);
                      border-right:2px solid transparent;border-radius:50%;animation:spin .6s linear infinite"></span>
                    {{ 'CANDIDATE_PROFILE.translating_certificates' | translate }}
                  </div>
                } @else {
                  <div class="row g-2">
                    @for (cert of candidate.certificates; track $index) {
                      <div class="col-sm-6">
                        <div style="padding:1rem;border:1px solid var(--th-border);border-radius:var(--th-radius-lg);
                          background:var(--th-surface-raised);display:flex;align-items:center;gap:.75rem;
                          transition:var(--th-transition)"
                          onmouseover="this.style.borderColor='var(--th-amber)';this.style.background='var(--th-amber-soft)'"
                          onmouseout="this.style.borderColor='var(--th-border)';this.style.background='var(--th-surface-raised)'">
                          <div style="width:40px;height:40px;border-radius:var(--th-radius);
                            background:var(--th-gradient-warning);display:flex;align-items:center;
                            justify-content:center;color:#fff;font-size:1.1rem;flex-shrink:0;
                            box-shadow:0 4px 10px rgba(245,158,11,.25)">
                            <i class="bi bi-award-fill"></i>
                          </div>
                          <div class="flex-grow-1 overflow-hidden">
                            <div style="font-size:.8125rem;font-weight:600;color:var(--th-text)"
                              class="text-truncate">{{ translatedCertificates()[$index]?.['name'] || cert.name }}</div>
                            @if (cert.issuer) {
                              <div style="font-size:.75rem;color:var(--th-muted)">{{ translatedCertificates()[$index]?.['issuer'] || cert.issuer }}</div>
                            }
                            @if (cert.issue_date) {
                              <div style="font-size:.7rem;color:var(--th-muted)">
                                {{ 'CANDIDATE_PROFILE.issued_prefix' | translate }} {{ cert.issue_date | localeDate:'dd MMM yyyy' }}
                              </div>
                            }
                            @if (cert.no_expiry) {
                              <div style="font-size:.7rem;color:var(--th-success,#16a34a)">{{ 'CANDIDATE_PROFILE.no_expiry' | translate }}</div>
                            } @else if (cert.expiry_date) {
                              <div style="font-size:.7rem;color:var(--th-muted)">
                                {{ 'COMMON.expires' | translate }}: {{ cert.expiry_date | localeDate:'dd MMM yyyy' }}
                            </div>
                          }
                        </div>
                        @if (cert.file_url) {
                          <a [href]="cert.file_url" target="_blank"
                            style="width:30px;height:30px;border-radius:50%;background:var(--th-surface);
                              border:1px solid var(--th-border);display:flex;align-items:center;
                              justify-content:center;color:var(--th-text-secondary);font-size:.8rem;
                              text-decoration:none;flex-shrink:0;transition:var(--th-transition)"
                            onmouseover="this.style.background='var(--th-primary-soft)';this.style.borderColor='var(--th-primary)';this.style.color='var(--th-primary)'"
                            onmouseout="this.style.background='var(--th-surface)';this.style.borderColor='var(--th-border)';this.style.color='var(--th-text-secondary)'">
                            <i class="bi bi-eye"></i>
                          </a>
                        }
                      </div>
                    </div>
                  }
                </div>
                }
              </div>
            </div>
          } @else {
            <div class="profile-section-card">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon" style="background:var(--th-gradient-warning)">
                  <i class="bi bi-patch-check-fill"></i>
                </div>
                <h6>{{ 'CANDIDATE_PROFILE.certificates' | translate }}</h6>
              </div>
              <div class="profile-section-card__body">
                <p class="text-muted fst-italic mb-0" style="font-size:.875rem">
                  {{ 'CANDIDATE_PROFILE.no_certs_experience_based' | translate }}
                </p>
              </div>
            </div>
          }
        }
      }

      <!-- ══ TAB: Documents ═══════════════════════════════════════════════ -->
      @if (activeTab() === 'documents') {
        @if (!candidate.resume_url && !candidate.intro_video_url) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <i class="bi bi-folder2-open"></i>
            </div>
            <div class="empty-state__title">{{ 'CANDIDATE_PROFILE.no_documents' | translate }}</div>
            <div class="empty-state__description">{{ 'CANDIDATE_PROFILE.no_documents_desc' | translate }}</div>
          </div>
        } @else {
          <div class="profile-section-card mb-3">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon"
                style="background:var(--th-gradient-primary)">
                <i class="bi bi-folder2-open"></i>
              </div>
              <h6>{{ 'CANDIDATE_PROFILE.documents_media' | translate }}</h6>
            </div>
            <div class="profile-section-card__body">
              <div class="d-flex flex-column gap-2">
                @if (candidate.resume_url) {
                  <a [href]="candidate.resume_url" target="_blank" class="doc-card">
                    <div class="doc-card__icon"
                      style="background:var(--th-primary-soft)">
                      <i class="bi bi-file-earmark-person-fill"
                        style="color:var(--th-primary)"></i>
                    </div>
                    <div class="doc-card__body">
                      <div class="doc-card__name">{{ 'CANDIDATE_PROFILE.curriculum_vitae' | translate }}</div>
                      <div class="doc-card__meta">{{ 'CANDIDATE_PROFILE.pdf_click_download' | translate }}</div>
                    </div>
                    <div class="doc-card__action">
                      <i class="bi bi-download"></i>
                    </div>
                  </a>
                }
                @if (candidate.intro_video_url) {
                  <a [href]="candidate.intro_video_url" target="_blank" class="doc-card">
                    <div class="doc-card__icon"
                      style="background:var(--th-rose-soft)">
                      <i class="bi bi-camera-video-fill"
                        style="color:var(--th-rose)"></i>
                    </div>
                    <div class="doc-card__body">
                      <div class="doc-card__name">{{ 'CANDIDATE_PROFILE.introduction_video' | translate }}</div>
                      <div class="doc-card__meta">{{ 'CANDIDATE_PROFILE.video_click_watch' | translate }}</div>
                    </div>
                    <div class="doc-card__action">
                      <i class="bi bi-play-circle-fill"></i>
                    </div>
                  </a>
                }
              </div>
            </div>
          </div>
        }
      }

      <!-- ══ TAB: Activity ═════════════════════════════════════════════════ -->
      @if (activeTab() === 'activity') {
        <div class="profile-section-card mb-3">
          <div class="profile-section-card__header">
            <div class="profile-section-card__header-icon"
              style="background:var(--th-gradient-primary)">
              <i class="bi bi-clock-history"></i>
            </div>
            <h6>{{ 'CANDIDATE_PROFILE.activity_history' | translate }}</h6>
          </div>
          <div class="profile-section-card__body">

            @if (activityLoading()) {
              <div class="text-center py-4">
                <div class="spinner-border spinner-border-sm" style="color:var(--th-primary)"></div>
                <div class="mt-2 small text-muted">{{ 'CANDIDATE_PROFILE.loading_activity' | translate }}</div>
              </div>
            } @else if (activity().length === 0) {
              <div class="text-center py-4">
                <i class="bi bi-clock-history" style="font-size:2rem;color:var(--th-muted);opacity:.4;"></i>
                <div class="mt-2 small text-muted">{{ 'CANDIDATE_PROFILE.no_activity' | translate }}</div>
              </div>
            } @else {
              <div class="activity-timeline">
                @for (item of activity(); track item.id) {
                  <div class="activity-item">
                    <div class="activity-item__dot">
                      <i class="bi" [class]="'bi ' + getActivityIcon(item.type)"
                        [style.color]="getActivityColor(item.type)"></i>
                    </div>
                    <div class="activity-item__body">
                      <div class="activity-item__desc">{{ item.description }}</div>
                      <div class="activity-item__date">
                        {{ item.created_at | localeDate:'dd MMM yyyy, HH:mm' }}
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

          </div>
        </div>
      }

    }
  `,
  styles: [`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .activity-timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--th-border);
    }
    .activity-item:last-child {
      border-bottom: none;
    }
    .activity-item__dot {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--th-surface-2);
      border: 1px solid var(--th-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 15px;
    }
    .activity-item__body {
      flex: 1;
      padding-top: 4px;
    }
    .activity-item__desc {
      font-size: 14px;
      font-weight: 500;
      color: var(--th-text);
      line-height: 1.4;
    }
    .activity-item__date {
      font-size: 12px;
      color: var(--th-muted);
      margin-top: 3px;
    }
  `],
})
export class CandidateProfileComponent implements OnInit, OnDestroy {
  @Input() candidate: Candidate | null = null;
  @Input() contactLocked = false;
  @Input() showAdminInfo = true;

  private candidateSvc = inject(CandidateService);
  private bulkTranslation = inject(BulkTranslationService);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  activeTab = signal<Tab>('overview');

  // Activity tab state
  activity         = signal<CandidateActivity[]>([]);
  activityLoading  = signal(false);
  activityLoaded   = false;

  // Translation state signals
  currentLanguage = signal<string>('en');

  // Translated data signals by section
  translatedProfessional = signal<Record<string, string>>({});
  /** city, country, nationality, gender, marital_status, employment_status, visa_status */
  translatedProfile = signal<Record<string, string>>({});
  translatedBio = signal<string>('');
  translatedSkills = signal<Record<number, string>>({});
  translatedExperiences = signal<Record<number, Record<string, string>>>({});
  translatedEducations = signal<Record<number, Record<string, string>>>({});
  translatedCertificates = signal<Record<number, Record<string, string>>>({});
  translatedHobbies = signal<string[]>([]);
  translatedTargetLocations = signal<string[]>([]);
  translatedLanguageNames = signal<string[]>([]);

  // Loading signals for each section
  isTranslatingProfessional = signal(false);
  isTranslatingBio = signal(false);
  isTranslatingSkills = signal(false);
  isTranslatingExperiences = signal(false);
  isTranslatingEducations = signal(false);
  isTranslatingCertificates = signal(false);
  isTranslatingHobbies = signal(false);

  readonly cvFormatLabelKeys: Record<string, string> = {
    uk_format:         'CANDIDATE_PROFILE.cv_format_uk',
    european_format:   'CANDIDATE_PROFILE.cv_format_european',
    canadian_format:   'CANDIDATE_PROFILE.cv_format_canadian',
    australian_format: 'CANDIDATE_PROFILE.cv_format_australian',
    gulf_format:       'CANDIDATE_PROFILE.cv_format_gulf',
    asian_format:      'CANDIDATE_PROFILE.cv_format_asian',
    not_yet_created:   'CANDIDATE_PROFILE.cv_format_not_yet_created',
    others:            'CANDIDATE_PROFILE.cv_format_others',
  };

  cvFormatLabel(format: string): string {
    const key = this.cvFormatLabelKeys[format];
    return key ? this.translate.instant(key) : format;
  }

  tabs: { id: Tab; labelKey: string; icon: string }[] = [
    { id: 'overview',    labelKey: 'CANDIDATE_PROFILE.tab_overview',    icon: 'bi-person-fill'       },
    { id: 'experience',  labelKey: 'CANDIDATE_PROFILE.tab_experience',  icon: 'bi-briefcase-fill'    },
    { id: 'education',   labelKey: 'CANDIDATE_PROFILE.education',      icon: 'bi-mortarboard-fill'  },
    { id: 'documents',   labelKey: 'CANDIDATE_PROFILE.tab_documents',   icon: 'bi-folder2-open'      },
    { id: 'activity',    labelKey: 'CANDIDATE_PROFILE.tab_activity',    icon: 'bi-clock-history'     },
  ];

  ngOnInit(): void {
    // Listen to language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.currentLanguage.set(event.lang);
        
        // Clear cache and reset all translations when language changes
        this.bulkTranslation.clearCache();
        this.resetAllTranslations();
        
        // Auto-translate all sections when language changes (if not English)
        if (event.lang !== 'en' && this.candidate) {
          this.translateAllSections();
        }
      });

    // Set initial language
    this.currentLanguage.set(this.translate.currentLang || 'en');

    // If not English, translate all sections on init
    if (this.currentLanguage() !== 'en' && this.candidate) {
      this.translateAllSections();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reset all translation signals
   */
  private resetAllTranslations(): void {
    this.translatedProfessional.set({});
    this.translatedProfile.set({});
    this.translatedBio.set('');
    this.translatedSkills.set({});
    this.translatedExperiences.set({});
    this.translatedEducations.set({});
    this.translatedCertificates.set({});
    this.translatedHobbies.set([]);
    this.translatedTargetLocations.set([]);
    this.translatedLanguageNames.set([]);
  }

  /**
   * Translate the whole profile in one combined request.
   * Every user-entered text field on the profile — professional details,
   * location/personal fields, bio, hobbies, target locations, spoken
   * languages, skills, experiences (incl. location), educations (incl.
   * location) and certificates — is merged into a single flat field map
   * before hitting BulkTranslationService.translateSection(), so a profile
   * view triggers one /translate call (only splitting further if the
   * combined text exceeds the service's per-request character cap) instead
   * of one call per section.
   */
  async translateAllSections(): Promise<void> {
    if (this.currentLanguage() === 'en' || !this.candidate) return;

    const requestedLang = this.currentLanguage();
    const c = this.candidate;

    const hasProfessional = !!(c.job_title || c.industry || c.occupation);
    const hasBio = !!c.bio;
    const hasSkills = !!c.skills?.length;
    const hasExperiences = !!c.experience?.length;
    const hasEducations = !!c.education?.length;
    const hasCertificates = !!c.certificates?.length;
    const hasHobbies = !!c.hobbies?.length;

    if (hasProfessional) this.isTranslatingProfessional.set(true);
    if (hasBio) this.isTranslatingBio.set(true);
    if (hasSkills) this.isTranslatingSkills.set(true);
    if (hasExperiences) this.isTranslatingExperiences.set(true);
    if (hasEducations) this.isTranslatingEducations.set(true);
    if (hasCertificates) this.isTranslatingCertificates.set(true);
    if (hasHobbies) this.isTranslatingHobbies.set(true);

    try {
      const allFields: Record<string, string> = {};

      if (c.job_title) allFields['prof_job_title'] = c.job_title;
      if (c.industry) allFields['prof_industry'] = c.industry;
      if (c.occupation) allFields['prof_occupation'] = c.occupation;
      if (c.current_city) allFields['pf_city'] = c.current_city;
      if (c.current_country) allFields['pf_country'] = c.current_country;
      if (c.nationality) allFields['pf_nationality'] = c.nationality;
      if (c.gender) allFields['pf_gender'] = c.gender;
      if (c.marital_status) allFields['pf_marital_status'] = c.marital_status;
      if (c.employment_status) allFields['pf_employment_status'] = c.employment_status;
      if (c.visa_status) allFields['pf_visa_status'] = c.visa_status;
      if (c.bio) allFields['bio'] = c.bio;

      c.hobbies?.forEach((hobby, i) => { if (hobby) allFields[`hobby_${i}`] = hobby; });
      c.target_locations?.forEach((loc, i) => { if (loc) allFields[`target_${i}`] = loc; });
      c.languages?.forEach((lang, i) => { if (lang.language) allFields[`lang_${i}`] = lang.language; });
      c.skills?.forEach((skill, i) => { if (skill.skill_name) allFields[`skill_${i}`] = skill.skill_name; });
      c.experience?.forEach((exp, i) => {
        if (exp.job_title) allFields[`exp_${i}_job_title`] = exp.job_title;
        if (exp.company_name) allFields[`exp_${i}_company_name`] = exp.company_name;
        if (exp.location) allFields[`exp_${i}_location`] = exp.location;
        if (exp.description) allFields[`exp_${i}_description`] = exp.description;
        if (exp.reason_for_leaving) allFields[`exp_${i}_reason`] = exp.reason_for_leaving;
      });
      c.education?.forEach((edu, i) => {
        if (edu.degree) allFields[`edu_${i}_degree`] = edu.degree;
        if (edu.field_of_study) allFields[`edu_${i}_field`] = edu.field_of_study;
        if (edu.institution) allFields[`edu_${i}_institution`] = edu.institution;
        if (edu.location) allFields[`edu_${i}_location`] = edu.location;
      });
      c.certificates?.forEach((cert, i) => {
        if (cert.name) allFields[`cert_${i}_name`] = cert.name;
        if (cert.issuer) allFields[`cert_${i}_issuer`] = cert.issuer;
      });

      if (Object.keys(allFields).length === 0) return;

      const translated = await this.bulkTranslation.translateSection(allFields, requestedLang);
      if (this.currentLanguage() !== requestedLang) return;

      const professional: Record<string, string> = {};
      const profile: Record<string, string> = {};
      const skills: Record<string, string> = {};
      const experiences: Record<string, Record<string, string>> = {};
      const educations: Record<string, Record<string, string>> = {};
      const certificates: Record<string, Record<string, string>> = {};
      const hobbies: string[] = c.hobbies ? [...c.hobbies] : [];
      const targetLocations: string[] = c.target_locations ? [...c.target_locations] : [];
      const languageNames: string[] = c.languages ? c.languages.map(l => l.language) : [];
      let bio = '';

      for (const [key, value] of Object.entries(translated)) {
        let m: RegExpMatchArray | null;
        if (key === 'prof_job_title') professional['job_title'] = value;
        else if (key === 'prof_industry') professional['industry'] = value;
        else if (key === 'prof_occupation') professional['occupation'] = value;
        else if (key === 'pf_city') profile['city'] = value;
        else if (key === 'pf_country') profile['country'] = value;
        else if (key === 'pf_nationality') profile['nationality'] = value;
        else if (key === 'pf_gender') profile['gender'] = value;
        else if (key === 'pf_marital_status') profile['marital_status'] = value;
        else if (key === 'pf_employment_status') profile['employment_status'] = value;
        else if (key === 'pf_visa_status') profile['visa_status'] = value;
        else if (key === 'bio') bio = value;
        else if ((m = key.match(/^hobby_(\d+)$/))) hobbies[Number(m[1])] = value;
        else if ((m = key.match(/^target_(\d+)$/))) targetLocations[Number(m[1])] = value;
        else if ((m = key.match(/^lang_(\d+)$/))) languageNames[Number(m[1])] = value;
        else if ((m = key.match(/^skill_(\d+)$/))) skills[m[1]] = value;
        else if ((m = key.match(/^exp_(\d+)_(.+)$/))) {
          if (!experiences[m[1]]) experiences[m[1]] = {};
          experiences[m[1]][m[2]] = value;
        } else if ((m = key.match(/^edu_(\d+)_(.+)$/))) {
          if (!educations[m[1]]) educations[m[1]] = {};
          educations[m[1]][m[2]] = value;
        } else if ((m = key.match(/^cert_(\d+)_(.+)$/))) {
          if (!certificates[m[1]]) certificates[m[1]] = {};
          certificates[m[1]][m[2]] = value;
        }
      }

      this.translatedProfessional.set(professional);
      this.translatedProfile.set(profile);
      this.translatedBio.set(bio);
      this.translatedSkills.set(skills);
      this.translatedExperiences.set(experiences);
      this.translatedEducations.set(educations);
      this.translatedCertificates.set(certificates);
      this.translatedHobbies.set(hobbies);
      this.translatedTargetLocations.set(targetLocations);
      this.translatedLanguageNames.set(languageNames);
    } catch (error) {
      console.error('Error translating candidate profile:', error);
    } finally {
      if (this.currentLanguage() === requestedLang) {
        this.isTranslatingProfessional.set(false);
        this.isTranslatingBio.set(false);
        this.isTranslatingSkills.set(false);
        this.isTranslatingExperiences.set(false);
        this.isTranslatingEducations.set(false);
        this.isTranslatingCertificates.set(false);
        this.isTranslatingHobbies.set(false);
      }
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'activity' && !this.activityLoaded && this.candidate?.id) {
      this.activityLoading.set(true);
      this.candidateSvc.getActivity(this.candidate.id).subscribe({
        next: (res) => {
          this.activity.set(res.activity);
          this.activityLoading.set(false);
          this.activityLoaded = true;
        },
        error: () => {
          this.activityLoading.set(false);
          this.activityLoaded = true;
        },
      });
    }
  }

  getActivityIcon(type: string): string {
    const map: Record<string, string> = {
      agency_interest_approved: 'bi-building-check',
    };
    return map[type] ?? 'bi-circle-fill';
  }

  getActivityColor(type: string): string {
    const map: Record<string, string> = {
      agency_interest_approved: 'var(--th-emerald)',
    };
    return map[type] ?? 'var(--th-primary)';
  }

  formatEduDate(month?: number, year?: number): string {
    if (!year) return '';
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return month ? `${monthNames[month - 1]} ${year}` : `${year}`;
  }
}

