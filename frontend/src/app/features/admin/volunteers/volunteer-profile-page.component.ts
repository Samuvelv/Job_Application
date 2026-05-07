// src/app/features/admin/volunteers/volunteer-profile-page.component.ts
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VolunteerService } from '../../../core/services/volunteer.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Volunteer } from '../../../core/models/volunteer.model';

type Tab = 'overview' | 'contact';

@Component({
  selector: 'app-volunteer-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Back + actions -->
    <div class="d-flex align-items-center justify-content-between mb-4 gap-2 flex-wrap">
      <a routerLink="/admin/volunteers" class="back-btn">
        <i class="bi bi-arrow-left"></i> Back to Volunteers
      </a>
      @if (volunteer) {
        <div class="tbl-actions">
          <a class="tbl-actions__btn tbl-actions__btn--edit"
            [routerLink]="['/admin/volunteers/create']"
            [queryParams]="{edit: volunteer.id}">
            <i class="bi bi-pencil me-1"></i> Edit
          </a>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn"
            [class.tbl-actions__btn--token]="volunteer.availability !== 'Active'"
            [class.tbl-actions__btn--danger]="volunteer.availability === 'Active'"
            (click)="toggleAvailability()"
            [disabled]="toggling">
            @if (toggling) {
              <span class="spinner-border spinner-border-sm"></span>
            } @else if (volunteer.availability === 'Active') {
              <i class="bi bi-pause-circle me-1"></i> Deactivate
            } @else {
              <i class="bi bi-play-circle me-1"></i> Activate
            }
          </button>
          <div class="tbl-actions__sep"></div>
          <button class="tbl-actions__btn tbl-actions__btn--danger tbl-actions__btn--icon"
            (click)="deleteVolunteer()" title="Delete volunteer">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      }
    </div>

    @if (loadError) {
      <div class="alert alert-danger">{{ loadError }}</div>

    } @else if (!volunteer) {
      <div class="loading-state">
        <div class="spinner-border"></div>
        <div class="loading-state__text">Loading volunteer profile…</div>
      </div>

    } @else {

      <!-- ── Hero ─────────────────────────────────────────────── -->
      <div class="vp-hero mb-4">
        <div class="vp-hero__cover"></div>
        <div class="vp-hero__body">

          <!-- Avatar -->
          <div class="vp-hero__avatar-wrap">
            @if (volunteer.photo_url) {
              <img [src]="volunteer.photo_url" [alt]="volunteer.name" class="vp-hero__avatar-img">
            } @else {
              <div class="vp-hero__avatar-initials">{{ initials(volunteer.name) }}</div>
            }
            <span class="vp-hero__avail-dot"
              [class.vp-hero__avail-dot--active]="volunteer.availability === 'Active'"
              [title]="volunteer.availability ?? 'Unknown'">
            </span>
          </div>

          <!-- Name / meta -->
          <div class="vp-hero__info">
            <div class="vp-hero__name-row">
              <h2 class="vp-hero__name">{{ volunteer.name }}</h2>
              <span class="vp-avail-badge"
                [class.vp-avail-badge--active]="volunteer.availability === 'Active'"
                [class.vp-avail-badge--inactive]="volunteer.availability !== 'Active'">
                <i class="bi bi-circle-fill" style="font-size:.4rem"></i>
                {{ volunteer.availability === 'Active' ? 'Active' : 'Unavailable' }}
              </span>
            </div>

            @if (volunteer.role) {
              <div class="vp-hero__role">{{ volunteer.role }}</div>
            }

            <!-- Meta chips -->
            <div class="vp-hero__chips mt-2">
              @if (volunteer.nationality) {
                <span class="vp-chip">
                  <i class="bi bi-flag-fill"></i>
                  {{ flagOf(volunteer.nationality) }} {{ volunteer.nationality }}
                </span>
              }
              @if (volunteer.country_placed) {
                <span class="vp-chip vp-chip--placed">
                  <i class="bi bi-briefcase-fill"></i>
                  {{ flagOf(volunteer.country_placed) }} {{ volunteer.country_placed }}
                </span>
              }
              @if (volunteer.year_placed) {
                <span class="vp-chip">
                  <i class="bi bi-calendar3"></i> Placed {{ volunteer.year_placed }}
                </span>
              }
              @if (volunteer.company_joined) {
                <span class="vp-chip vp-chip--company">
                  <i class="bi bi-building"></i> {{ volunteer.company_joined }}
                </span>
              }
              @if (volunteer.email) {
                <a [href]="'mailto:' + volunteer.email" class="vp-chip vp-chip--link">
                  <i class="bi bi-envelope-fill"></i> {{ volunteer.email }}
                </a>
              }
              @if (volunteer.phone) {
                <span class="vp-chip">
                  <i class="bi bi-telephone-fill"></i> {{ volunteer.phone }}
                </span>
              }
            </div>
          </div>

          <!-- Stats -->
          <div class="vp-hero__stats">
            <div class="vp-stat">
              <div class="vp-stat__val">{{ volunteer.candidates_helped ?? 0 }}</div>
              <div class="vp-stat__label">Helped</div>
            </div>
            <div class="vp-stat">
              <div class="vp-stat__val">{{ volunteer.languages?.length ?? 0 }}</div>
              <div class="vp-stat__label">Languages</div>
            </div>
            <div class="vp-stat">
              <div class="vp-stat__val">{{ volunteer.created_at | date:'yyyy' }}</div>
              <div class="vp-stat__label">Since</div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Tabs ──────────────────────────────────────────────── -->
      <div class="vp-tabs mb-4">
        <button class="vp-tab" [class.vp-tab--active]="activeTab() === 'overview'"
          (click)="activeTab.set('overview')">
          <i class="bi bi-person-lines-fill"></i> Overview
        </button>
        <button class="vp-tab" [class.vp-tab--active]="activeTab() === 'contact'"
          (click)="activeTab.set('contact')">
          <i class="bi bi-headset"></i> Contact &amp; Record
        </button>
      </div>

      <!-- ── Tab: Overview ──────────────────────────────────────── -->
      @if (activeTab() === 'overview') {
        <div class="vp-grid">

          <!-- Left col -->
          <div class="vp-col">

            @if (volunteer.success_story) {
              <div class="section-card mb-3">
                <div class="section-card__header">
                  <span class="section-card__title"><i class="bi bi-chat-quote-fill"></i> Success Story</span>
                </div>
                <div class="section-card__body">
                  <p class="vp-story-text">{{ volunteer.success_story }}</p>
                </div>
              </div>
            }

            @if (volunteer.languages?.length) {
              <div class="section-card mb-3">
                <div class="section-card__header">
                  <span class="section-card__title"><i class="bi bi-translate"></i> Languages Spoken</span>
                </div>
                <div class="section-card__body">
                  <div class="vp-lang-list">
                    @for (lang of volunteer.languages ?? []; track lang) {
                      <span class="vp-lang-tag">{{ lang }}</span>
                    }
                  </div>
                </div>
              </div>
            }

            @if (volunteer.notes) {
              <div class="section-card mb-3">
                <div class="section-card__header">
                  <span class="section-card__title"><i class="bi bi-sticky-fill"></i> Admin Notes</span>
                </div>
                <div class="section-card__body">
                  <p class="small text-muted mb-0">{{ volunteer.notes }}</p>
                </div>
              </div>
            }

            @if (!volunteer.success_story && !volunteer.languages?.length && !volunteer.notes) {
              <div class="vp-empty-state">
                <i class="bi bi-journal-text vp-empty-state__icon"></i>
                <div>No overview information recorded yet.</div>
              </div>
            }

          </div>

          <!-- Right col -->
          <div class="vp-col">

            <!-- Support info card -->
            <div class="section-card mb-3">
              <div class="section-card__header">
                <span class="section-card__title"><i class="bi bi-tools"></i> Support Details</span>
              </div>
              <div class="section-card__body">
                <div class="vp-info-list">
                  <div class="vp-info-row">
                    <span class="vp-info-label">Support method</span>
                    <span class="vp-info-val">
                      @if (volunteer.support_method) {
                        <span class="badge bg-info-subtle text-info-emphasis">
                          {{ volunteer.support_method }}
                        </span>
                      } @else { <span class="text-muted">—</span> }
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Contact preference</span>
                    <span class="vp-info-val">
                      @if (volunteer.contact_preference) {
                        <span class="badge bg-secondary-subtle text-secondary-emphasis">
                          {{ volunteer.contact_preference }}
                        </span>
                      } @else { <span class="text-muted">—</span> }
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Country placed</span>
                    <span class="vp-info-val">
                      {{ volunteer.country_placed ? (flagOf(volunteer.country_placed) + ' ' + volunteer.country_placed) : '—' }}
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Company joined</span>
                    <span class="vp-info-val">{{ volunteer.company_joined || '—' }}</span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Year placed</span>
                    <span class="vp-info-val">{{ volunteer.year_placed || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Consent card -->
            <div class="section-card mb-3">
              <div class="section-card__header">
                <span class="section-card__title"><i class="bi bi-shield-check-fill"></i> Consent</span>
              </div>
              <div class="section-card__body">
                <div class="vp-consent-block">
                  @if (volunteer.consent) {
                    <div class="vp-consent-block__icon vp-consent-block__icon--yes">
                      <i class="bi bi-check-circle-fill"></i>
                    </div>
                    <div>
                      <div class="vp-consent-block__label">Consent confirmed</div>
                      <div class="vp-consent-block__sub">Volunteer has agreed to be listed on the platform</div>
                    </div>
                  } @else {
                    <div class="vp-consent-block__icon vp-consent-block__icon--no">
                      <i class="bi bi-x-circle-fill"></i>
                    </div>
                    <div>
                      <div class="vp-consent-block__label">Consent not confirmed</div>
                      <div class="vp-consent-block__sub">Volunteer has not confirmed consent</div>
                    </div>
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      }

      <!-- ── Tab: Contact & Record ───────────────────────────────── -->
      @if (activeTab() === 'contact') {
        <div class="vp-grid">

          <div class="vp-col">
            <div class="section-card mb-3">
              <div class="section-card__header">
                <span class="section-card__title"><i class="bi bi-person-badge-fill"></i> Contact Information</span>
              </div>
              <div class="section-card__body">
                <div class="vp-info-list">
                  <div class="vp-info-row">
                    <span class="vp-info-label"><i class="bi bi-envelope me-1"></i>Email</span>
                    <span class="vp-info-val">
                      @if (volunteer.email) {
                        <a [href]="'mailto:' + volunteer.email" class="vp-link">{{ volunteer.email }}</a>
                      } @else { <span class="text-muted">—</span> }
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label"><i class="bi bi-telephone me-1"></i>Phone / WhatsApp</span>
                    <span class="vp-info-val">{{ volunteer.phone || '—' }}</span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label"><i class="bi bi-headset me-1"></i>Support method</span>
                    <span class="vp-info-val">
                      @if (volunteer.support_method) {
                        <span class="badge bg-info-subtle text-info-emphasis">{{ volunteer.support_method }}</span>
                      } @else { <span class="text-muted">—</span> }
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label"><i class="bi bi-chat-dots me-1"></i>Contact preference</span>
                    <span class="vp-info-val">
                      @if (volunteer.contact_preference) {
                        <span class="badge bg-secondary-subtle text-secondary-emphasis">{{ volunteer.contact_preference }}</span>
                      } @else { <span class="text-muted">—</span> }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="vp-col">
            <div class="section-card mb-3">
              <div class="section-card__header">
                <span class="section-card__title"><i class="bi bi-clock-history"></i> Record</span>
              </div>
              <div class="section-card__body">
                <div class="vp-info-list">
                  <div class="vp-info-row">
                    <span class="vp-info-label">Added on</span>
                    <span class="vp-info-val">{{ volunteer.created_at | date:'dd MMM yyyy' }}</span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Last updated</span>
                    <span class="vp-info-val">
                      {{ volunteer.updated_at ? (volunteer.updated_at | date:'dd MMM yyyy') : '—' }}
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Status</span>
                    <span class="vp-info-val">
                      <span class="vp-avail-badge"
                        [class.vp-avail-badge--active]="volunteer.availability === 'Active'"
                        [class.vp-avail-badge--inactive]="volunteer.availability !== 'Active'">
                        <i class="bi bi-circle-fill" style="font-size:.4rem"></i>
                        {{ volunteer.availability === 'Active' ? 'Active' : 'Unavailable' }}
                      </span>
                    </span>
                  </div>
                  <div class="vp-info-row">
                    <span class="vp-info-label">Candidates helped</span>
                    <span class="vp-info-val">
                      <span class="vp-stat-inline">{{ volunteer.candidates_helped ?? 0 }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      }

    }

    <style>
      /* ── Hero ─────────────────────────── */
      .vp-hero {
        background: var(--th-surface, #fff);
        border: 1px solid var(--th-border, #e5e7eb);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 1px 6px rgba(0,0,0,.06);
      }
      .vp-hero__cover {
        height: 110px;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 60%, #15803d 100%);
      }
      .vp-hero__body {
        display: flex;
        align-items: flex-start;
        gap: 1.5rem;
        padding: 0 1.75rem 1.5rem;
        flex-wrap: wrap;
      }

      /* Avatar */
      .vp-hero__avatar-wrap {
        position: relative;
        width: 96px; height: 96px;
        border-radius: 50%;
        border: 4px solid var(--th-surface, #fff);
        overflow: visible;
        margin-top: -48px;
        flex-shrink: 0;
        box-shadow: 0 4px 14px rgba(0,0,0,.14);
      }
      .vp-hero__avatar-img {
        width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
      }
      .vp-hero__avatar-initials {
        width: 96px; height: 96px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #22c55e, #15803d);
        color: #fff; font-weight: 700; font-size: 1.8rem;
      }
      .vp-hero__avail-dot {
        position: absolute; bottom: 4px; right: 4px;
        width: 14px; height: 14px; border-radius: 50%;
        background: #9ca3af;
        border: 2px solid var(--th-surface, #fff);
      }
      .vp-hero__avail-dot--active { background: #22c55e; }

      /* Info */
      .vp-hero__info { flex: 1; min-width: 220px; padding-top: .85rem; }
      .vp-hero__name-row { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; }
      .vp-hero__name { font-size: 1.4rem; font-weight: 700; margin: 0; color: var(--th-text, #111827); }
      .vp-hero__role { font-size: .85rem; color: var(--th-text-secondary, #4b5563); margin-top: .15rem; }
      .vp-hero__chips { display: flex; flex-wrap: wrap; gap: .4rem; }

      /* Stats */
      .vp-hero__stats {
        display: flex; gap: .75rem; flex-wrap: wrap;
        margin-left: auto; padding-top: .85rem; align-items: flex-start;
      }
      .vp-stat {
        text-align: center; min-width: 72px;
        background: var(--th-surface-2, #f9fafb);
        border: 1px solid var(--th-border, #e5e7eb);
        border-radius: 12px; padding: .6rem 1rem;
      }
      .vp-stat__val { font-size: 1.4rem; font-weight: 700; color: var(--th-primary, #6366f1); line-height: 1; }
      .vp-stat__label { font-size: .62rem; color: var(--th-text-muted, #6b7280); text-transform: uppercase; letter-spacing: .06em; margin-top: .2rem; }

      /* Availability badge */
      .vp-avail-badge {
        display: inline-flex; align-items: center; gap: .3rem;
        font-size: .72rem; font-weight: 600; padding: .25rem .65rem; border-radius: 999px;
      }
      .vp-avail-badge--active   { background: #dcfce7; color: #15803d; }
      .vp-avail-badge--inactive { background: #f3f4f6; color: #6b7280; }

      /* Chips */
      .vp-chip {
        display: inline-flex; align-items: center; gap: .3rem;
        font-size: .75rem; background: var(--th-surface-2, #f3f4f6);
        color: var(--th-text-secondary, #374151); padding: .25rem .65rem;
        border-radius: 999px; border: 1px solid var(--th-border, #e5e7eb);
        white-space: nowrap; text-decoration: none;
      }
      .vp-chip--placed  { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
      .vp-chip--company { background: #fefce8; border-color: #fde68a; color: #92400e; }
      .vp-chip--link    { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; cursor: pointer; }
      .vp-chip--link:hover { background: #dcfce7; }

      /* ── Tabs ──────────────────────────── */
      .vp-tabs {
        display: flex; gap: .25rem;
        border-bottom: 2px solid var(--th-border, #e5e7eb);
      }
      .vp-tab {
        background: none; border: none; padding: .65rem 1.1rem;
        font-size: .85rem; font-weight: 500; color: var(--th-text-muted, #6b7280);
        cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
        display: inline-flex; align-items: center; gap: .4rem;
        transition: color .15s, border-color .15s;
      }
      .vp-tab:hover { color: var(--th-text, #111827); }
      .vp-tab--active { color: var(--th-primary, #6366f1); border-bottom-color: var(--th-primary, #6366f1); font-weight: 600; }

      /* ── Content grid ──────────────────── */
      .vp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      @media (max-width: 768px) { .vp-grid { grid-template-columns: 1fr; } }
      .vp-col { display: flex; flex-direction: column; }

      /* Section title */
      .vp-section-title {
        font-size: .72rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: .08em; color: var(--th-text-muted, #6b7280);
        margin-bottom: .9rem; display: flex; align-items: center; gap: .4rem;
      }

      /* Story */
      .vp-story-text {
        font-size: .875rem; color: var(--th-text-secondary, #374151);
        line-height: 1.65; margin: 0;
        padding: .75rem 1rem; background: var(--th-surface-2, #f9fafb);
        border-radius: 8px; border-left: 3px solid #22c55e;
      }

      /* Languages */
      .vp-lang-list { display: flex; flex-wrap: wrap; gap: .35rem; }
      .vp-lang-tag {
        font-size: .75rem; background: #f5f3ff; color: #6d28d9;
        border: 1px solid #ddd6fe; padding: .25rem .7rem; border-radius: 999px; font-weight: 500;
      }

      /* Info rows */
      .vp-info-list { display: flex; flex-direction: column; gap: .75rem; }
      .vp-info-row  {
        display: flex; align-items: center; justify-content: space-between;
        gap: .5rem; flex-wrap: wrap;
        padding-bottom: .75rem;
        border-bottom: 1px solid var(--th-border, #f3f4f6);
      }
      .vp-info-row:last-child { border-bottom: none; padding-bottom: 0; }
      .vp-info-label { font-size: .78rem; color: var(--th-text-muted, #6b7280); flex-shrink: 0; }
      .vp-info-val   { font-size: .82rem; color: var(--th-text, #111827); font-weight: 500; text-align: right; }
      .vp-link { color: var(--th-primary, #6366f1); text-decoration: none; }
      .vp-link:hover { text-decoration: underline; }

      /* Consent block */
      .vp-consent-block {
        display: flex; align-items: flex-start; gap: .85rem;
        padding: .85rem 1rem;
        background: var(--th-surface-2, #f9fafb);
        border-radius: 10px;
        border: 1px solid var(--th-border, #e5e7eb);
      }
      .vp-consent-block__icon { font-size: 1.6rem; line-height: 1; }
      .vp-consent-block__icon--yes { color: #22c55e; }
      .vp-consent-block__icon--no  { color: #ef4444; }
      .vp-consent-block__label { font-size: .85rem; font-weight: 600; color: var(--th-text, #111827); }
      .vp-consent-block__sub   { font-size: .75rem; color: var(--th-text-muted, #6b7280); margin-top: .1rem; }

      /* Inline stat */
      .vp-stat-inline {
        font-size: .9rem; font-weight: 700; color: var(--th-primary, #6366f1);
      }

      /* Empty state */
      .vp-empty-state {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: .75rem; padding: 3rem 1rem;
        color: var(--th-text-muted, #6b7280); font-size: .875rem; text-align: center;
      }
      .vp-empty-state__icon { font-size: 2.5rem; opacity: .4; }
    </style>
  `,
})
export class VolunteerProfilePageComponent implements OnInit {
  volunteer: Volunteer | null = null;
  loadError = '';
  toggling  = false;
  activeTab = signal<Tab>('overview');

  private readonly flagMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    this.master.countries().forEach(c => map.set(c.name.toLowerCase(), c.flag_emoji));
    return map;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private volunteerSvc: VolunteerService,
    private master: MasterDataService,
    private toast: ToastService,
    private confirm: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.master.loadAll();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.volunteerSvc.getById(id).subscribe({
      next: (res) => (this.volunteer = res.volunteer),
      error: () => (this.loadError = 'Volunteer not found or failed to load.'),
    });
  }

  initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  flagOf(name?: string | null): string {
    if (!name) return '';
    return this.flagMap().get(name.toLowerCase()) ?? '';
  }

  toggleAvailability(): void {
    if (!this.volunteer) return;
    const next = this.volunteer.availability === 'Active' ? 'Temporarily Unavailable' : 'Active';
    this.toggling = true;
    this.volunteerSvc.update(this.volunteer.id, { availability: next as any }).subscribe({
      next: (res) => {
        this.toggling  = false;
        this.volunteer = res.volunteer;
        this.toast.success(next === 'Active' ? 'Volunteer activated' : 'Volunteer deactivated');
      },
      error: (err) => {
        this.toggling = false;
        this.toast.error(err?.error?.message ?? 'Failed to update availability');
      },
    });
  }

  async deleteVolunteer(): Promise<void> {
    if (!this.volunteer) return;
    const ok = await this.confirm.confirm({
      title: 'Delete Volunteer',
      message: `Permanently remove ${this.volunteer.name} from the volunteer list?`,
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    });
    if (!ok) return;
    this.volunteerSvc.delete(this.volunteer.id).subscribe({
      next: () => {
        this.toast.success('Volunteer removed');
        this.router.navigate(['/admin/volunteers']);
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Failed to delete'),
    });
  }
}
