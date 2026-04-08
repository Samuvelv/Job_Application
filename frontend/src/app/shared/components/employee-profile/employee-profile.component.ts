// src/app/shared/components/employee-profile/employee-profile.component.ts
import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Employee } from '../../../core/models/employee.model';

type Tab = 'overview' | 'experience' | 'education' | 'documents';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!employee) {
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
            @if (employee.profile_photo_url) {
              <img [src]="employee.profile_photo_url" alt="Profile photo"
                class="profile-hero-v2__avatar">
            } @else {
              <div class="profile-hero-v2__avatar-placeholder">
                {{ employee.first_name[0] }}{{ employee.last_name[0] }}
              </div>
            }
            @if (employee.profile_status === 'active') {
              <div class="profile-hero-v2__online-dot" title="Active"></div>
            }
          </div>

          <!-- Name + meta -->
          <div class="profile-hero-v2__info flex-grow-1">
            <div class="profile-hero-v2__name-row">
              <h2 class="profile-hero-v2__name mb-0">
                {{ employee.first_name }} {{ employee.last_name }}
              </h2>
              <span class="badge rounded-pill px-3 py-2"
                [class.badge-status-active]="employee.profile_status === 'active'"
                [class.badge-status-pending]="employee.profile_status === 'pending_edit'"
                [class.badge-status-inactive]="employee.profile_status === 'inactive'">
                {{ employee.profile_status | titlecase }}
              </span>
            </div>

            <div class="profile-hero-v2__headline">
              @if (employee.job_title) { <span>{{ employee.job_title }}</span> }
              @if (employee.job_title && employee.industry) { <span class="sep">·</span> }
              @if (employee.industry) { <span>{{ employee.industry }}</span> }
              @if ((employee.job_title || employee.industry) && employee.years_experience != null) {
                <span class="sep">·</span>
              }
              @if (employee.years_experience != null) {
                <span>{{ employee.years_experience }} yrs exp</span>
              }
            </div>

            <div class="profile-hero-v2__meta">
              @if (employee.current_city || employee.current_country) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-geo-alt-fill"></i>
                  {{ employee.current_city }}{{ employee.current_city && employee.current_country ? ', ' : '' }}{{ employee.current_country }}
                </span>
              }
              @if (employee.email) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-envelope-fill"></i>{{ employee.email }}
                </span>
              }
              @if (employee.phone) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-telephone-fill"></i>{{ employee.phone }}
                </span>
              }
              @if (employee.nationality) {
                <span class="profile-hero-v2__meta-chip">
                  <i class="bi bi-flag-fill"></i>{{ employee.nationality }}
                </span>
              }
            </div>
          </div>

          <!-- Action buttons -->
          <div class="profile-hero-v2__actions">
            @if (employee.resume_url) {
              <a [href]="employee.resume_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--cv">
                <i class="bi bi-file-earmark-person-fill"></i>Download CV
              </a>
            }
            @if (employee.intro_video_url) {
              <a [href]="employee.intro_video_url" target="_blank"
                class="profile-hero-v2__action-btn profile-hero-v2__action-btn--video">
                <i class="bi bi-camera-video-fill"></i>Intro Video
              </a>
            }
            @if (employee.linkedin_url) {
              <a [href]="employee.linkedin_url" target="_blank"
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
            @if (tab.id === 'experience' && employee.experience?.length) {
              <span style="font-size:.65rem;padding:.1rem .45rem;border-radius:999px;
                background:var(--th-primary-soft);color:var(--th-primary);font-weight:700;margin-left:.2rem">
                {{ employee.experience!.length }}
              </span>
            }
            @if (tab.id === 'education' && (employee.education?.length || employee.certificates?.length)) {
              <span style="font-size:.65rem;padding:.1rem .45rem;border-radius:999px;
                background:var(--th-emerald-soft);color:var(--th-emerald);font-weight:700;margin-left:.2rem">
                {{ (employee.education?.length ?? 0) + (employee.certificates?.length ?? 0) }}
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
                @if (employee.phone) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-telephone-fill"></i></div>
                    <div class="info-pill-row__label">Phone</div>
                    <div class="info-pill-row__value">{{ employee.phone }}</div>
                  </div>
                }
                @if (employee.nationality) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-flag-fill"></i></div>
                    <div class="info-pill-row__label">Nationality</div>
                    <div class="info-pill-row__value">{{ employee.nationality }}</div>
                  </div>
                }
                @if (employee.date_of_birth) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-calendar3"></i></div>
                    <div class="info-pill-row__label">Birthday</div>
                    <div class="info-pill-row__value">{{ employee.date_of_birth | date:'mediumDate' }}</div>
                  </div>
                }
                @if (employee.gender) {
                  <div class="info-pill-row">
                    <div class="info-pill-row__icon"><i class="bi bi-person-fill"></i></div>
                    <div class="info-pill-row__label">Gender</div>
                    <div class="info-pill-row__value">{{ employee.gender | titlecase }}</div>
                  </div>
                }
                @if (!employee.phone && !employee.nationality && !employee.date_of_birth && !employee.gender) {
                  <p class="text-muted small mb-0">No contact details available.</p>
                }
              </div>
            </div>

            <!-- Target Locations Card -->
            @if (employee.target_locations?.length) {
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
                    @for (loc of employee.target_locations; track loc) {
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

            <!-- Salary Card -->
            @if (employee.salary_min || employee.salary_max) {
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
                    {{ employee.salary_currency }}
                    {{ employee.salary_min | number }}
                    @if (employee.salary_max) { <span style="color:var(--th-muted);font-size:.875rem">–</span> {{ employee.salary_max | number }} }
                  </div>
                  <div style="font-size:.75rem;color:var(--th-muted);margin-top:.25rem">
                    per {{ employee.salary_type }}
                  </div>
                </div>
              </div>
            }

            <!-- Languages Card -->
            @if (employee.languages?.length) {
              <div class="profile-section-card">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-info)">
                    <i class="bi bi-translate"></i>
                  </div>
                  <h6>Languages</h6>
                </div>
                <div class="profile-section-card__body">
                  @for (lang of employee.languages; track lang.language) {
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
            @if (employee.bio) {
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
                    {{ employee.bio }}
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
                        {{ employee.occupation || '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Industry</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ employee.industry || '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Experience</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ employee.years_experience != null ? employee.years_experience + ' years' : '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div style="padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                      border:1px solid var(--th-border)">
                      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;
                        color:var(--th-muted);font-weight:600;margin-bottom:.3rem">Job Title</div>
                      <div style="font-size:.875rem;font-weight:600;color:var(--th-text)">
                        {{ employee.job_title || '—' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Skills Card -->
            @if (employee.skills?.length) {
              <div class="profile-section-card">
                <div class="profile-section-card__header">
                  <div class="profile-section-card__header-icon"
                    style="background:var(--th-gradient-teal)">
                    <i class="bi bi-tools"></i>
                  </div>
                  <h6>Skills</h6>
                  <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                    {{ employee.skills!.length }} skills
                  </span>
                </div>
                <div class="profile-section-card__body">
                  <div class="d-flex flex-wrap gap-2">
                    @for (skill of employee.skills; track skill.skill_name) {
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
        @if (!employee.experience?.length) {
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
                {{ employee.experience!.length }} position{{ employee.experience!.length > 1 ? 's' : '' }}
              </span>
            </div>
            <div class="profile-section-card__body">
              <div class="exp-timeline">
                @for (exp of employee.experience; track $index) {
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
        @if (!employee.education?.length && !employee.certificates?.length) {
          <div class="empty-state">
            <div class="empty-state__icon" style="background:var(--th-gradient-success)">
              <i class="bi bi-mortarboard"></i>
            </div>
            <div class="empty-state__title">No education records</div>
            <div class="empty-state__description">Education and certifications will appear here once added.</div>
          </div>
        } @else {
          @if (employee.education?.length) {
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
                  @for (edu of employee.education; track $index) {
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

          @if (employee.certificates?.length) {
            <div class="profile-section-card">
              <div class="profile-section-card__header">
                <div class="profile-section-card__header-icon"
                  style="background:var(--th-gradient-warning)">
                  <i class="bi bi-patch-check-fill"></i>
                </div>
                <h6>Certificates</h6>
                <span style="margin-left:auto;font-size:.7rem;color:var(--th-muted)">
                  {{ employee.certificates!.length }} cert{{ employee.certificates!.length > 1 ? 's' : '' }}
                </span>
              </div>
              <div class="profile-section-card__body">
                <div class="row g-2">
                  @for (cert of employee.certificates; track $index) {
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
        @if (!employee.resume_url && !employee.intro_video_url) {
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
                @if (employee.resume_url) {
                  <a [href]="employee.resume_url" target="_blank" class="doc-card">
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
                @if (employee.intro_video_url) {
                  <a [href]="employee.intro_video_url" target="_blank" class="doc-card">
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
export class EmployeeProfileComponent {
  @Input() employee: Employee | null = null;

  activeTab = signal<Tab>('overview');

  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: 'bi-person-fill'       },
    { id: 'experience',  label: 'Experience',  icon: 'bi-briefcase-fill'    },
    { id: 'education',   label: 'Education',   icon: 'bi-mortarboard-fill'  },
    { id: 'documents',   label: 'Documents',   icon: 'bi-folder2-open'      },
  ];
}
