// src/app/features/admin/recruiter-profile/recruiter-profile-page.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Recruiter, ShortlistEntry } from '../../../core/models/recruiter.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-recruiter-profile-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  template: `
    <!-- Back + actions row -->
    <div class="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
      <a routerLink="/admin/recruiters" class="back-btn">
        <i class="bi bi-arrow-left"></i> Back to Recruiters
      </a>
      @if (recruiter) {
        <div class="tbl-actions">
          <a [routerLink]="['/admin/recruiters']"
             [queryParams]="{ editId: recruiter.id }"
             class="tbl-actions__btn tbl-actions__btn--edit"
             title="Edit recruiter in admin panel">
            <i class="bi bi-pencil me-1"></i> Edit
          </a>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn tbl-actions__btn--token"
            (click)="resendCredentials()">
            <i class="bi bi-envelope me-1"></i>
            Resend Credentials
          </button>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
            (click)="deleteRecruiter()" title="Delete recruiter">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      }
    </div>

    @if (loadError) {
      <div class="alert alert-danger">{{ loadError }}</div>
    } @else if (!recruiter) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading recruiter…</div>
      </div>
    } @else {

      <!-- ── Hero ──────────────────────────────────────────────────────── -->
      <div class="rp-hero mb-4">
        <div class="rp-hero__cover"></div>
        <div class="rp-hero__body">
          <div class="rp-hero__avatar-wrap">
            <div class="rp-hero__avatar">
              {{ recruiter.contact_name[0].toUpperCase() }}
            </div>
          </div>

          <div class="rp-hero__info">
            <div class="rp-hero__name-row">
              <h2 class="rp-hero__name">{{ recruiter.contact_name }}</h2>
              @if (recruiter.recruiter_number) {
                <span class="autocode-badge autocode-badge--lg">{{ recruiter.recruiter_number }}</span>
              }
              <span class="rp-hero__status-badge"
                [class.rp-hero__status-badge--active]="recruiter.is_active"
                [class.rp-hero__status-badge--inactive]="!recruiter.is_active">
                <i class="bi"
                  [class.bi-shield-fill-check]="recruiter.is_active"
                  [class.bi-shield-fill-x]="!recruiter.is_active"></i>
                {{ recruiter.is_active ? 'Active' : 'Inactive' }}
              </span>
              @if (recruiter.free_account) {
                <span class="badge bg-info text-dark ms-1">Free Account</span>
              }
            </div>

            @if (recruiter.company_name) {
              <div class="rp-hero__company">
                <i class="bi bi-building-fill me-1"></i>{{ recruiter.company_name }}
                @if (recruiter.type === 'recruitment_agency') {
                  <span class="badge bg-purple ms-2" style="background:#6f42c1">Recruitment Agency</span>
                }
              </div>
            }

            <div class="rp-hero__chips">
              <span class="rp-hero__chip">
                <i class="bi bi-envelope-fill"></i>{{ recruiter.email }}
              </span>
              @if (recruiter.phone) {
                <span class="rp-hero__chip">
                  <i class="bi bi-telephone-fill"></i>{{ recruiter.phone }}
                </span>
              }
              <span class="rp-hero__chip" [class.text-danger]="isExpired(recruiter.access_expires_at)">
                <i class="bi bi-clock"></i>
                Access expires: {{ recruiter.access_expires_at | date:'dd MMM yyyy, HH:mm' }}
                @if (isExpired(recruiter.access_expires_at)) {
                  <span class="badge bg-danger ms-1">Expired</span>
                }
              </span>
              <span class="rp-hero__chip">
                <i class="bi bi-calendar3"></i>Joined {{ recruiter.created_at | date:'dd MMM yyyy' }}
              </span>
            </div>
          </div>

          <div class="rp-hero__stats">
            <div class="rp-hero__stat">
              <span class="rp-hero__stat-num">{{ shortlist.length }}</span>
              <span class="rp-hero__stat-label">Shortlisted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Row 1: Contact + Company ───────────────────────────────────── -->
      <div class="row g-3 mb-3">

        <!-- Contact Details -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-person-badge-fill rp-info-card__icon rp-info-card__icon--primary"></i>
              <span>Contact Details</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-person"></i>
                <div>
                  <div class="rp-info-card__label">Full Name</div>
                  <div class="rp-info-card__value">{{ recruiter.contact_name }}</div>
                </div>
              </div>
              @if (recruiter.contact_job_title) {
                <div class="rp-info-card__row">
                  <i class="bi bi-person-badge"></i>
                  <div>
                    <div class="rp-info-card__label">Job Title</div>
                    <div class="rp-info-card__value">{{ recruiter.contact_job_title }}</div>
                  </div>
                </div>
              }
              <div class="rp-info-card__row">
                <i class="bi bi-envelope"></i>
                <div>
                  <div class="rp-info-card__label">Email</div>
                  <div class="rp-info-card__value text-break">{{ recruiter.email }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-telephone"></i>
                <div>
                  <div class="rp-info-card__label">Phone</div>
                  <div class="rp-info-card__value">{{ recruiter.phone || '—' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-whatsapp"></i>
                <div>
                  <div class="rp-info-card__label">WhatsApp</div>
                  <div class="rp-info-card__value">{{ recruiter.whatsapp_number || '—' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Company Details -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-building-fill rp-info-card__icon rp-info-card__icon--info"></i>
              <span>Company Details</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-building"></i>
                <div>
                  <div class="rp-info-card__label">Company Name</div>
                  <div class="rp-info-card__value">{{ recruiter.company_name || '—' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-geo-alt"></i>
                <div>
                  <div class="rp-info-card__label">Location</div>
                  <div class="rp-info-card__value">
                    @if (recruiter.company_city || recruiter.company_country) {
                      {{ companyLocation }}
                    } @else {
                      —
                    }
                  </div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-globe"></i>
                <div>
                  <div class="rp-info-card__label">Website</div>
                  <div class="rp-info-card__value">
                    @if (recruiter.company_website) {
                      <a [href]="recruiter.company_website" target="_blank" rel="noopener"
                        class="text-break">{{ recruiter.company_website }}</a>
                    } @else {
                      —
                    }
                  </div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-briefcase"></i>
                <div>
                  <div class="rp-info-card__label">Industry</div>
                  <div class="rp-info-card__value">{{ recruiter.industry || '—' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-people"></i>
                <div>
                  <div class="rp-info-card__label">Company Size</div>
                  <div class="rp-info-card__value">{{ recruiter.company_size || '—' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Row 2: Sponsor Licence + Hiring Preferences ───────────────── -->
      <div class="row g-3 mb-3">

        <!-- Sponsor Licence -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-patch-check-fill rp-info-card__icon rp-info-card__icon--success"></i>
              <span>Sponsor Licence</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-card-checklist"></i>
                <div>
                  <div class="rp-info-card__label">Has Sponsor Licence</div>
                  <div class="rp-info-card__value">
                    @if (recruiter.has_sponsor_licence === 'yes') {
                      <span class="badge bg-success">Yes</span>
                    } @else if (recruiter.has_sponsor_licence === 'no') {
                      <span class="badge bg-secondary">No</span>
                    } @else if (recruiter.has_sponsor_licence === 'applied') {
                      <span class="badge bg-warning text-dark">Applied</span>
                    } @else if (recruiter.has_sponsor_licence === 'unknown') {
                      <span class="badge bg-secondary">Unknown</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </div>
                </div>
              </div>
              @if (recruiter.has_sponsor_licence === 'yes') {
                <div class="rp-info-card__row">
                  <i class="bi bi-upc-scan"></i>
                  <div>
                    <div class="rp-info-card__label">Licence Number</div>
                    <div class="rp-info-card__value">{{ recruiter.sponsor_licence_number || '—' }}</div>
                  </div>
                </div>
                <div class="rp-info-card__row">
                  <i class="bi bi-star-half"></i>
                  <div>
                    <div class="rp-info-card__label">Licence Rating</div>
                    <div class="rp-info-card__value">
                      @if (recruiter.licence_rating === 'A') {
                        <span class="badge bg-success">A — Satisfactory</span>
                      } @else if (recruiter.licence_rating === 'B') {
                        <span class="badge bg-warning text-dark">B — Action Plan</span>
                      } @else {
                        {{ recruiter.licence_rating || '—' }}
                      }
                    </div>
                  </div>
                </div>
                <div class="rp-info-card__row">
                  <i class="bi bi-shield-check"></i>
                  <div>
                    <div class="rp-info-card__label">Verified by Admin</div>
                    <div class="rp-info-card__value">
                      @if (recruiter.licence_verified) {
                        <span class="badge bg-success"><i class="bi bi-check-lg me-1"></i>Verified</span>
                      } @else {
                        <span class="badge bg-secondary">Not Verified</span>
                      }
                    </div>
                  </div>
                </div>
                @if (recruiter.sponsor_licence_countries?.length) {
                  <div class="rp-info-card__row">
                    <i class="bi bi-flag"></i>
                    <div>
                      <div class="rp-info-card__label">Sponsor Licence Countries</div>
                      <div class="rp-info-card__value">
                        <div class="d-flex flex-wrap gap-1 mt-1">
                          @for (c of recruiter.sponsor_licence_countries; track c) {
                            <span class="badge bg-primary">{{ c }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- Hiring Preferences -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-people-fill rp-info-card__icon rp-info-card__icon--purple"></i>
              <span>Hiring Preferences</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-graph-up"></i>
                <div>
                  <div class="rp-info-card__label">Typical Hires Per Year</div>
                  <div class="rp-info-card__value">{{ recruiter.hires_per_year || '—' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-tags"></i>
                <div>
                  <div class="rp-info-card__label">Job Types Offered</div>
                  <div class="rp-info-card__value">
                    @if (recruiter.job_types?.length) {
                      <div class="d-flex flex-wrap gap-1 mt-1">
                        @for (j of recruiter.job_types; track j) {
                          <span class="badge bg-secondary">{{ j }}</span>
                        }
                      </div>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </div>
                </div>
              </div>
              @if (recruiter.target_nationalities?.length) {
                <div class="rp-info-card__row">
                  <i class="bi bi-globe2"></i>
                  <div>
                    <div class="rp-info-card__label">Target Nationalities</div>
                    <div class="rp-info-card__value">
                      <div class="d-flex flex-wrap gap-1 mt-1">
                        @for (n of recruiter.target_nationalities; track n) {
                          <span class="badge bg-info text-dark">{{ n }}</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

      </div>

      <!-- ── Agency Details (agency only) ───────────────────────────────── -->
      @if (recruiter.type === 'recruitment_agency') {
        <div class="row g-3 mb-3">
          <div class="col-12">
            <div class="rp-info-card">
              <div class="rp-info-card__header">
                <i class="bi bi-briefcase-fill rp-info-card__icon rp-info-card__icon--purple"></i>
                <span>Recruitment Agency Details</span>
              </div>
              <div class="row g-0">
                <div class="col-md-6">
                  <div class="rp-info-card__rows">
                    <div class="rp-info-card__row">
                      <i class="bi bi-tags"></i>
                      <div>
                        <div class="rp-info-card__label">Sectors They Recruit For</div>
                        <div class="rp-info-card__value">
                          @if (recruiter.sectors_recruit_for?.length) {
                            <div class="d-flex flex-wrap gap-1 mt-1">
                              @for (s of recruiter.sectors_recruit_for; track s) {
                                <span class="badge bg-secondary">{{ s }}</span>
                              }
                            </div>
                          } @else {
                            <span class="text-muted">—</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="rp-info-card__rows">
                    <div class="rp-info-card__row">
                      <i class="bi bi-globe2"></i>
                      <div>
                        <div class="rp-info-card__label">Countries They Place In</div>
                        <div class="rp-info-card__value">
                          @if (recruiter.countries_place_in?.length) {
                            <div class="d-flex flex-wrap gap-1 mt-1">
                              @for (c of recruiter.countries_place_in; track c) {
                                <span class="badge bg-info text-dark">{{ c }}</span>
                              }
                            </div>
                          } @else {
                            <span class="text-muted">—</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ── Row 3: Account Info + Admin Notes ──────────────────────────── -->
      <div class="row g-3 mb-4">

        <!-- Account Info -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-shield-lock-fill rp-info-card__icon rp-info-card__icon--info"></i>
              <span>Account Info</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row">
                <i class="bi bi-toggle-on"></i>
                <div>
                  <div class="rp-info-card__label">Status</div>
                  <div class="rp-info-card__value">
                    <span class="badge rounded-pill"
                      [class.badge-status-active]="recruiter.is_active"
                      [class.badge-status-inactive]="!recruiter.is_active">
                      {{ recruiter.is_active ? 'Active' : 'Inactive' }}
                    </span>
                    @if (recruiter.account_status && recruiter.account_status !== 'active') {
                      <span class="badge rounded-pill ms-1"
                        [class.bg-warning]="recruiter.account_status === 'pending'"
                        [class.bg-danger]="recruiter.account_status === 'suspended'">
                        {{ recruiter.account_status | titlecase }}
                      </span>
                    }
                  </div>
                </div>
              </div>
              @if (recruiter.access_start_date) {
                <div class="rp-info-card__row">
                  <i class="bi bi-calendar-event"></i>
                  <div>
                    <div class="rp-info-card__label">Access Start</div>
                    <div class="rp-info-card__value">{{ recruiter.access_start_date | date:'dd MMM yyyy' }}</div>
                  </div>
                </div>
              }
              <div class="rp-info-card__row">
                <i class="bi bi-calendar-x"></i>
                <div>
                  <div class="rp-info-card__label">Access Expires</div>
                  <div class="rp-info-card__value" [class.text-danger]="isExpired(recruiter.access_expires_at)">
                    {{ recruiter.access_expires_at | date:'dd MMM yyyy, HH:mm' }}
                    @if (isExpired(recruiter.access_expires_at)) {
                      <span class="badge bg-danger ms-1">Expired</span>
                    }
                  </div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-calendar-check"></i>
                <div>
                  <div class="rp-info-card__label">Registered</div>
                  <div class="rp-info-card__value">{{ recruiter.created_at | date:'dd MMM yyyy, HH:mm' }}</div>
                </div>
              </div>
              <div class="rp-info-card__row">
                <i class="bi bi-gift"></i>
                <div>
                  <div class="rp-info-card__label">Free Account</div>
                  <div class="rp-info-card__value">
                    @if (recruiter.free_account) {
                      <span class="badge bg-info text-dark">Yes</span>
                    } @else {
                      <span class="text-muted">No</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Notes -->
        <div class="col-md-6">
          <div class="rp-info-card h-100">
            <div class="rp-info-card__header">
              <i class="bi bi-journal-text rp-info-card__icon rp-info-card__icon--warning"></i>
              <span>Admin Notes</span>
            </div>
            <div class="rp-info-card__rows">
              <div class="rp-info-card__row align-items-start">
                <i class="bi bi-sticky mt-1"></i>
                <div class="flex-grow-1">
                  @if (recruiter.admin_notes) {
                    <div class="rp-info-card__value" style="white-space:pre-wrap">{{ recruiter.admin_notes }}</div>
                  } @else {
                    <div class="text-muted fst-italic">No notes recorded.</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Shortlisted Candidates ─────────────────────────────────────── -->
      <div class="rp-shortlist-section">
        <div class="rp-shortlist-section__header">
          <div class="rp-shortlist-section__title">
            <i class="bi bi-bookmark-heart-fill rp-shortlist-section__icon"></i>
            <span>Shortlisted Candidates</span>
          </div>
          <span class="rp-shortlist-section__count">{{ shortlist.length }}</span>
        </div>

        <div class="rp-shortlist-section__body">
          @if (shortlistLoading) {
            <div class="loading-state py-4">
              <div class="spinner-border spinner-border-sm"></div>
              <div class="loading-state__text">Loading shortlist…</div>
            </div>
          } @else if (shortlist.length === 0) {
            <div class="rp-shortlist-section__empty">
              <i class="bi bi-bookmark"></i>
              <div>No candidates shortlisted yet.</div>
            </div>
          } @else {
            <div class="sl-list">
              @for (entry of shortlist; track entry.shortlist_id) {
                <div class="sl-row">
                  <div class="sl-row__avatar-wrap">
                    @if (entry.profile_photo_url) {
                      <img [src]="entry.profile_photo_url" alt=""
                        class="sl-row__avatar"
                        (error)="$any($event.target).src=''">
                    } @else {
                      <div class="sl-row__avatar-placeholder">
                        {{ entry.first_name[0] }}{{ entry.last_name[0] }}
                      </div>
                    }
                  </div>
                  <div class="sl-row__main">
                    <div class="sl-row__name">{{ entry.first_name }} {{ entry.last_name }}</div>
                    <div class="sl-row__email">{{ entry.email }}</div>
                    <div class="sl-row__chips">
                      @if (entry.job_title || entry.occupation) {
                        <span class="sl-chip sl-chip--role">
                          <i class="bi bi-briefcase-fill"></i>{{ entry.job_title || entry.occupation }}
                        </span>
                      }
                      @if (entry.industry) {
                        <span class="sl-chip sl-chip--industry">
                          <i class="bi bi-building"></i>{{ entry.industry }}
                        </span>
                      }
                      @if (entry.current_country) {
                        <span class="sl-chip sl-chip--location">
                          <i class="bi bi-geo-alt-fill"></i>{{ entry.current_city ? entry.current_city + ', ' : '' }}{{ entry.current_country }}
                        </span>
                      }
                      @if (entry.years_experience != null) {
                        <span class="sl-chip sl-chip--exp">
                          <i class="bi bi-clock-history"></i>{{ entry.years_experience }} yrs exp
                        </span>
                      }
                    </div>
                  </div>
                  <div class="sl-row__end">
                    <span class="sl-row__date">
                      <i class="bi bi-bookmark-fill"></i>{{ entry.shortlisted_at | date:'dd MMM yyyy' }}
                    </span>
                    <a [routerLink]="['/admin/candidates', entry.candidate_id]"
                      class="sl-row__view-btn">
                      <i class="bi bi-eye me-1"></i>View
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

    }
  `,
})
export class RecruiterProfilePageComponent implements OnInit {
  recruiterId = '';
  recruiter: Recruiter | null = null;
  shortlist: ShortlistEntry[] = [];
  loadError = '';
  shortlistLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recruiterSvc: RecruiterService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.recruiterId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.recruiterId) { this.loadError = 'Invalid recruiter ID.'; return; }
    this.load();
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  get companyLocation(): string {
    if (!this.recruiter) return '—';
    return [this.recruiter.company_city, this.recruiter.company_country]
      .filter(Boolean).join(', ');
  }

  private load(): void {
    this.recruiterSvc.getById(this.recruiterId).subscribe({
      next: (res) => {
        this.recruiter = res.recruiter;
        this.loadShortlist();
      },
      error: (err) => (this.loadError = err?.error?.message ?? 'Failed to load recruiter.'),
    });
  }

  private loadShortlist(): void {
    this.shortlistLoading = true;
    this.recruiterSvc.getShortlistById(this.recruiterId).subscribe({
      next: (res) => { this.shortlist = res.shortlist; this.shortlistLoading = false; },
      error: () => { this.shortlistLoading = false; },
    });
  }

  // ── Resend credentials ─────────────────────────────────────────────────────
  async resendCredentials(): Promise<void> {
    if (!this.recruiter) return;
    const ok = await this.confirm.confirm({
      title: 'Resend Credentials',
      message: `Resend login credentials to ${this.recruiter.email}?`,
      confirmLabel: 'Send',
      confirmClass: 'btn-primary',
    });
    if (!ok.confirmed) return;
    this.recruiterSvc.resendCredentials(this.recruiterId).subscribe({
      next: () => this.toast.success('Credentials sent to ' + this.recruiter!.email),
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to resend credentials'),
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async deleteRecruiter(): Promise<void> {
    if (!this.recruiter) return;
    const ok = await this.confirm.confirm({
      title: 'Delete Recruiter',
      message: `Delete ${this.recruiter.contact_name}? This action is irreversible.`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    });
    if (!ok.confirmed) return;
    this.recruiterSvc.delete(this.recruiterId).subscribe({
      next: () => {
        this.toast.success('Recruiter deleted');
        window.history.back();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Delete failed'),
    });
  }
}

