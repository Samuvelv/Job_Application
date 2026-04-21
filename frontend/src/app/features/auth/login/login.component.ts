// src/app/features/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">

      <!-- Wave blobs -->
      <div class="auth-orb auth-orb--1"></div>
      <div class="auth-orb auth-orb--2"></div>
      <div class="auth-orb auth-orb--3"></div>
      <div class="auth-orb auth-orb--4"></div>
      <div class="auth-orb auth-orb--5"></div>

      <!-- Floating particles -->
      <div class="auth-particle auth-particle--1"></div>
      <div class="auth-particle auth-particle--2"></div>
      <div class="auth-particle auth-particle--3"></div>
      <div class="auth-particle auth-particle--4"></div>
      <div class="auth-particle auth-particle--5"></div>
      <div class="auth-particle auth-particle--6"></div>

      <!-- Centered login card -->
      <div class="auth-split auth-split--centered" style="position:relative;z-index:1">

        <!-- Left panel removed -->
        <div style="display:none">
          <svg viewBox="0 0 1 1" aria-hidden="true">
            <defs>
              <linearGradient id="grad-bar-indigo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a78bfa"/>
              </linearGradient>
              <linearGradient id="grad-bar-emerald" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#10b981"/>
                <stop offset="100%" stop-color="#34d399"/>
              </linearGradient>
              <linearGradient id="grad-bar-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#06b6d4"/>
                <stop offset="100%" stop-color="#67e8f9"/>
              </linearGradient>
              <linearGradient id="grad-bar-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#fcd34d"/>
              </linearGradient>
              <linearGradient id="grad-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#a78bfa"/>
              </linearGradient>
              <radialGradient id="glow-center" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
              </radialGradient>
              <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#4f46e5" flood-opacity="0.22"/>
              </filter>
              <filter id="badge-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#6366f1" flood-opacity="0.35"/>
              </filter>
            </defs>

            <!-- Background ambient glow -->
            <ellipse cx="260" cy="210" rx="200" ry="160" fill="url(#glow-center)"/>

            <!-- ── Main dashboard card ────────────────────────────────────── -->
            <g transform="rotate(-3, 260, 210)" filter="url(#card-shadow)">
              <!-- Card body -->
              <rect x="60" y="60" width="380" height="280" rx="20" fill="rgba(30,27,75,0.72)" stroke="rgba(165,180,252,0.18)" stroke-width="1.5"/>
              <!-- Top sheen -->
              <rect x="60" y="60" width="380" height="40"  rx="20" fill="rgba(255,255,255,0.04)"/>
              <rect x="60" y="80" width="380" height="20"  fill="rgba(255,255,255,0.02)"/>

              <!-- Window dots + title bar -->
              <circle cx="86"  cy="82" r="5" fill="rgba(248,113,113,0.6)"/>
              <circle cx="102" cy="82" r="5" fill="rgba(251,191,36,0.6)"/>
              <circle cx="118" cy="82" r="5" fill="rgba(52,211,153,0.6)"/>
              <rect x="188" y="76" width="124" height="12" rx="6" fill="rgba(165,180,252,0.15)"/>

              <!-- Section label -->
              <text x="80" y="122" font-size="9" fill="rgba(165,180,252,0.55)" font-family="sans-serif" font-weight="600" letter-spacing="1.5">PLATFORM ACTIVITY</text>

              <!-- Stat rows — neutral, meaningful for both sides -->

              <!-- Jobs Available -->
              <text x="80" y="148" font-size="8.5" fill="rgba(165,180,252,0.7)" font-family="sans-serif">Jobs Available</text>
              <rect x="80" y="153" width="230" height="7" rx="3.5" fill="rgba(255,255,255,0.06)"/>
              <rect x="80" y="153" width="198" height="7" rx="3.5" fill="url(#grad-bar-indigo)"/>
              <text x="322" y="161" font-size="8" fill="#a5b4fc" font-family="sans-serif" font-weight="700">1,240</text>

              <!-- Applications Sent -->
              <text x="80" y="179" font-size="8.5" fill="rgba(165,180,252,0.7)" font-family="sans-serif">Applications Sent</text>
              <rect x="80" y="184" width="230" height="7" rx="3.5" fill="rgba(255,255,255,0.06)"/>
              <rect x="80" y="184" width="170" height="7" rx="3.5" fill="url(#grad-bar-cyan)"/>
              <text x="322" y="192" font-size="8" fill="#67e8f9" font-family="sans-serif" font-weight="700">856</text>

              <!-- Matches Made -->
              <text x="80" y="210" font-size="8.5" fill="rgba(165,180,252,0.7)" font-family="sans-serif">Matches Made</text>
              <rect x="80" y="215" width="230" height="7" rx="3.5" fill="rgba(255,255,255,0.06)"/>
              <rect x="80" y="215" width="120" height="7" rx="3.5" fill="url(#grad-bar-amber)"/>
              <text x="322" y="223" font-size="8" fill="#fcd34d" font-family="sans-serif" font-weight="700">342</text>

              <!-- Interviews Scheduled -->
              <text x="80" y="241" font-size="8.5" fill="rgba(165,180,252,0.7)" font-family="sans-serif">Interviews Scheduled</text>
              <rect x="80" y="246" width="230" height="7" rx="3.5" fill="rgba(255,255,255,0.06)"/>
              <rect x="80" y="246" width="72" height="7" rx="3.5" fill="url(#grad-bar-emerald)"/>
              <text x="322" y="254" font-size="8" fill="#34d399" font-family="sans-serif" font-weight="700">89</text>

              <!-- Divider -->
              <line x1="80" y1="272" x2="420" y2="272" stroke="rgba(165,180,252,0.10)" stroke-width="1"/>

              <!-- Bottom: active users row -->
              <text x="80" y="291" font-size="8" fill="rgba(165,180,252,0.45)" font-family="sans-serif" font-weight="600" letter-spacing="1">ACTIVE TODAY</text>

              <!-- Avatar stack -->
              <circle cx="92"  cy="316" r="12" fill="rgba(99,102,241,0.45)"  stroke="rgba(165,180,252,0.35)" stroke-width="1.5"/>
              <circle cx="92"  cy="313" r="5"  fill="#c7d2fe"/>
              <path   d="M82 323 Q92 317 102 323" stroke="#a5b4fc" stroke-width="1.5" fill="none"/>

              <circle cx="122" cy="316" r="12" fill="rgba(16,185,129,0.35)"   stroke="rgba(52,211,153,0.35)"  stroke-width="1.5"/>
              <circle cx="122" cy="313" r="5"  fill="#a7f3d0"/>
              <path   d="M112 323 Q122 317 132 323" stroke="#6ee7b7" stroke-width="1.5" fill="none"/>

              <circle cx="152" cy="316" r="12" fill="rgba(251,191,36,0.3)"    stroke="rgba(251,191,36,0.35)"  stroke-width="1.5"/>
              <circle cx="152" cy="313" r="5"  fill="#fde68a"/>
              <path   d="M142 323 Q152 317 162 323" stroke="#fcd34d" stroke-width="1.5" fill="none"/>

              <circle cx="182" cy="316" r="12" fill="rgba(6,182,212,0.3)"     stroke="rgba(6,182,212,0.35)"   stroke-width="1.5"/>
              <circle cx="182" cy="313" r="5"  fill="#a5f3fc"/>
              <path   d="M172 323 Q182 317 192 323" stroke="#67e8f9" stroke-width="1.5" fill="none"/>

              <circle cx="212" cy="316" r="12" fill="rgba(255,255,255,0.06)"  stroke="rgba(165,180,252,0.2)"  stroke-width="1.5"/>
              <text x="212" y="320" text-anchor="middle" font-size="8" fill="rgba(165,180,252,0.7)" font-family="sans-serif" font-weight="700">+94</text>

              <!-- Status chips -->
              <rect x="250" y="308" width="66" height="18" rx="9" fill="rgba(16,185,129,0.2)"  stroke="rgba(52,211,153,0.4)"    stroke-width="1"/>
              <text x="283" y="320" text-anchor="middle" font-size="7.5" fill="#34d399" font-family="sans-serif" font-weight="700">Recruiters</text>
              <rect x="324" y="308" width="60" height="18" rx="9" fill="rgba(99,102,241,0.2)"  stroke="rgba(165,180,252,0.35)"  stroke-width="1"/>
              <text x="354" y="320" text-anchor="middle" font-size="7.5" fill="#a5b4fc" font-family="sans-serif" font-weight="700">Seekers</text>
            </g>

            <!-- ── Match score donut (top-right) ─────────────────────────── -->
            <g class="auth-svg-float" transform="translate(392, 48)">
              <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(99,102,241,0.12)" stroke-width="8"/>
              <circle cx="44" cy="44" r="36" fill="none" stroke="url(#grad-ring)" stroke-width="8"
                stroke-dasharray="192 227" stroke-dashoffset="57" stroke-linecap="round"/>
              <circle cx="44" cy="44" r="26" fill="rgba(15,12,41,0.55)"/>
              <text x="44" y="41" text-anchor="middle" font-size="12" fill="#a5b4fc" font-family="sans-serif" font-weight="800">94%</text>
              <text x="44" y="53" text-anchor="middle" font-size="7"  fill="rgba(165,180,252,0.5)" font-family="sans-serif">match</text>
            </g>

            <!-- ── Floating badge: Great Match (both sides relate) ──────── -->
            <g class="auth-svg-float-slow" filter="url(#badge-glow)">
              <rect x="330" y="196" width="148" height="52" rx="14" fill="rgba(15,12,41,0.72)" stroke="rgba(52,211,153,0.45)" stroke-width="1.5"/>
              <rect x="330" y="209" width="3"   height="26" rx="1.5" fill="url(#grad-bar-emerald)"/>
              <circle cx="355" cy="222" r="11" fill="rgba(16,185,129,0.25)"/>
              <text x="355" y="226" text-anchor="middle" font-size="11" fill="#34d399" font-family="sans-serif">✓</text>
              <text x="372" y="217" font-size="8.5" fill="#34d399"              font-family="sans-serif" font-weight="700">Great Match!</text>
              <text x="372" y="231" font-size="7.5" fill="rgba(167,243,208,0.7)" font-family="sans-serif">Frontend Role · Remote</text>
              <text x="452" y="242" text-anchor="end" font-size="6.5" fill="rgba(165,180,252,0.35)" font-family="sans-serif">just now</text>
            </g>

            <!-- ── Floating badge: Interview Scheduled (both sides) ──────── -->
            <g class="auth-svg-float">
              <rect x="16" y="155" width="136" height="52" rx="14" fill="rgba(15,12,41,0.72)" stroke="rgba(251,191,36,0.4)" stroke-width="1.5"/>
              <rect x="16" y="168" width="3"   height="26" rx="1.5" fill="url(#grad-bar-amber)"/>
              <circle cx="42" cy="181" r="11" fill="rgba(251,191,36,0.22)"/>
              <text x="42" y="186" text-anchor="middle" font-size="13" fill="#fbbf24" font-family="sans-serif">⏰</text>
              <text x="60" y="176" font-size="8.5" fill="#fbbf24"              font-family="sans-serif" font-weight="700">Interview Set</text>
              <text x="60" y="190" font-size="7.5" fill="rgba(252,211,77,0.7)" font-family="sans-serif">Tomorrow · 10:00 AM</text>
            </g>

            <!-- ── Floating badge: Profile Viewed (job-seeker + recruiter) ── -->
            <g class="auth-svg-float-slow">
              <rect x="22" y="295" width="126" height="48" rx="14" fill="rgba(15,12,41,0.72)" stroke="rgba(6,182,212,0.38)" stroke-width="1.5"/>
              <rect x="22" y="307" width="3"   height="24" rx="1.5" fill="url(#grad-bar-cyan)"/>
              <circle cx="46" cy="319" r="11" fill="rgba(6,182,212,0.2)"/>
              <text x="46" y="323" text-anchor="middle" font-size="9" fill="#67e8f9" font-family="sans-serif" font-weight="800">48</text>
              <text x="63" y="314" font-size="8.5" fill="#67e8f9"              font-family="sans-serif" font-weight="700">Profile Views</text>
              <text x="63" y="327" font-size="7.5" fill="rgba(103,232,249,0.6)" font-family="sans-serif">↑ 12 this week</text>
            </g>

          </svg>

        </div>

        <!-- Login card -->
        <div class="auth-card auth-card--solo">

          <!-- Logo -->
          <div class="auth-card-logo">
            <div class="auth-card-logo__icon">
              <i class="bi bi-briefcase-fill"></i>
            </div>
            <div class="auth-card-logo__name">Talent<span>Hub</span></div>
          </div>

          <!-- Heading -->
          <div class="auth-card-heading">
            <div class="auth-card-title">Welcome to TalentHub</div>
            <div class="auth-card-sub">Sign in to your account</div>
          </div>

          <!-- Error alert -->
          @if (errorMsg) {
            <div class="auth-alert mb-3" role="alert">
              <i class="bi bi-exclamation-circle-fill" style="color:#f87171;flex-shrink:0"></i>
              <span class="flex-grow-1">{{ errorMsg }}</span>
              <button type="button" class="btn-close btn-sm" (click)="errorMsg = ''"></button>
            </div>
          }

          <!-- Form -->
          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

            <!-- Email -->
            <div class="auth-field">
              <label for="email" class="form-label">Email address</label>
              <div style="position:relative">
                <i class="bi bi-envelope auth-field-icon"></i>
                <input
                  id="email"
                  type="email"
                  class="auth-underline-field"
                  [class.is-invalid]="submitted && f['email'].errors"
                  formControlName="email"
                  placeholder="you@talenthub.com"
                  autocomplete="email"
                />
                <span class="auth-field-underline"></span>
              </div>
              @if (submitted && f['email'].errors) {
                <div class="invalid-feedback">
                  @if (f['email'].errors['required']) { Email is required. }
                  @if (f['email'].errors['email']) { Enter a valid email address. }
                </div>
              }
            </div>

            <!-- Password -->
            <div class="auth-field">
              <label for="password" class="form-label">Password</label>
              <div style="position:relative">
                <i class="bi bi-lock auth-field-icon"></i>
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  class="auth-underline-field"
                  [class.is-invalid]="submitted && f['password'].errors"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <span class="auth-field-underline"></span>
                <button
                  type="button"
                  class="auth-toggle-btn"
                  (click)="showPassword = !showPassword"
                  tabindex="-1"
                  [title]="showPassword ? 'Hide password' : 'Show password'"
                >
                  <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              @if (submitted && f['password'].errors) {
                <div class="invalid-feedback">
                  @if (f['password'].errors['required']) { Password is required. }
                  @if (f['password'].errors['minlength']) { Minimum 6 characters. }
                </div>
              }
            </div>

            <!-- Forgot password -->
            <div class="auth-forgot">
              <a href="#" class="auth-forgot__link" (click)="showForgotPopup = true; $event.preventDefault()">Forgot password?</a>
            </div>

            <!-- Sign In button -->
            <button
              type="submit"
              class="btn btn-primary-gradient w-100 mt-3"
              [disabled]="loading"
            >
              @if (loading) {
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing in&hellip;
              } @else {
                <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
              }
            </button>

          </form>

          <!-- Divider -->
          <div class="auth-divider">
            <span></span>
            <p>Not registered yet?</p>
            <span></span>
          </div>

          <!-- Not registered section -->
          <div class="auth-register-note">
            <p class="auth-register-note__text">
              Registration is by invitation only.<br>
              Contact our team to apply.
            </p>
            <div class="auth-register-note__btns">
              <a
                class="auth-register-note__btn auth-register-note__btn--whatsapp"
                href="https://wa.me/919360454326?text=Hi%2C%20I%20would%20like%20to%20register%20on%20TalentHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i class="bi bi-whatsapp"></i> WhatsApp
              </a>
              <a
                class="auth-register-note__btn auth-register-note__btn--contact"
                href="#contact"
              >
                <i class="bi bi-envelope-fill"></i> Contact Us
              </a>
            </div>
          </div>

          <!-- Footer -->
          <p class="auth-footer-note mt-3 mb-0">
            <i class="bi bi-shield-lock-fill me-1"></i>Access is managed by your administrator.
          </p>

        </div><!-- /auth-card -->
      </div><!-- /auth-split -->

      <!-- Forgot password popup -->
      @if (showForgotPopup) {
        <div class="auth-popup-overlay" (click)="showForgotPopup = false">
          <div class="auth-popup" (click)="$event.stopPropagation()">
            <div class="auth-popup__icon">
              <i class="bi bi-shield-lock-fill"></i>
            </div>
            <h4 class="auth-popup__title">Password Reset</h4>
            <p class="auth-popup__msg">
              Password resets are managed by our admin team only.<br>
              Please contact us and we'll get it sorted for you.
            </p>
            <button class="auth-popup__btn" (click)="onForgotOk()">
              Okay, Contact Admin
            </button>
          </div>
        </div>
      }

    </div>
  `,
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading      = false;
  submitted    = false;
  errorMsg     = '';
  showPassword = false;
  showForgotPopup = false;

  onForgotOk(): void {
    this.showForgotPopup = false;
    this.router.navigate(['/'], { fragment: 'contact' });
  }

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.getDashboardRoute()]);
      return;
    }

    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get f() { return this.form.controls; }

  // onSubmit(): void {
  //   this.submitted = true;
  //   this.errorMsg  = '';

  //   if (this.form.invalid) return;

  //   // ── Mock login (no API required) ──────────────────────────────────────
  //   // Detect role from the email field:
  //   //   • contains "recruiter" → recruiter
  //   //   • contains "candidate" or "emp" → candidate
  //   //   • anything else → admin
  //   const email: string = (this.form.value.email ?? '').toLowerCase().trim();
  //   let role: 'admin' | 'candidate' | 'recruiter' = 'admin';
  //   if (email.includes('recruiter')) {
  //     role = 'recruiter';
  //   } else if (email.includes('candidate') || email.includes('emp')) {
  //     role = 'candidate';
  //   }

  //   const mockUser = {
  //     id: 'mock-' + role + '-001',
  //     email: email || role + '@talenthub.com',
  //     role,
  //     is_active: true,
  //     created_at: new Date().toISOString(),
  //   };

  //   // Write to localStorage so isLoggedIn() returns true and the shell renders
  //   localStorage.setItem('th_access_token', 'mock-token-' + role + '-' + Date.now());
  //   localStorage.setItem('th_user', JSON.stringify(mockUser));

  //   // Update the AuthService signal so getRole() / currentUser() reflect the mock user
  //   this.auth.currentUser.set(mockUser);

  //   this.router.navigate([this.auth.getDashboardRoute()]);
  // }

  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid) return;

    this.loading = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message ?? 'Login failed. Please try again.';
      },
    });
  }
}
