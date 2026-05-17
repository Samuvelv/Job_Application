// src/app/features/candidate/dashboard/candidate-dashboard.component.ts
import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, CandidateStats } from '../../../core/services/stats.service';
import { CandidateService } from '../../../core/services/candidate.service';
import { Candidate } from '../../../core/models/candidate.model';

interface CompletionSection {
  label: string;
  icon: string;
  done: boolean;
  weight: number;
}

@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    /* ── Hero ─────────────────────────────────────────────────────────── */
    .cd-hero {
      background: var(--th-gradient-success);
      border-radius: var(--th-radius-xl);
      padding: 28px 32px 24px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    @media (max-width: 575px) {
      .cd-hero { padding: 18px 16px 16px; }
      .cd-hero__name { font-size: 1.35rem; }
    }
    .cd-hero::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,.06);
      pointer-events: none;
    }
    .cd-hero::after {
      content: '';
      position: absolute;
      bottom: -60px; right: 60px;
      width: 140px; height: 140px;
      border-radius: 50%;
      background: rgba(255,255,255,.04);
      pointer-events: none;
    }
    .cd-hero__eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: rgba(255,255,255,.65);
      margin-bottom: 6px;
    }
    .cd-hero__name {
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 4px;
      line-height: 1.2;
    }
    .cd-hero__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .cd-hero__chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: rgba(255,255,255,.8);
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px;
      padding: 4px 12px;
    }
    .cd-hero__chip--warn {
      background: rgba(245,158,11,.2);
      border-color: rgba(245,158,11,.35);
      color: #fde68a;
    }
    .cd-hero__chip--login-id {
      background: rgba(99,102,241,.25);
      border-color: rgba(165,180,252,.4);
      color: #c7d2fe;
      font-weight: 600;
      letter-spacing: .3px;
    }
    .cd-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .cd-hero__btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 20px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity .15s, transform .15s;
    }
    .cd-hero__btn:hover { opacity: .9; transform: translateY(-1px); }
    .cd-hero__btn--solid { background: #fff; color: #065f46; }
    .cd-hero__btn--ghost {
      background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25);
      color: #fff;
    }
    .cd-hero__btn--ghost-warn {
      background: rgba(245,158,11,.2);
      border: 1px solid rgba(245,158,11,.4);
      color: #fde68a;
    }

    /* ── Profile Completion Card ───────────────────────────────────────── */
    .cd-completion {
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-xl);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .cd-completion__header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--th-border);
      background: var(--th-surface-2);
    }
    .cd-completion__icon {
      width: 34px; height: 34px;
      border-radius: var(--th-radius-sm);
      background: var(--th-gradient-success);
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      font-size: .9rem;
      flex-shrink: 0;
    }
    .cd-completion__title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: var(--th-text-secondary);
      flex: 1;
    }
    .cd-completion__pct {
      font-size: 1.4rem;
      font-weight: 800;
      line-height: 1;
    }
    .cd-completion__body { padding: 18px 20px; }

    /* Progress bar */
    .cd-progress {
      height: 10px;
      border-radius: 999px;
      background: var(--th-surface-2);
      border: 1px solid var(--th-border);
      overflow: hidden;
      margin-bottom: 6px;
    }
    .cd-progress__fill {
      height: 100%;
      border-radius: 999px;
      transition: width .6s ease;
    }
    .cd-progress__fill--green  { background: var(--th-gradient-success); }
    .cd-progress__fill--amber  { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .cd-progress__fill--red    { background: linear-gradient(90deg, #ef4444, #f87171); }

    .cd-progress__hint {
      font-size: 11.5px;
      color: var(--th-muted);
      margin-bottom: 16px;
    }

    /* Section checklist grid */
    .cd-sections {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    @media (max-width: 480px) {
      .cd-sections { grid-template-columns: 1fr; }
    }
    .cd-section {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      border-radius: var(--th-radius);
      border: 1px solid var(--th-border);
      background: var(--th-surface-2);
    }
    .cd-section__dot {
      width: 24px; height: 24px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .75rem;
      flex-shrink: 0;
    }
    .cd-section__dot--done {
      background: rgba(16,185,129,.15);
      color: var(--th-emerald);
    }
    .cd-section__dot--miss {
      background: var(--th-surface);
      border: 1.5px dashed var(--th-border-strong);
      color: var(--th-muted);
    }
    .cd-section__info { flex: 1; min-width: 0; }
    .cd-section__label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--th-text);
    }
    .cd-section__sub {
      font-size: 11px;
      color: var(--th-muted);
    }
    .cd-section__weight {
      font-size: 11px;
      font-weight: 600;
      color: var(--th-muted);
      flex-shrink: 0;
    }

    /* CTA strip */
    .cd-completion__footer {
      padding: 12px 20px;
      border-top: 1px solid var(--th-border);
      background: var(--th-surface-2);
    }

    /* ── Quick Actions heading ─────────────────────────────────────────── */
    .cd-section-heading {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--th-text-secondary);
      margin-bottom: 12px;
    }

    /* ── Quick Links ───────────────────────────────────────────────────── */
    .cd-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    @media (max-width: 768px) {
      .cd-links { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .cd-links { grid-template-columns: 1fr; }
    }

    .cd-link {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 20px;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-xl);
      text-decoration: none;
      transition: border-color .15s, box-shadow .15s, transform .15s;
    }
    .cd-link:hover {
      border-color: var(--th-border-strong);
      box-shadow: var(--th-shadow-sm);
      transform: translateY(-2px);
    }
    .cd-link__icon {
      width: 44px; height: 44px;
      border-radius: var(--th-radius);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .cd-link__icon--green  { background: rgba(16,185,129,.12); color: var(--th-emerald); }
    .cd-link__icon--amber  { background: rgba(245,158,11,.12); color: var(--th-amber); }
    .cd-link__icon--blue   { background: rgba(59,130,246,.12); color: #3b82f6; }
    .cd-link__body { flex: 1; min-width: 0; }
    .cd-link__title {
      font-size: 14px;
      font-weight: 700;
      color: var(--th-text);
      margin-bottom: 2px;
    }
    .cd-link__desc {
      font-size: 12px;
      color: var(--th-muted);
    }
    .cd-link__badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(245,158,11,.15);
      color: var(--th-amber);
      border: 1px solid rgba(245,158,11,.25);
      flex-shrink: 0;
    }
    .cd-link__arrow {
      color: var(--th-muted);
      font-size: 1rem;
      flex-shrink: 0;
    }

    /* ── Skeleton ──────────────────────────────────────────────────────── */
    .skeleton {
      background: linear-gradient(90deg, var(--th-border) 25%, var(--th-surface-2) 50%, var(--th-border) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 6px;
    }
    @keyframes shimmer {
      0%  { background-position: 200% 0; }
      100%{ background-position: -200% 0; }
    }
  `],
  template: `
    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <div class="cd-hero">
      <div class="cd-hero__eyebrow">Candidate Portal</div>
      <h1 class="cd-hero__name">Good {{ timeOfDay() }}, {{ firstName() || '…' }}</h1>

      <div class="cd-hero__chips">
        <span class="cd-hero__chip">
          <i class="bi bi-calendar3"></i>{{ today() }}
        </span>
        @if (candidate()?.candidate_number) {
          <span class="cd-hero__chip">
            <i class="bi bi-person-badge"></i>{{ candidate()!.candidate_number }}
          </span>
        }
        @if (candidate()?.login_id) {
          <span class="cd-hero__chip cd-hero__chip--login-id" title="Use this ID to log in">
            <i class="bi bi-key-fill"></i>Login ID: {{ candidate()!.login_id }}
          </span>
        }
        @if (stats()?.pendingRequest) {
          <span class="cd-hero__chip cd-hero__chip--warn">
            <i class="bi bi-hourglass-split"></i>Edit request pending
          </span>
        }
      </div>

      <div class="cd-hero__actions">
        <a routerLink="/candidate/profile" class="cd-hero__btn cd-hero__btn--solid">
          <i class="bi bi-person-circle"></i>My Profile
        </a>
        @if (stats()?.pendingRequest) {
          <a routerLink="/candidate/edit-request" class="cd-hero__btn cd-hero__btn--ghost-warn">
            <i class="bi bi-hourglass-split"></i>Edit Pending
          </a>
        } @else {
          <a routerLink="/candidate/edit-request" class="cd-hero__btn cd-hero__btn--ghost">
            <i class="bi bi-pencil"></i>Request Edit
          </a>
        }
      </div>
    </div>

    <!-- ── Quick Actions ──────────────────────────────────────────────────── -->
    <div class="cd-section-heading">Quick Actions</div>
    <div class="cd-links">

      <!-- My Profile -->
      <a routerLink="/candidate/profile" class="cd-link">
        <div class="cd-link__icon cd-link__icon--green">
          <i class="bi bi-person-circle"></i>
        </div>
        <div class="cd-link__body">
          <div class="cd-link__title">My Profile</div>
          <div class="cd-link__desc">View &amp; manage your profile</div>
        </div>
        <i class="bi bi-chevron-right cd-link__arrow"></i>
      </a>

      <!-- View Profile (as recruiter sees it) -->
      <a routerLink="/candidate/profile" class="cd-link">
        <div class="cd-link__icon cd-link__icon--blue">
          <i class="bi bi-eye"></i>
        </div>
        <div class="cd-link__body">
          <div class="cd-link__title">View Profile</div>
          <div class="cd-link__desc">As seen by recruiters</div>
        </div>
        <i class="bi bi-chevron-right cd-link__arrow"></i>
      </a>

      <!-- Request Edit -->
      <a routerLink="/candidate/edit-request" class="cd-link">
        <div class="cd-link__icon cd-link__icon--amber">
          <i class="bi bi-pencil-square"></i>
        </div>
        <div class="cd-link__body">
          <div class="cd-link__title">Request Edit</div>
          <div class="cd-link__desc">Submit changes for admin approval</div>
        </div>
        @if (stats()?.pendingRequest) {
          <span class="cd-link__badge">Pending</span>
        }
        <i class="bi bi-chevron-right cd-link__arrow"></i>
      </a>

    </div>

    <!-- ── Profile Completion ─────────────────────────────────────────────── -->
    <div class="cd-completion">
      <div class="cd-completion__header">
        <div class="cd-completion__icon">
          <i class="bi bi-activity"></i>
        </div>
        <span class="cd-completion__title">Profile Completion</span>
        @if (loading()) {
          <span class="skeleton" style="width:52px;height:28px;display:block"></span>
        } @else {
          <span class="cd-completion__pct" [style.color]="completionColor()">
            {{ completionPct() }}%
          </span>
        }
      </div>

      <div class="cd-completion__body">
        <!-- Progress bar -->
        @if (loading()) {
          <div class="cd-progress mb-3">
            <div class="cd-progress__fill cd-progress__fill--green skeleton" style="width:60%"></div>
          </div>
        } @else {
          <div class="cd-progress">
            <div class="cd-progress__fill"
              [class.cd-progress__fill--green]="completionPct() >= 80"
              [class.cd-progress__fill--amber]="completionPct() >= 50 && completionPct() < 80"
              [class.cd-progress__fill--red]="completionPct() < 50"
              [style.width]="completionPct() + '%'">
            </div>
          </div>
          <div class="cd-progress__hint">
            @if (completionPct() === 100) {
              Your profile is fully complete and visible to recruiters.
            } @else {
              {{ 100 - completionPct() }}% remaining — complete your profile to improve recruiter visibility.
            }
          </div>
        }

        <!-- Section checklist -->
        @if (!loading()) {
          <div class="cd-sections">
            @for (sec of sections(); track sec.label) {
              <div class="cd-section">
                <div class="cd-section__dot"
                  [class.cd-section__dot--done]="sec.done"
                  [class.cd-section__dot--miss]="!sec.done">
                  <i class="bi" [class.bi-check-lg]="sec.done" [class.bi-dash]="!sec.done"></i>
                </div>
                <div class="cd-section__info">
                  <div class="cd-section__label">{{ sec.label }}</div>
                  <div class="cd-section__sub">{{ sec.done ? 'Complete' : 'Incomplete' }}</div>
                </div>
                <span class="cd-section__weight">{{ sec.weight }}%</span>
              </div>
            }
          </div>
        } @else {
          <!-- Skeleton checklist -->
          <div class="cd-sections">
            @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
              <div class="cd-section">
                <span class="skeleton" style="width:24px;height:24px;border-radius:50%;flex-shrink:0"></span>
                <div class="flex-grow-1">
                  <span class="skeleton" style="width:80%;height:12px;display:block;margin-bottom:4px"></span>
                  <span class="skeleton" style="width:50%;height:10px;display:block"></span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (!loading() && completionPct() < 100) {
        <div class="cd-completion__footer">
          <a routerLink="/candidate/edit-request"
            style="font-size:13px;font-weight:600;color:var(--th-primary);text-decoration:none;
              display:inline-flex;align-items:center;gap:5px">
            <i class="bi bi-pencil-square"></i>
            Update your profile to reach 100%
            <i class="bi bi-arrow-right ms-1"></i>
          </a>
        </div>
      }
    </div>
  `,
})
export class CandidateDashboardComponent implements OnInit {
  stats     = signal<CandidateStats | null>(null);
  candidate = signal<Candidate | null>(null);
  loading   = signal(true);

  // ── Derived ────────────────────────────────────────────────────────────────

  firstName = computed(() => {
    const c = this.candidate();
    if (!c) return '';
    return c.first_name || `${c.first_name} ${c.last_name}`.trim();
  });

  /**
   * Profile completion percentage — sourced from the backend stats API,
   * which uses a 15-field weighted formula (skills, experience, resume, etc.)
   * summing to 100. Falls back to 0 while loading.
   */
  completionPct = computed(() => this.stats()?.profileCompleteness ?? 0);

  completionColor = computed(() => {
    const p = this.completionPct();
    if (p >= 80) return 'var(--th-emerald)';
    if (p >= 50) return 'var(--th-amber)';
    return 'var(--th-rose, #f43f5e)';
  });

  /**
   * Section-level checklist derived from the loaded candidate profile.
   * Fields and weights exactly mirror the admin candidate-card completionPercent
   * formula and the backend getCandidateStats() — all three are now in sync:
   *
   *   base name(15) + photo(15) + job_title(10) + industry(10)
   *   + current_country(10) + years_experience(10) + english_level(10)
   *   + intro_video_url(10) + nationality(5) + target_locations(5) = 100
   */
  sections = computed<CompletionSection[]>(() => {
    const c = this.candidate();
    if (!c) return [];
    return [
      {
        label:  'Profile Photo',
        icon:   'bi-person-circle',
        done:   !!c.profile_photo_url,
        weight: 15,
      },
      {
        label:  'Job Title',
        icon:   'bi-briefcase',
        done:   !!c.job_title,
        weight: 10,
      },
      {
        label:  'Industry',
        icon:   'bi-building',
        done:   !!c.industry,
        weight: 10,
      },
      {
        label:  'Current Country',
        icon:   'bi-geo-alt',
        done:   !!c.current_country,
        weight: 10,
      },
      {
        label:  'Years of Experience',
        icon:   'bi-clock-history',
        done:   c.years_experience != null,
        weight: 10,
      },
      {
        label:  'English Level',
        icon:   'bi-translate',
        done:   !!c.english_level,
        weight: 10,
      },
      {
        label:  'Intro Video',
        icon:   'bi-camera-video',
        done:   !!c.intro_video_url,
        weight: 10,
      },
      {
        label:  'Nationality',
        icon:   'bi-flag',
        done:   !!c.nationality,
        weight: 5,
      },
      {
        label:  'Target Locations',
        icon:   'bi-pin-map',
        done:   !!(c.target_locations?.length),
        weight: 5,
      },
    ];
  });

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
    private candidateService: CandidateService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      profile: this.candidateService.getMyProfile().pipe(catchError(() => of(null))),
      stats:   this.statsService.getCandidateStats().pipe(catchError(() => of(null))),
    }).subscribe(({ profile, stats }) => {
      if (profile) this.candidate.set(profile.candidate);
      if (stats)   this.stats.set(stats);
      this.loading.set(false);
    });
  }

  timeOfDay(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  today(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}
