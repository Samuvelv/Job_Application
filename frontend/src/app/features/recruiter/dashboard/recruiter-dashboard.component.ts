// src/app/features/recruiter/dashboard/recruiter-dashboard.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService, RecruiterStats } from '../../../core/services/stats.service';
import { RecruiterService } from '../../../core/services/recruiter.service';

@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- ── Welcome Hero ──────────────────────────────────────────────────── -->
    <div class="dash-hero" style="background:var(--th-gradient-purple);background-size:200% 200%">
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
        <div>
          <div class="dash-hero__greeting">Recruiter Portal</div>
           <h1 class="dash-hero__title mb-0">Good {{ timeOfDay() }},</h1>
           <div class="dash-hero__subtitle mt-1">{{ contactName() }}</div>
          <div class="dash-hero__meta">
            <span class="dash-hero__chip">
              <i class="bi bi-calendar3"></i>{{ today() }}
            </span>
            <span class="dash-hero__badge">
              <i class="bi bi-search-heart"></i>Talent Recruiter
            </span>
          </div>
        </div>
        <div class="d-flex flex-column align-items-end gap-1">
          <div class="dash-hero__stat">
            <div class="dash-hero__stat-value">{{ stats()?.candidatesAvailable ?? '—' }}</div>
            <div class="dash-hero__stat-label">Candidates Available</div>
          </div>
        </div>
      </div>
      <div class="dash-hero__actions">
        <a routerLink="/recruiter/candidates" class="dash-hero__btn dash-hero__btn--solid">
          <i class="bi bi-search"></i>Search Talent
        </a>
        <a routerLink="/recruiter/shortlist" class="dash-hero__btn">
          <i class="bi bi-bookmark-star-fill"></i>My Shortlist
          @if ((stats()?.shortlistCount ?? 0) > 0) {
            <span class="badge rounded-pill ms-1"
              style="background:rgba(255,255,255,.25);font-size:.65rem">
              {{ stats()?.shortlistCount }}
            </span>
          }
        </a>
      </div>
    </div>

    <!-- ── Stats Bento ──────────────────────────────────────────────────── -->
    <div class="bento-grid mb-4">

      <!-- Shortlist — wide card with saved count emphasis -->
      <div class="bento-6">
        <div class="stat-card-xl stat-card-xl--purple h-100">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-bookmark-star-fill"></i>
            </div>
            <a routerLink="/recruiter/shortlist"
              style="font-size:.72rem;color:#5b21b6;font-weight:600;text-decoration:none;
                background:rgba(139,92,246,.10);padding:.2rem .625rem;border-radius:999px;border:1px solid rgba(139,92,246,.2)">
              View all <i class="bi bi-arrow-right ms-1"></i>
            </a>
          </div>
          <div class="stat-card-xl__value">
            @if (loading()) {
              <span class="skeleton" style="width:80px;height:40px;display:block"></span>
            } @else {
              {{ stats()?.shortlistCount ?? 0 }}
            }
          </div>
          <div class="stat-card-xl__label">Saved in Shortlist</div>
          <div class="stat-card-xl__trend" style="background:rgba(139,92,246,.10);color:#5b21b6">
            <i class="bi bi-bookmark-check-fill"></i>Candidates saved
          </div>
        </div>
      </div>

      <!-- Candidates Available -->
      <div class="bento-6">
        <div class="stat-card-xl stat-card-xl--info h-100">
          <div class="stat-card-xl__header">
            <div class="stat-card-xl__icon">
              <i class="bi bi-people-fill"></i>
            </div>
            <a routerLink="/recruiter/candidates"
              style="font-size:.72rem;color:#0e7490;font-weight:600;text-decoration:none;
                background:rgba(6,182,212,.10);padding:.2rem .625rem;border-radius:999px;border:1px solid rgba(6,182,212,.2)">
              Search <i class="bi bi-arrow-right ms-1"></i>
            </a>
          </div>
          <div class="stat-card-xl__value">
            @if (loading()) {
              <span class="skeleton" style="width:80px;height:40px;display:block"></span>
            } @else {
              {{ stats()?.candidatesAvailable ?? 0 }}
            }
          </div>
          <div class="stat-card-xl__label">Candidates Available</div>
          <div class="stat-card-xl__trend" style="background:rgba(6,182,212,.10);color:#0e7490">
            <i class="bi bi-search"></i>Ready to discover
          </div>
        </div>
      </div>

    </div>

    <!-- ── Feature Cards ────────────────────────────────────────────────── -->
    <div class="mb-3">
      <div class="section-title">
        <i class="bi bi-lightning-charge-fill" style="color:var(--th-violet)"></i>
        Quick Actions
      </div>
    </div>

    <div class="row g-3 mb-2">
      <!-- Search Talent feature card -->
      <div class="col-md-6">
        <div class="card p-0 h-100"
          style="border-radius:var(--th-radius-xl);overflow:hidden;border:1px solid var(--th-border);
            box-shadow:var(--th-shadow-sm);transition:var(--th-transition)"
          onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='var(--th-shadow-info)'"
          onmouseout="this.style.transform='';this.style.boxShadow='var(--th-shadow-sm)'">
          <!-- Top gradient band -->
          <div style="height:6px;background:var(--th-gradient-info)"></div>
          <div class="p-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div style="width:48px;height:48px;border-radius:var(--th-radius);background:var(--th-gradient-info);
                display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.25rem;
                box-shadow:0 4px 14px rgba(6,182,212,.3)">
                <i class="bi bi-search"></i>
              </div>
              <div>
                <div style="font-size:1rem;font-weight:700;color:var(--th-text)">Search Talent</div>
                <div style="font-size:.75rem;color:var(--th-muted)">Find your perfect candidate</div>
              </div>
            </div>
            <p style="font-size:.8125rem;color:var(--th-text-secondary);line-height:1.6;margin-bottom:1.25rem">
              Filter candidates by skills, location, industry, experience, and more. Build your ideal team.
            </p>
            <div class="d-flex flex-wrap gap-1 mb-3">
              @for (tag of searchTags; track tag) {
                <span style="font-size:.7rem;padding:.2rem .6rem;border-radius:999px;
                  background:var(--th-cyan-soft);color:var(--th-cyan);border:1px solid rgba(6,182,212,.2)">
                  {{ tag }}
                </span>
              }
            </div>
            <a routerLink="/recruiter/candidates" class="btn btn-info btn-sm w-100">
              <i class="bi bi-search me-2"></i>Start Searching
            </a>
          </div>
        </div>
      </div>

      <!-- My Shortlist feature card -->
      <div class="col-md-6">
        <div class="card p-0 h-100"
          style="border-radius:var(--th-radius-xl);overflow:hidden;border:1px solid var(--th-border);
            box-shadow:var(--th-shadow-sm);transition:var(--th-transition)"
          onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='var(--th-shadow-purple)'"
          onmouseout="this.style.transform='';this.style.boxShadow='var(--th-shadow-sm)'">
          <!-- Top gradient band -->
          <div style="height:6px;background:var(--th-gradient-purple)"></div>
          <div class="p-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div style="width:48px;height:48px;border-radius:var(--th-radius);background:var(--th-gradient-purple);
                display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.25rem;
                box-shadow:0 4px 14px rgba(139,92,246,.3);position:relative">
                <i class="bi bi-bookmark-star-fill"></i>
                @if ((stats()?.shortlistCount ?? 0) > 0) {
                  <span style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;
                    border-radius:50%;background:#fff;color:var(--th-violet);font-size:.65rem;
                    font-weight:800;display:flex;align-items:center;justify-content:center;
                    border:2px solid var(--th-violet);line-height:1">
                    {{ stats()?.shortlistCount }}
                  </span>
                }
              </div>
              <div>
                <div style="font-size:1rem;font-weight:700;color:var(--th-text)">My Shortlist</div>
                <div style="font-size:.75rem;color:var(--th-muted)">Your saved candidates</div>
              </div>
            </div>
            <p style="font-size:.8125rem;color:var(--th-text-secondary);line-height:1.6;margin-bottom:1.25rem">
              Review and manage the candidates you've saved. Compare profiles and make hiring decisions.
            </p>
            @if ((stats()?.shortlistCount ?? 0) === 0) {
              <div style="font-size:.8125rem;color:var(--th-muted);text-align:center;
                padding:.75rem;background:var(--th-surface-raised);border-radius:var(--th-radius);
                border:1px dashed var(--th-border);margin-bottom:1.25rem">
                <i class="bi bi-bookmark me-1"></i>No candidates saved yet
              </div>
            }
            <a routerLink="/recruiter/shortlist" class="btn btn-sm w-100"
              style="background:var(--th-gradient-purple);color:#fff;border:none">
              <i class="bi bi-bookmark-star me-2"></i>View Shortlist
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RecruiterDashboardComponent implements OnInit {
  stats   = signal<RecruiterStats | null>(null);
  loading = signal(true);
  contactName = signal<string>('');

  readonly searchTags = ['Skills', 'Location', 'Experience', 'Industry', 'Salary'];

  constructor(
    private auth: AuthService,
    private statsService: StatsService,
    private recruiterService: RecruiterService,
  ) {}

  ngOnInit(): void {
    // Load recruiter profile for contact name
    this.recruiterService.getMyProfile().subscribe({
      next: (res) => {
        this.contactName.set(res.recruiter.contact_name);
      },
      error: () => {
        // Fallback to email if profile fetch fails
        this.contactName.set(this.auth.currentUser()?.email ?? '');
      },
    });

    this.statsService.getRecruiterStats().subscribe({
      next:  s => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  email(): string { return this.auth.currentUser()?.email ?? ''; }

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
