// src/app/features/auth/login/login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

      <!-- Two-column split -->
      <div class="auth-split" style="position:relative;z-index:1">

        <!-- Left panel — illustration -->
        <div class="auth-illustration-panel">
          <div class="auth-wordmark mb-1">TalentHub</div>
          <div class="auth-tagline mb-2">Your smart hiring platform</div>

          <!-- Person-at-desk hiring scene SVG -->
          <svg class="auth-hero-svg" viewBox="-20 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

            <!-- Floor shadow -->
            <ellipse cx="230" cy="388" rx="160" ry="10" fill="rgba(0,0,0,0.18)"/>

            <!-- Desk body -->
            <rect x="80" y="270" width="300" height="16" rx="6" fill="#312e81"/>
            <rect x="80" y="270" width="300" height="6" rx="3" fill="#4338ca"/>
            <!-- Desk legs -->
            <rect x="98"  y="286" width="14" height="90" rx="5" fill="#312e81"/>
            <rect x="348" y="286" width="14" height="90" rx="5" fill="#312e81"/>

            <!-- Monitor stand -->
            <rect x="218" y="240" width="24" height="32" rx="4" fill="#3730a3"/>
            <rect x="200" y="268" width="60" height="8" rx="4" fill="#3730a3"/>

            <!-- Monitor screen -->
            <rect x="130" y="130" width="200" height="118" rx="12" fill="#1e1b4b" stroke="#4f46e5" stroke-width="2"/>
            <rect x="138" y="138" width="184" height="102" rx="8" fill="#0f0c29"/>
            <!-- Screen glow -->
            <rect x="138" y="138" width="184" height="102" rx="8" fill="url(#screenGlow)" opacity="0.6"/>

            <!-- Screen content: resume / candidate card -->
            <rect x="148" y="148" width="164" height="82" rx="6" fill="rgba(99,102,241,0.12)" stroke="rgba(165,180,252,0.2)" stroke-width="1"/>
            <!-- Avatar on screen -->
            <circle cx="170" cy="174" r="14" fill="rgba(99,102,241,0.45)" stroke="rgba(165,180,252,0.5)" stroke-width="1.5"/>
            <!-- Head -->
            <circle cx="170" cy="170" r="6" fill="#c7d2fe"/>
            <!-- Shoulders -->
            <path d="M158 184 Q170 177 182 184" stroke="#a5b4fc" stroke-width="2" fill="none"/>
            <!-- Name line -->
            <rect x="192" y="164" width="100" height="7" rx="3" fill="rgba(165,180,252,0.75)"/>
            <rect x="192" y="176" width="68" height="5" rx="2.5" fill="rgba(165,180,252,0.38)"/>
            <!-- Tags on screen -->
            <rect x="192" y="188" width="38" height="14" rx="5" fill="rgba(16,185,129,0.35)"/>
            <text x="211" y="199" text-anchor="middle" font-size="7" fill="#34d399" font-family="sans-serif" font-weight="600">Hired</text>
            <rect x="236" y="188" width="46" height="14" rx="5" fill="rgba(6,182,212,0.3)"/>
            <text x="259" y="199" text-anchor="middle" font-size="7" fill="#67e8f9" font-family="sans-serif">Remote</text>
            <!-- Divider -->
            <line x1="148" y1="210" x2="312" y2="210" stroke="rgba(165,180,252,0.15)" stroke-width="1"/>
            <!-- Second row on screen -->
            <rect x="148" y="214" width="60" height="5" rx="2.5" fill="rgba(165,180,252,0.2)"/>
            <rect x="216" y="214" width="40" height="5" rx="2.5" fill="rgba(165,180,252,0.15)"/>

            <!-- Screen gradient def -->
            <defs>
              <radialGradient id="screenGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <!-- Keyboard -->
            <rect x="160" y="272" width="140" height="18" rx="5" fill="#2e2a6e" stroke="rgba(99,102,241,0.4)" stroke-width="1"/>
            <!-- Key rows -->
            <rect x="168" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="178" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="188" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="198" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="208" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="218" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="228" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="238" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="248" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="258" y="276" width="6" height="4" rx="1" fill="rgba(165,180,252,0.3)"/>
            <rect x="172" y="284" width="68" height="4" rx="1" fill="rgba(165,180,252,0.2)"/>
            <rect x="244" y="284" width="46" height="4" rx="1" fill="rgba(165,180,252,0.15)"/>

            <!-- Mouse -->
            <rect x="322" y="272" width="24" height="32" rx="12" fill="#2e2a6e" stroke="rgba(99,102,241,0.4)" stroke-width="1"/>
            <line x1="334" y1="272" x2="334" y2="288" stroke="rgba(165,180,252,0.3)" stroke-width="1"/>

            <!-- Coffee mug -->
            <rect x="360" y="250" width="22" height="26" rx="4" fill="#312e81" stroke="rgba(99,102,241,0.5)" stroke-width="1.5"/>
            <path d="M382 258 Q392 258 392 265 Q392 272 382 272" stroke="rgba(99,102,241,0.6)" stroke-width="2" fill="none"/>
            <!-- Steam -->
            <path d="M366 248 Q368 242 366 236" stroke="rgba(165,180,252,0.3)" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M372 246 Q374 240 372 234" stroke="rgba(165,180,252,0.25)" stroke-width="1.5" stroke-linecap="round"/>

            <!-- Person: chair -->
            <rect x="200" y="330" width="60" height="10" rx="5" fill="#2e2a6e" stroke="rgba(99,102,241,0.4)" stroke-width="1"/>
            <rect x="226" y="340" width="8" height="28" rx="3" fill="#2e2a6e"/>
            <!-- Chair back -->
            <rect x="205" y="295" width="50" height="38" rx="8" fill="#2e2a6e" stroke="rgba(99,102,241,0.3)" stroke-width="1"/>

            <!-- Person: torso -->
            <rect x="210" y="248" width="40" height="50" rx="10" fill="#4f46e5"/>
            <!-- Collar / shirt detail -->
            <path d="M224 248 L230 258 L236 248" fill="#312e81"/>

            <!-- Person: arms -->
            <!-- Left arm reaching to keyboard -->
            <path d="M210 262 Q185 268 175 280" stroke="#c7d2fe" stroke-width="10" stroke-linecap="round" fill="none"/>
            <!-- Right arm reaching to keyboard -->
            <path d="M250 262 Q268 268 278 280" stroke="#c7d2fe" stroke-width="10" stroke-linecap="round" fill="none"/>
            <!-- Hands -->
            <circle cx="172" cy="282" r="7" fill="#e0d8f0"/>
            <circle cx="281" cy="282" r="7" fill="#e0d8f0"/>

            <!-- Person: neck -->
            <rect x="224" y="236" width="12" height="14" rx="4" fill="#c7b8ea"/>

            <!-- Person: head -->
            <circle cx="230" cy="222" r="22" fill="#c7b8ea"/>
            <!-- Hair -->
            <path d="M208 218 Q210 198 230 200 Q250 198 252 218" fill="#312e81"/>
            <path d="M208 218 Q206 210 210 206" stroke="#312e81" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M252 218 Q254 210 250 206" stroke="#312e81" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- Eyes -->
            <circle cx="222" cy="222" r="3" fill="#1e1b4b"/>
            <circle cx="238" cy="222" r="3" fill="#1e1b4b"/>
            <!-- Eye shine -->
            <circle cx="223" cy="221" r="1" fill="white"/>
            <circle cx="239" cy="221" r="1" fill="white"/>
            <!-- Smile -->
            <path d="M222 230 Q230 236 238 230" stroke="#7c3aed" stroke-width="1.5" fill="none" stroke-linecap="round"/>

            <!-- Floating notification: "New Applicant!" -->
            <g class="auth-svg-float">
              <rect x="316" y="120" width="126" height="42" rx="10" fill="rgba(16,185,129,0.22)" stroke="rgba(52,211,153,0.45)" stroke-width="1.5"/>
              <circle cx="338" cy="141" r="10" fill="rgba(16,185,129,0.5)"/>
              <text x="338" y="145" text-anchor="middle" font-size="10" fill="white" font-family="sans-serif">✓</text>
              <text x="354" y="136" font-size="8.5" fill="#34d399" font-family="sans-serif" font-weight="700">New Applicant!</text>
              <text x="354" y="149" font-size="7.5" fill="rgba(52,211,153,0.8)" font-family="sans-serif">Sarah — UX Designer</text>
            </g>

            <!-- Floating badge: "3 Interviews Today" -->
            <g class="auth-svg-float-slow">
              <rect x="18" y="148" width="108" height="38" rx="10" fill="rgba(251,191,36,0.18)" stroke="rgba(251,191,36,0.4)" stroke-width="1.5"/>
              <circle cx="38" cy="167" r="10" fill="rgba(251,191,36,0.45)"/>
              <text x="38" y="171" text-anchor="middle" font-size="10" fill="#1e1b4b" font-family="sans-serif">📅</text>
              <text x="54" y="163" font-size="8.5" fill="#fbbf24" font-family="sans-serif" font-weight="700">3 Interviews</text>
              <text x="54" y="175" font-size="7.5" fill="rgba(251,191,36,0.75)" font-family="sans-serif">Scheduled today</text>
            </g>

            <!-- Floating badge: match score -->
            <g class="auth-svg-float">
              <rect x="340" y="220" width="100" height="36" rx="10" fill="rgba(99,102,241,0.22)" stroke="rgba(165,180,252,0.4)" stroke-width="1.5"/>
              <text x="390" y="235" text-anchor="middle" font-size="8" fill="rgba(165,180,252,0.85)" font-family="sans-serif">Match score</text>
              <text x="390" y="250" text-anchor="middle" font-size="13" fill="#a5b4fc" font-family="sans-serif" font-weight="800">94%</text>
            </g>

          </svg>

        </div>

        <!-- Right panel — login card -->
        <div class="auth-card w-100">

          <!-- Card heading -->
          <div class="mb-4">
            <div class="auth-card-title">Welcome back</div>
            <div class="auth-card-sub">Sign in to your account to continue</div>
          </div>

          <!-- Error alert -->
          @if (errorMsg) {
            <div class="auth-alert mb-4" role="alert">
              <i class="bi bi-exclamation-circle-fill" style="color:#f87171;flex-shrink:0;margin-top:.05rem"></i>
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

            <!-- Submit -->
            <button
              type="submit"
              class="btn btn-primary-gradient w-100 mt-2"
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

          <!-- Footer -->
          <p class="auth-footer-note mt-4 mb-0">
            <i class="bi bi-shield-lock-fill me-1"></i>Access is managed by your administrator.
          </p>

        </div><!-- /auth-card (right panel) -->
      </div><!-- /auth-split -->
    </div>
  `,
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading   = false;
  submitted = false;
  errorMsg  = '';
  showPassword = false;

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
  //   //   • contains "employee" or "emp" → employee
  //   //   • anything else → admin
  //   const email: string = (this.form.value.email ?? '').toLowerCase().trim();
  //   let role: 'admin' | 'employee' | 'recruiter' = 'admin';
  //   if (email.includes('recruiter')) {
  //     role = 'recruiter';
  //   } else if (email.includes('employee') || email.includes('emp')) {
  //     role = 'employee';
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
