// src/app/features/recruiter/dashboard/recruiter-dashboard.component.ts
import { Component, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, RecruiterStats } from '../../../core/services/stats.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { Recruiter } from '../../../core/models/recruiter.model';

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styles: [`
    /* ── Hero ─────────────────────────────────────────────────────────── */
    .rd-hero {
      background: var(--th-gradient-purple);
      border-radius: var(--th-radius-xl);
      padding: 28px 32px 24px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    @media (max-width: 575px) {
      .rd-hero { padding: 18px 16px 16px; }
      .rd-hero__name { font-size: 1.35rem; }
    }
    .rd-hero::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,.06);
      pointer-events: none;
    }
    .rd-hero::after {
      content: '';
      position: absolute;
      bottom: -60px; right: 60px;
      width: 140px; height: 140px;
      border-radius: 50%;
      background: rgba(255,255,255,.04);
      pointer-events: none;
    }

    .rd-hero__eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: rgba(255,255,255,.65);
      margin-bottom: 6px;
    }
    .rd-hero__name {
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 4px;
      line-height: 1.2;
    }
    .rd-hero__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .rd-hero__chip {
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
    .rd-hero__chip--warn {
      background: rgba(239,68,68,.2);
      border-color: rgba(239,68,68,.35);
      color: #fca5a5;
    }
    .rd-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .rd-hero__btn {
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
    .rd-hero__btn:hover { opacity: .9; transform: translateY(-1px); }
    .rd-hero__btn--solid {
      background: #fff;
      color: #5b21b6;
    }
    .rd-hero__btn--ghost {
      background: rgba(255,255,255,.15);
      border: 1px solid rgba(255,255,255,.25);
      color: #fff;
    }

    /* ── Stat pills row ───────────────────────────────────────────────── */
    .rd-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    @media (max-width: 480px) {
      .rd-stats { grid-template-columns: 1fr; }
    }

    .rd-stat {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-xl);
      padding: 18px 20px;
      text-decoration: none;
      transition: border-color .15s, box-shadow .15s, transform .15s;
    }
    .rd-stat:hover {
      border-color: var(--th-border-strong);
      box-shadow: var(--th-shadow-sm);
      transform: translateY(-2px);
    }
    .rd-stat__icon {
      width: 44px; height: 44px;
      border-radius: var(--th-radius);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .rd-stat__icon--purple { background: rgba(139,92,246,.12); color: var(--th-violet); }
    .rd-stat__icon--cyan   { background: rgba(6,182,212,.12);  color: #0e7490; }
    .rd-stat__body { flex: 1; min-width: 0; }
    .rd-stat__value {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--th-text);
      line-height: 1;
      margin-bottom: 2px;
    }
    .rd-stat__label {
      font-size: 12px;
      color: var(--th-muted);
      font-weight: 500;
    }
    .rd-stat__arrow {
      color: var(--th-muted);
      font-size: 1rem;
      flex-shrink: 0;
    }
    .skeleton {
      background: linear-gradient(90deg, var(--th-border) 25%, var(--th-surface-2) 50%, var(--th-border) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 6px;
    }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ── Quick links ──────────────────────────────────────────────────── */
    .rd-section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--th-muted);
      margin-bottom: 14px;
    }
    .rd-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 0;
    }
    @media (max-width: 767px) {
      .rd-links { grid-template-columns: 1fr; }
    }

    .rd-link-card {
      display: flex;
      flex-direction: column;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-xl);
      padding: 22px 20px 18px;
      text-decoration: none;
      transition: border-color .15s, box-shadow .15s, transform .15s;
      cursor: pointer;
    }
    .rd-link-card:hover {
      border-color: var(--th-border-strong);
      box-shadow: var(--th-shadow-md, 0 4px 20px rgba(0,0,0,.08));
      transform: translateY(-3px);
    }
    .rd-link-card__icon {
      width: 46px; height: 46px;
      border-radius: var(--th-radius);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem;
      margin-bottom: 14px;
    }
    .rd-link-card__icon--cyan   { background: var(--th-gradient-info);   color: #fff; box-shadow: 0 4px 14px rgba(6,182,212,.3); }
    .rd-link-card__icon--purple { background: var(--th-gradient-purple);  color: #fff; box-shadow: 0 4px 14px rgba(139,92,246,.3); }
    .rd-link-card__icon--teal   { background: linear-gradient(135deg,#0d9488,#0891b2); color:#fff; box-shadow: 0 4px 14px rgba(13,148,136,.3); }
    .rd-link-card__title {
      font-size: 14px;
      font-weight: 700;
      color: var(--th-text);
      margin-bottom: 5px;
    }
    .rd-link-card__desc {
      font-size: 12.5px;
      color: var(--th-muted);
      line-height: 1.55;
      flex: 1;
      margin-bottom: 16px;
    }
    .rd-link-card__cta {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: var(--th-primary);
      text-decoration: none;
    }
    .rd-link-card:hover .rd-link-card__cta { text-decoration: underline; }
  `],
  template: `
    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <div class="rd-hero">
      <div class="rd-hero__eyebrow">Recruiter Portal</div>
      <h1 class="rd-hero__name">Good {{ timeOfDay() }}, {{ contactName() || '…' }}</h1>

      <div class="rd-hero__chips">
        <span class="rd-hero__chip">
          <i class="bi bi-calendar3"></i>{{ today() }}
        </span>
        @if (profile()?.access_expires_at) {
          <span class="rd-hero__chip" [class.rd-hero__chip--warn]="isExpired()">
            <i class="bi bi-clock"></i>
            @if (isExpired()) {
              Access expired
            } @else {
              Access expires {{ profile()!.access_expires_at | date:'d MMM yyyy' }}
            }
          </span>
        }
        @if (profile()?.company_name) {
          <span class="rd-hero__chip">
            <i class="bi bi-building"></i>{{ profile()!.company_name }}
          </span>
        }
      </div>

      <div class="rd-hero__actions">
        <a routerLink="/recruiter/candidates" class="rd-hero__btn rd-hero__btn--solid">
          <i class="bi bi-search"></i>Search Talent
        </a>
        <a routerLink="/recruiter/shortlist" class="rd-hero__btn rd-hero__btn--ghost">
          <i class="bi bi-bookmark-star-fill"></i>My Shortlist
        </a>
      </div>
    </div>

    <!-- ── Stats row ──────────────────────────────────────────────────────── -->
    <div class="rd-stats">

      <!-- Shortlist -->
      <a routerLink="/recruiter/shortlist" class="rd-stat">
        <div class="rd-stat__icon rd-stat__icon--purple">
          <i class="bi bi-bookmark-star-fill"></i>
        </div>
        <div class="rd-stat__body">
          @if (loading()) {
            <span class="skeleton" style="width:56px;height:28px;display:block;margin-bottom:4px"></span>
            <span class="skeleton" style="width:96px;height:12px;display:block"></span>
          } @else {
            <div class="rd-stat__value">{{ stats()?.shortlistCount ?? 0 }}</div>
            <div class="rd-stat__label">Saved in Shortlist</div>
          }
        </div>
        <i class="bi bi-chevron-right rd-stat__arrow"></i>
      </a>

      <!-- Candidates available -->
      <a routerLink="/recruiter/candidates" class="rd-stat">
        <div class="rd-stat__icon rd-stat__icon--cyan">
          <i class="bi bi-people-fill"></i>
        </div>
        <div class="rd-stat__body">
          @if (loading()) {
            <span class="skeleton" style="width:56px;height:28px;display:block;margin-bottom:4px"></span>
            <span class="skeleton" style="width:120px;height:12px;display:block"></span>
          } @else {
            <div class="rd-stat__value">{{ stats()?.candidatesAvailable ?? 0 }}</div>
            <div class="rd-stat__label">Candidates Available</div>
          }
        </div>
        <i class="bi bi-chevron-right rd-stat__arrow"></i>
      </a>

    </div>

    <!-- ── Quick links ─────────────────────────────────────────────────────── -->
    <div class="rd-section-label">Quick Access</div>
    <div class="rd-links">

      <!-- Search Talent -->
      <a routerLink="/recruiter/candidates" class="rd-link-card">
        <div class="rd-link-card__icon rd-link-card__icon--cyan">
          <i class="bi bi-search"></i>
        </div>
        <div class="rd-link-card__title">Search Talent</div>
        <div class="rd-link-card__desc">
          Filter candidates by skills, location, industry and experience to find your ideal hire.
        </div>
        <span class="rd-link-card__cta">
          Browse candidates <i class="bi bi-arrow-right"></i>
        </span>
      </a>

      <!-- My Shortlist -->
      <a routerLink="/recruiter/shortlist" class="rd-link-card">
        <div class="rd-link-card__icon rd-link-card__icon--purple">
          <i class="bi bi-bookmark-star-fill"></i>
        </div>
        <div class="rd-link-card__title">My Shortlist</div>
        <div class="rd-link-card__desc">
          Review and manage the candidates you've saved. Compare profiles and make hiring decisions.
        </div>
        <span class="rd-link-card__cta">
          View shortlist <i class="bi bi-arrow-right"></i>
        </span>
      </a>

      <!-- Interest Requests -->
      <a routerLink="/recruiter/interest-requests" class="rd-link-card">
        <div class="rd-link-card__icon rd-link-card__icon--teal">
          <i class="bi bi-briefcase-fill"></i>
        </div>
        <div class="rd-link-card__title">Interest Requests</div>
        <div class="rd-link-card__desc">
          Track the status of agency interest requests you've submitted and follow up on decisions.
        </div>
        <span class="rd-link-card__cta">
          View requests <i class="bi bi-arrow-right"></i>
        </span>
      </a>

    </div>
  `,
})
export class RecruiterDashboardComponent implements OnInit {
  stats    = signal<RecruiterStats | null>(null);
  loading  = signal(true);
  profile  = signal<Recruiter | null>(null);

  contactName = computed(() => this.profile()?.contact_name ?? '');

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
    private recruiterService: RecruiterService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      profile: this.recruiterService.getMyProfile().pipe(catchError(() => of(null))),
      stats:   this.statsService.getRecruiterStats().pipe(catchError(() => of(null))),
    }).subscribe(({ profile, stats }) => {
      if (profile) this.profile.set(profile.recruiter);
      if (stats)   this.stats.set(stats);
      this.loading.set(false);
    });
  }

  isExpired(): boolean {
    const exp = this.profile()?.access_expires_at;
    return !!exp && new Date(exp) < new Date();
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
