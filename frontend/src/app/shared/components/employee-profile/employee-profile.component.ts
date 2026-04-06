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
      <!-- ── Hero Band ───────────────────────────────────────────────── -->
      <div class="profile-hero mb-4">
        <div class="profile-hero__cover"></div>
        <div class="profile-hero__body d-flex align-items-end gap-4 flex-wrap">

          <!-- Avatar -->
          <div class="profile-hero__avatar-wrap">
            @if (employee.profile_photo_url) {
              <img [src]="employee.profile_photo_url" alt="Profile photo"
                class="profile-hero__avatar">
            } @else {
              <div class="profile-hero__avatar-placeholder">
                {{ employee.first_name[0] }}{{ employee.last_name[0] }}
              </div>
            }
          </div>

          <!-- Name + meta -->
          <div class="profile-hero__info flex-grow-1 pb-2">
            <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
              <h2 class="profile-hero__name mb-0">
                {{ employee.first_name }} {{ employee.last_name }}
              </h2>
              <span class="badge rounded-pill px-3 py-2"
                [class.badge-status-active]="employee.profile_status === 'active'"
                [class.badge-status-pending]="employee.profile_status === 'pending_edit'"
                [class.badge-status-inactive]="employee.profile_status === 'inactive'">
                {{ employee.profile_status | titlecase }}
              </span>
            </div>
            <p class="mb-0 text-white opacity-75 small">
              @if (employee.job_title) { {{ employee.job_title }} }
              @if (employee.job_title && employee.industry) { · }
              @if (employee.industry) { {{ employee.industry }} }
            </p>
            <div class="d-flex flex-wrap gap-3 mt-2 small text-white opacity-75">
              @if (employee.current_city || employee.current_country) {
                <span><i class="bi bi-geo-alt me-1"></i>{{ employee.current_city }}{{ employee.current_city && employee.current_country ? ', ' : '' }}{{ employee.current_country }}</span>
              }
              @if (employee.email) {
                <span><i class="bi bi-envelope me-1"></i>{{ employee.email }}</span>
              }
              @if (employee.years_experience != null) {
                <span><i class="bi bi-briefcase me-1"></i>{{ employee.years_experience }} yrs exp</span>
              }
            </div>
          </div>

          <!-- Quick actions (docs) -->
          <div class="d-flex gap-2 pb-2">
            @if (employee.resume_url) {
              <a [href]="employee.resume_url" target="_blank"
                class="btn btn-sm btn-light">
                <i class="bi bi-file-earmark-person me-1"></i>CV
              </a>
            }
            @if (employee.intro_video_url) {
              <a [href]="employee.intro_video_url" target="_blank"
                class="btn btn-sm btn-light">
                <i class="bi bi-camera-video me-1"></i>Video
              </a>
            }
            @if (employee.linkedin_url) {
              <a [href]="employee.linkedin_url" target="_blank"
                class="btn btn-sm btn-light">
                <i class="bi bi-linkedin me-1"></i>LinkedIn
              </a>
            }
          </div>
        </div>
      </div>

      <!-- ── Tab Nav ────────────────────────────────────────────────── -->
      <div class="profile-tabs">
        @for (tab of tabs; track tab.id) {
          <button class="profile-tab" [class.active]="activeTab() === tab.id"
            (click)="activeTab.set(tab.id)">
            <i [class]="'bi ' + tab.icon"></i>{{ tab.label }}
          </button>
        }
      </div>

      <!-- ── TAB: Overview ─────────────────────────────────────────── -->
      @if (activeTab() === 'overview') {
        <div class="row g-4">

          <!-- Left column -->
          <div class="col-md-4">

            <!-- Contact -->
            <div class="card p-3 mb-3">
              <h6 class="card-section-header">
                <i class="bi bi-person-lines-fill"></i>Contact
              </h6>
              @if (employee.phone) {
                <div class="d-flex gap-2 mb-2 small">
                  <i class="bi bi-telephone text-muted"></i>
                  <span>{{ employee.phone }}</span>
                </div>
              }
              @if (employee.nationality) {
                <div class="d-flex gap-2 mb-2 small">
                  <i class="bi bi-flag text-muted"></i>
                  <span>{{ employee.nationality }}</span>
                </div>
              }
              @if (employee.date_of_birth) {
                <div class="d-flex gap-2 small">
                  <i class="bi bi-calendar3 text-muted"></i>
                  <span>{{ employee.date_of_birth | date:'mediumDate' }}</span>
                </div>
              }
            </div>

            <!-- Target Locations -->
            @if (employee.target_locations?.length) {
              <div class="card p-3 mb-3">
              <h6 class="card-section-header card-section-header--success">
                <i class="bi bi-pin-map"></i>Target Locations
              </h6>
                <div class="d-flex flex-wrap gap-1">
                  @for (loc of employee.target_locations; track loc) {
                    <span class="badge bg-light text-dark border">{{ loc }}</span>
                  }
                </div>
              </div>
            }

            <!-- Salary -->
            @if (employee.salary_min || employee.salary_max) {
              <div class="card p-3 mb-3">
              <h6 class="card-section-header card-section-header--warning">
                <i class="bi bi-cash-coin"></i>Salary Expectation
              </h6>
                <div class="fw-semibold small">
                  {{ employee.salary_currency }}
                  {{ employee.salary_min | number }}
                  @if (employee.salary_max) { – {{ employee.salary_max | number }} }
                  <span class="text-muted fw-normal">/ {{ employee.salary_type }}</span>
                </div>
              </div>
            }

            <!-- Languages -->
            @if (employee.languages?.length) {
              <div class="card p-3">
              <h6 class="card-section-header card-section-header--info">
                <i class="bi bi-translate"></i>Languages
              </h6>
                @for (lang of employee.languages; track lang.language) {
                  <div class="d-flex justify-content-between small mb-1">
                    <span>{{ lang.language }}</span>
                    <span class="badge bg-light text-dark border">{{ lang.proficiency | titlecase }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Right column -->
          <div class="col-md-8">

            <!-- Bio -->
            @if (employee.bio) {
              <div class="card p-4 mb-3">
              <h6 class="card-section-header card-section-header--purple">
                <i class="bi bi-chat-quote"></i>Bio
              </h6>
                <p class="mb-0 small lh-lg">{{ employee.bio }}</p>
              </div>
            }

            <!-- Professional -->
            <div class="card p-4 mb-3">
              <h6 class="card-section-header card-section-header--info">
                <i class="bi bi-briefcase"></i>Professional
              </h6>
              <div class="row g-3 small">
                <div class="col-md-6">
                  <span class="text-muted">Occupation:</span>
                  <strong class="ms-1">{{ employee.occupation || '—' }}</strong>
                </div>
                <div class="col-md-6">
                  <span class="text-muted">Industry:</span>
                  <strong class="ms-1">{{ employee.industry || '—' }}</strong>
                </div>
                <div class="col-md-6">
                  <span class="text-muted">Experience:</span>
                  <strong class="ms-1">{{ employee.years_experience != null ? employee.years_experience + ' years' : '—' }}</strong>
                </div>
                <div class="col-md-6">
                  <span class="text-muted">Gender:</span>
                  <strong class="ms-1">{{ employee.gender ? (employee.gender | titlecase) : '—' }}</strong>
                </div>
              </div>
            </div>

            <!-- Skills -->
            @if (employee.skills?.length) {
              <div class="card p-4">
              <h6 class="card-section-header card-section-header--teal">
                <i class="bi bi-tools"></i>Skills
              </h6>
              <div class="d-flex flex-wrap gap-2">
                @for (skill of employee.skills; track skill.skill_name) {
                  <span class="tag-chip tag-chip--skill">
                    {{ skill.skill_name }}
                    @if (skill.proficiency) {
                      <span class="ms-1 opacity-75 small">· {{ skill.proficiency }}</span>
                    }
                  </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- ── TAB: Experience ────────────────────────────────────────── -->
      @if (activeTab() === 'experience') {
        @if (!employee.experience?.length) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-briefcase" style="font-size:2.5rem;opacity:.3"></i>
            <p class="mt-3">No work experience listed.</p>
          </div>
        } @else {
          <div class="card p-4">
            @for (exp of employee.experience; track $index) {
              <div class="d-flex gap-3 mb-4" [class.pb-4]="!$last" [class.border-bottom]="!$last">
                <div class="flex-shrink-0 mt-1">
                  <div class="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center
                    justify-content-center" style="width:36px;height:36px">
                    <i class="bi bi-building text-primary small"></i>
                  </div>
                </div>
                <div class="flex-grow-1">
                  <div class="fw-semibold">{{ exp.job_title }}</div>
                  <div class="text-muted small">
                    {{ exp.company_name }}{{ exp.location ? ' · ' + exp.location : '' }}
                  </div>
                  <div class="text-muted small mb-2">
                    <i class="bi bi-calendar3 me-1"></i>
                    {{ exp.start_date | date:'MMM yyyy' }} —
                    {{ exp.end_date ? (exp.end_date | date:'MMM yyyy') : 'Present' }}
                  </div>
                  @if (exp.description) {
                    <p class="small mb-0 text-body">{{ exp.description }}</p>
                  }
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ── TAB: Education ────────────────────────────────────────── -->
      @if (activeTab() === 'education') {
        @if (!employee.education?.length && !employee.certificates?.length) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-mortarboard" style="font-size:2.5rem;opacity:.3"></i>
            <p class="mt-3">No education or certificates listed.</p>
          </div>
        } @else {
          @if (employee.education?.length) {
            <div class="card p-4 mb-4">
              <h6 class="card-section-header card-section-header--success">
                <i class="bi bi-mortarboard"></i>Education
              </h6>
              @for (edu of employee.education; track $index) {
                <div class="d-flex gap-3 mb-3" [class.pb-3]="!$last" [class.border-bottom]="!$last">
                  <div class="flex-shrink-0 mt-1">
                    <div class="rounded-circle bg-success bg-opacity-10 d-flex align-items-center
                      justify-content-center" style="width:36px;height:36px">
                      <i class="bi bi-book text-success small"></i>
                    </div>
                  </div>
                  <div>
                    <div class="fw-semibold">
                      {{ edu.degree }}@if(edu.field_of_study) { in {{ edu.field_of_study }} }
                    </div>
                    <div class="text-muted small">
                      {{ edu.institution }}{{ edu.location ? ' · ' + edu.location : '' }}
                    </div>
                    @if (edu.start_year || edu.end_year) {
                      <div class="text-muted small">
                        <i class="bi bi-calendar3 me-1"></i>
                        {{ edu.start_year }} — {{ edu.end_year || 'Present' }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (employee.certificates?.length) {
            <div class="card p-4">
              <h6 class="card-section-header card-section-header--warning">
                <i class="bi bi-patch-check"></i>Certificates
              </h6>
              <div class="row g-2">
                @for (cert of employee.certificates; track $index) {
                  <div class="col-md-6">
                    <div class="border rounded p-3 d-flex align-items-center gap-3">
                      <i class="bi bi-award text-warning fs-4 flex-shrink-0"></i>
                      <div class="flex-grow-1 overflow-hidden">
                        <div class="fw-semibold small text-truncate">{{ cert.name }}</div>
                        @if (cert.issuer) {
                          <div class="text-muted small">{{ cert.issuer }}</div>
                        }
                      </div>
                      @if (cert.file_url) {
                        <a [href]="cert.file_url" target="_blank"
                          class="btn btn-sm btn-outline-primary flex-shrink-0 py-0">
                          <i class="bi bi-eye"></i>
                        </a>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      }

      <!-- ── TAB: Documents ────────────────────────────────────────── -->
      @if (activeTab() === 'documents') {
        @if (!employee.resume_url && !employee.intro_video_url) {
          <div class="text-center py-5 text-muted">
            <i class="bi bi-folder2-open" style="font-size:2.5rem;opacity:.3"></i>
            <p class="mt-3">No documents uploaded.</p>
          </div>
        } @else {
          <div class="row g-3">
            @if (employee.resume_url) {
              <div class="col-md-4">
                <div class="card p-4 text-center h-100">
                  <i class="bi bi-file-earmark-person text-primary mb-2" style="font-size:2.5rem"></i>
                  <div class="fw-semibold mb-3">Curriculum Vitae</div>
                  <a [href]="employee.resume_url" target="_blank"
                    class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-download me-1"></i>Download CV
                  </a>
                </div>
              </div>
            }
            @if (employee.intro_video_url) {
              <div class="col-md-4">
                <div class="card p-4 text-center h-100">
                  <i class="bi bi-camera-video text-danger mb-2" style="font-size:2.5rem"></i>
                  <div class="fw-semibold mb-3">Intro Video</div>
                  <a [href]="employee.intro_video_url" target="_blank"
                    class="btn btn-outline-danger btn-sm">
                    <i class="bi bi-play-circle me-1"></i>Watch Video
                  </a>
                </div>
              </div>
            }
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
    { id: 'overview',    label: 'Overview',    icon: 'bi-person'         },
    { id: 'experience',  label: 'Experience',  icon: 'bi-briefcase'      },
    { id: 'education',   label: 'Education',   icon: 'bi-mortarboard'    },
    { id: 'documents',   label: 'Documents',   icon: 'bi-folder2-open'   },
  ];
}
