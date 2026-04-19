// src/app/shared/components/candidate-profile/candidate-profile.component.ts
import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Candidate } from '../../../core/models/candidate.model';

type Tab = 'overview' | 'experience' | 'education' | 'documents';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!candidate) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading profile…</div>
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
              <div class="profile-hero-v2__online-dot" title="Active"></div>
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
              <span class="badge rounded-pill px-3 py-2"
                [class.badge-status-active]="candidate.profile_status === 'active'"
                [class.badge-status-pending]="candidate.profile_status === 'pending_edit'"
                [class.badge-status-inactive]="candidate.profile_status === 'inactive'">
                {{ candidate.profile_status | titlecase }}
              </span>
            </div>

            <div class="profile-hero-v2__headline">
              @if (candidate.job_title) { <span>{{ candidate.job_title }}</span> }
              @if (candidate.job_title && candidate.industry) { <span class="sep">·</span> }
              @if (candidate.industry) { <span>{{ candidate.industry }}</span> }
              @if ((candidate.job_title || candidate.industry) && candidate.years_experience != null) {
                <span class="sep">·</span>
              }
              @if (candidate.years_experience != null) {
                <span>{{ candidate.years_experience }} yrs exp</span>
              }
            </div>

            <div class="profile-hero-v2__meta">
              @if (candidate.current_city || candidate.current_country) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-geo-alt-fill"></i>
                  {{ candidate.current_city }}{{ candidate.current_city && candidate.current_country ? ', ' : '' }}{{ candidate.current_country }}
                </span>
              }
              <!-- Email chip -->
              @if (contactLocked) {
                <span class="profile-hero-v2__meta-chip contact-locked-chip">
                  <i class="bi bi-lock-fill"></i>Email hidden
                </span>
              } @else if (candidate.email) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-envelope-fill"></i>{{ candidate.email }}
                </span>
              }
              <!-- Phone chip -->
              @if (contactLocked) {
                <span class="profile-hero-v2__meta-chip contact-locked-chip">
                  <i class="bi bi-lock-fill"></i>Phone hidden
                </span>
              } @else if (candidate.phone) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-telephone-fill"></i>{{ candidate.phone }}
                </span>
              }
              @if (candidate.nationality) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-flag-fill"></i>{{ candidate.nationality }}
                </span>
              }
            </div>
          </div>

          <!-- Action buttons -->
          <div class="profile-hero-v2__actions">
            @if (candidate.resume_url) {
              <a [href]="candidate.resume_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--cv">
                <i class="bi bi-file-earmark-person-fill"></i>Download CV
              </a>
            }
            @if (candidate.intro_video_url) {
              <a [href]="candidate.intro_video_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--video">
                <i class="bi bi-camera-video-fill"></i>Intro Video
              </a>
            }
            <!-- LinkedIn -->
            @if (contactLocked) {
              <span class="profile-hero-v2__action-btn contact-locked-btn">
                <i class="bi bi-lock-fill"></i>LinkedIn hidden
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
            (click)="activeTab.set(tab.id)">
            <i [class]="'bi ' + tab.icon"></i>{{ tab.label }}
            @if (tab.id === 'experience' && candidate.experience?.length) {
              <span style="font-size:.65rem;padding:.1rem .45rem;border-radius:999px;
                background:var(--th-primary-soft);color:var(--th-primary);font-weight:700;margin-left:.2rem">
                {{ candidate.experience!.length }}
              </span>
            }
            @if (tab.id === 'education' && (candidate.education?.length || candidate.certificates?.length)) {
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
                <h6>Contact Info</h6>
              </div>
              <div class="profile-section-card__body">
                @if (contactLocked) {
                  <div class="contact-locked-card">
                    <div class="contact-locked-card__icon"><i class="bi bi-lock-fill"></i></div>
                    <div class="contact-locked-card__text">
                      <div class="contact-locked-card__title">Contact Info Hidden</div>
                      <div class="contact-locked-card__sub">Request access to view email, phone and LinkedIn.</div>
                    </div>
                  </div>
                } @else {
                  @if (candidate.phone) {
                    <div class="info-pill-row">
                      <div class="info-pill-row__icon"><i class="bi bi-telephone-fill"></i></div>
                      <div class="info-pill-row__label">Phone</div>
                      <div class="info-pill-row__value">{{ candidate.phone }}</div>
                    </div>
                  }
                }
                @if (candidate.nationality) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-flag-fill"></i></div>
                    <div class="info-pill-row__label">Nationality</div>
                    <div class="info-pill-row__value">{{ candidate.nationality }}</div>
                  </div>
                }
                @if (candidate.date_of_birth) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-calendar3"></i></div>
                    <div class="info-pill-row__label">Birthday</div>
                    <div class="info-pill-row__value">{{ candidate.date_of_birth | date:'mediumDate' }}</div>
                  </div>
                }
                @if (candidate.gender) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-person-fill"></i></div>
                    <div class="info-pill-row__label">Gender</div>
                    <div class="info-pill-row__value">{{ candidate.gender | titlecase }}</div>
                  </div>
                }
                @if (!candidate.phone && !candidate.nationality && !candidate.date_of_birth && !candidate.gender) {
                  <p class="text-muted small mb-0">No contact details available.</p>
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
                  <h6>Target Locations</h6>
                </div>
                <div class="profile-section-card__body">
                  <div class="d-flex flex-wrap gap-2">
                    @for (loc of candidate.target_locations; track loc) {
                      <span style="display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;
                        background:var(--th-emerald-soft);color:var(--th-emerald);border-radius:999px;
                        font-size:.75rem;font-weight:600;border:1px solid rgba(16,185,129,.2)">
                        <i class="bi bi-geo-alt" style="font-size:.7rem"></i>{{ loc }}
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
                  <h6>Hobbies &amp; Interests</h6>
                </div>
                <div class="profile-section-card__body">
                  <div class="d-flex flex-wrap gap-2">
                    @for (hobby of candidate.hobbies; track hobby) {
                      <span style="display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;
                        background:var(--th-primary-soft);color:var(--th-primary);border-radius:999px;
                        font-size:.75rem;font-weight:600;border:1px solid rgba(99,102,241,.2)">
                        {{ hobby }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Salary Card -->
            @if (candidate.salary_min || candidate.salary_max) {
              <div class="profile-section-card mb-3">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-warning)">
                    <i class="bi bi-cash-coin"></i>
                  </div>
                  <h6>Salary Expectation</h6>
                </div>
                <div class="profile-section-card__body">
                  <div style="font-size:1.25rem;font-weight:800;color:var(--th-amber)">
                    {{ candidate.salary_currency }}
                    {{ candidate.salary_min | number }}
                    @if (candidate.salary_max) { <span style="color:var(--th-muted);font-size:.875rem">–</span> {{ candidate.salary_max | number }} }
                  </div>
                  <div style="font-size:.75rem;color:var(--th-muted);margin-top:.25rem">
                    per {{ candidate.salary_type }}
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
                  <h6>Languages</h6>
                </div>
                <div class="profile-section-card__body">
                  @for (lang of candidate.languages; track lang.language) {
                    <div class="info-pill-row">
                      <div class="info-pill-row__icon"
                        style="background:var(--th-info-soft);color:var(--th-info)">
                        <i class="bi bi-globe2"></i>
                      </div>
                      <div class="info-pill-row__label">{{ lang.language }}</div>
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
                  <h6>About</h6>
                </div>
                <div class="profile-section-card__body">
                  <p style="font-size:.875rem;line-height:1.75;color:var(--th-text-secondary);margin:0">
                    {{ candidate.bio }}
                  </p>
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
                <h6>Professional Details</h6>
              </div>
              <div class="profile-section-card__body">
                <div class="row g-2">
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Occupation</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ candidate.occupation || '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Industry</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ candidate.industry || '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Experience</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ candidate.years_experience != null ? candidate.years_experience + ' years' : '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Job Title</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ candidate.job_title || '—' }}
                      </div>
                    </div>
                  </div>
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
                  <h6>Skills</h6>
                  <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                    {{ candidate.skills!.length }} skills
                  </span>
                </div>
                <div class="profile-section-card__body">
                  <div class="d-flex flex-wrap gap-2">
                    @for (skill of candidate.skills; track skill.skill_name) {
                      <span class="skill-pill">
                        <span class="skill-pill__dot"></span>
                        {{ skill.skill_name }}
                        @if (skill.proficiency) {
                          <span style="opacity:.6;font-size:.7rem">· {{ skill.proficiency }}</span>
                        }
                      </span>
                    }
                  </div>
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
            <div class="empty-state__title">No work experience listed</div>
            <div class="empty-state__description">Work history will appear here once added.</div>
          </div>
        } @else {
          <div class="profile-section-card">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon"
                style="background:var(--th-gradient-primary)">
                <i class="bi bi-briefcase-fill"></i>
              </div>
              <h6>Work Experience</h6>
              <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                {{ candidate.experience!.length }} position{{ candidate.experience!.length > 1 ? 's' : '' }}
              </span>
            </div>
            <div class="profile-section-card__body">
              <div class="exp-timeline">
                @for (exp of candidate.experience; track $index) {
                  <div class="exp-timeline__item">
                    <div class="exp-timeline__title">{{ exp.job_title }}</div>
                    <div class="exp-timeline__org">
                      <i class="bi bi-building" style="color:var(--th-muted);font-size:.8rem"></i>
                      {{ exp.company_name }}
                      @if (exp.location) {
                        <span class="dot">·</span>
                        <span>{{ exp.location }}</span>
                      }
                    </div>
                    <div class="exp-timeline__period">
                      <i class="bi bi-calendar3"></i>
                      {{ exp.start_date | date:'MMM yyyy' }} —
                      {{ exp.end_date ? (exp.end_date | date:'MMM yyyy') : 'Present' }}
                    </div>
                    @if (exp.description) {
                      <div class="exp-timeline__desc">{{ exp.description }}</div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }

      <!-- ══ TAB: Education ════════════════════════════════════════════════ -->
      @if (activeTab() === 'education') {
        @if (!candidate.education?.length && !candidate.certificates?.length) {
          <div class="empty-state">
            <div class="empty-state__icon" style="background:var(--th-gradient-success)">
              <i class="bi bi-mortarboard"></i>
            </div>
            <div class="empty-state__title">No education records</div>
            <div class="empty-state__description">Education and certifications will appear here once added.</div>
          </div>
        } @else {
          @if (candidate.education?.length) {
            <div class="profile-section-card mb-3">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon"
                  style="background:var(--th-gradient-success)">
                  <i class="bi bi-mortarboard-fill"></i>
                </div>
                <h6>Education</h6>
              </div>
              <div class="profile-section-card__body">
                <div class="exp-timeline" style="--th-primary:#10b981">
                  @for (edu of candidate.education; track $index) {
                    <div class="exp-timeline__item"
                      style="--exp-dot-bg:var(--th-emerald)">
                      <div class="exp-timeline__title">
                        {{ edu.degree }}@if (edu.field_of_study) { <span style="font-weight:500;color:var(--th-text-secondary)"> in {{ edu.field_of_study }}</span> }
                      </div>
                      <div class="exp-timeline__org">
                        <i class="bi bi-building" style="color:var(--th-muted);font-size:.8rem"></i>
                        {{ edu.institution }}
                        @if (edu.location) {
                          <span class="dot">·</span>
                          <span>{{ edu.location }}</span>
                        }
                      </div>
                      @if (edu.start_year || edu.end_year) {
                        <div class="exp-timeline__period"
                          style="background:var(--th-emerald-soft);border-color:rgba(16,185,129,.2)">
                          <i class="bi bi-calendar3"></i>
                          {{ edu.start_year }} — {{ edu.end_year || 'Present' }}
                        </div>
                      }
                    </div>
                  }
                </div>
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
                <h6>Certificates</h6>
                <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                  {{ candidate.certificates!.length }} cert{{ candidate.certificates!.length > 1 ? 's' : '' }}
                </span>
              </div>
              <div class="profile-section-card__body">
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
                            class="text-truncate">{{ cert.name }}</div>
                          @if (cert.issuer) {
                            <div style="font-size:.75rem;color:var(--th-muted)">{{ cert.issuer }}</div>
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
            <div class="empty-state__title">No documents uploaded</div>
            <div class="empty-state__description">CV and intro video will appear here once uploaded.</div>
          </div>
        } @else {
          <div class="profile-section-card mb-3">
            <div class="profile-section-card__header">
              <div class="profile-section-card__header-icon"
                style="background:var(--th-gradient-primary)">
                <i class="bi bi-folder2-open"></i>
              </div>
              <h6>Documents &amp; Media</h6>
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
                      <div class="doc-card__name">Curriculum Vitae</div>
                      <div class="doc-card__meta">PDF document · Click to download</div>
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
                      <div class="doc-card__name">Introduction Video</div>
                      <div class="doc-card__meta">Video · Click to watch</div>
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

    }
  `,
  styles: [],
})
export class CandidateProfileComponent {
  @Input() candidate: Candidate | null = null;
  @Input() contactLocked = false;

  activeTab = signal<Tab>('overview');

  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: 'bi-person-fill'       },
    { id: 'experience',  label: 'Experience',  icon: 'bi-briefcase-fill'    },
    { id: 'education',   label: 'Education',   icon: 'bi-mortarboard-fill'  },
    { id: 'documents',   label: 'Documents',   icon: 'bi-folder2-open'      },
  ];
}
