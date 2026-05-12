// src/app/features/auth/login/login.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
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
              <linearGradient id="grad-ring" x1="0%" y1="100%" x2="100%" y2="0%">
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
          </svg>
        </div>

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- CREDENTIALS VIEW                                                   -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        @if (view === 'credentials') {
          <div class="auth-card auth-card--solo">

            <!-- Logo -->
            <div class="auth-card-logo">
              <div class="auth-card-logo__icon">
                <i class="bi bi-briefcase-fill"></i>
              </div>
              <div class="auth-card-logo__name">NTL Career<span>Nexus</span></div>
            </div>

            <!-- Heading -->
            <div class="auth-card-heading">
              <div class="auth-card-title">Welcome to NTL Career Nexus</div>
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
                    placeholder="you@example.com"
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
                Registration is managed by our team. Contact us via WhatsApp or the form below to apply.
              </p>
              <div class="auth-register-note__btns">
                <a
                  class="auth-register-note__btn auth-register-note__btn--whatsapp"
                  href="https://wa.me/919360454326?text=Hi%2C%20I%20would%20like%20to%20register%20on%20NTL%20Career%20Nexus.%20I%20am%20a%20%5BCandidate%2FRecruiter%5D%20from%20%5BCountry%5D%20looking%20for%20opportunities%20in%20%5BTarget%20Country%5D."
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

          </div><!-- /auth-card credentials -->
        }

        <!-- ══════════════════════════════════════════════════════════════════ -->
        <!-- OTP VIEW                                                            -->
        <!-- ══════════════════════════════════════════════════════════════════ -->
        @if (view === 'otp') {
          <div class="auth-card auth-card--solo">

            <!-- Logo -->
            <div class="auth-card-logo">
              <div class="auth-card-logo__icon">
                <i class="bi bi-briefcase-fill"></i>
              </div>
              <div class="auth-card-logo__name">NTL Career<span>Nexus</span></div>
            </div>

            <!-- Heading -->
            <div class="auth-card-heading">
              <div class="auth-card-title">Two-Factor Verification</div>
              <div class="auth-card-sub">Enter the 6-digit code to complete sign-in</div>
            </div>

            <!-- Dev-mode banner -->
            @if (devOtp) {
              <div class="auth-alert mb-3" style="background:rgba(251,191,36,0.12);border-color:rgba(251,191,36,0.4)" role="alert">
                <i class="bi bi-bug-fill" style="color:#fbbf24;flex-shrink:0"></i>
                <span class="flex-grow-1"><strong style="color:#fbbf24">DEV MODE</strong> &mdash; OTP: <strong style="letter-spacing:2px">{{ devOtp }}</strong></span>
              </div>
            }

            <!-- Error alert -->
            @if (otpError) {
              <div class="auth-alert mb-3" role="alert">
                <i class="bi bi-exclamation-circle-fill" style="color:#f87171;flex-shrink:0"></i>
                <span class="flex-grow-1">{{ otpError }}</span>
                <button type="button" class="btn-close btn-sm" (click)="otpError = ''"></button>
              </div>
            }

            <!-- OTP input -->
            <div class="auth-field">
              <label for="otpInput" class="form-label">Verification Code</label>
              <div style="position:relative">
                <i class="bi bi-shield-lock auth-field-icon"></i>
                <input
                  id="otpInput"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  class="auth-underline-field"
                  style="letter-spacing:0.35em;font-size:1.25rem;text-align:center"
                  [class.is-invalid]="otpError && otpValue.length > 0"
                  [value]="otpValue"
                  (input)="otpValue = $any($event.target).value"
                  placeholder="000000"
                  autocomplete="one-time-code"
                  (keyup.enter)="onVerifyOtp()"
                />
                <span class="auth-field-underline"></span>
              </div>
            </div>

            <!-- Expiry countdown -->
            @if (otpSecondsLeft > 0) {
              <p class="text-center mb-2" style="font-size:0.8rem;color:rgba(165,180,252,0.55)">
                <i class="bi bi-clock me-1"></i>Code expires in
                <strong style="color:{{ otpSecondsLeft <= 60 ? '#f87171' : 'rgba(165,180,252,0.8)' }}">
                  {{ formatCountdown(otpSecondsLeft) }}
                </strong>
              </p>
            } @else {
              <p class="text-center mb-2" style="font-size:0.8rem;color:#f87171">
                <i class="bi bi-exclamation-circle me-1"></i>Code expired. Please resend or go back.
              </p>
            }

            <!-- Verify button -->
            <button
              type="button"
              class="btn btn-primary-gradient w-100 mt-1"
              [disabled]="otpLoading || otpValue.length !== 6"
              (click)="onVerifyOtp()"
            >
              @if (otpLoading) {
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Verifying&hellip;
              } @else {
                <i class="bi bi-shield-check me-2"></i>Verify Code
              }
            </button>

            <!-- Resend + back row -->
            <div class="d-flex justify-content-between align-items-center mt-3" style="font-size:0.85rem">
              <button
                type="button"
                class="btn btn-link p-0"
                style="color:rgba(165,180,252,0.7);text-decoration:none"
                [disabled]="resendCooldown > 0 || otpLoading"
                (click)="onResendOtp()"
              >
                @if (resendCooldown > 0) {
                  <i class="bi bi-arrow-clockwise me-1"></i>Resend in {{ resendCooldown }}s
                } @else {
                  <i class="bi bi-arrow-clockwise me-1"></i>Resend code
                }
              </button>
              <button
                type="button"
                class="btn btn-link p-0"
                style="color:rgba(165,180,252,0.5);text-decoration:none"
                (click)="backToCredentials()"
              >
                <i class="bi bi-arrow-left me-1"></i>Back
              </button>
            </div>

            <!-- Footer -->
            <p class="auth-footer-note mt-4 mb-0">
              <i class="bi bi-shield-lock-fill me-1"></i>Admin accounts require two-factor authentication.
            </p>

          </div><!-- /auth-card otp -->
        }

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
export class LoginComponent implements OnInit, OnDestroy {
  // ── Credentials view state ──────────────────────────────────────────────────
  form!: FormGroup;
  loading         = false;
  submitted       = false;
  errorMsg        = '';
  showPassword    = false;
  showForgotPopup = false;

  // ── OTP view state ──────────────────────────────────────────────────────────
  view: 'credentials' | 'otp' = 'credentials';
  otpToken        = '';
  devOtp          = '';
  otpValue        = '';
  otpError        = '';
  otpLoading      = false;
  otpSecondsLeft  = 0;
  resendCooldown  = 0;

  private expiryInterval: ReturnType<typeof setInterval> | null = null;
  private resendInterval: ReturnType<typeof setInterval> | null = null;

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

  ngOnDestroy(): void {
    this.clearIntervals();
  }

  get f() { return this.form.controls; }

  // ── Step 1: Credentials submit ───────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid) return;

    this.loading = true;
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading = false;
        if ('requiresOtp' in res) {
          // Admin — transition to OTP view
          this.otpToken = res.otpToken;
          this.devOtp   = res.devOtp ?? '';
          this.startExpiryCountdown(res.expiresInSeconds);
          this.startResendCooldown(30);
          this.view = 'otp';
        } else {
          // Non-admin — go directly to dashboard
          this.router.navigate([this.auth.getDashboardRoute()]);
        }
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message ?? 'Login failed. Please try again.';
      },
    });
  }

  // ── Step 2: OTP verify ───────────────────────────────────────────────────────
  onVerifyOtp(): void {
    this.otpError = '';
    if (this.otpValue.length !== 6) return;

    this.otpLoading = true;
    this.auth.verifyOtp(this.otpToken, this.otpValue).subscribe({
      next: () => {
        this.otpLoading = false;
        this.clearIntervals();
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err) => {
        this.otpLoading = false;
        if (err?.status === 429) {
          // Locked — force back to credentials
          this.clearIntervals();
          this.view     = 'credentials';
          this.errorMsg = err?.error?.message ?? 'Too many incorrect attempts. Please log in again.';
        } else {
          this.otpError = err?.error?.message ?? 'Verification failed. Please try again.';
          this.otpValue = '';
        }
      },
    });
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  onResendOtp(): void {
    if (this.resendCooldown > 0) return;

    this.otpError = '';
    this.auth.resendOtp(this.otpToken).subscribe({
      next: (res) => {
        this.otpToken = res.otpToken;
        this.devOtp   = res.devOtp ?? '';
        this.otpValue = '';
        this.clearExpiryInterval();
        this.startExpiryCountdown(res.expiresInSeconds);
        this.startResendCooldown(30);
      },
      error: (err) => {
        this.otpError = err?.error?.message ?? 'Failed to resend code. Please try again.';
      },
    });
  }

  // ── Back to credentials ──────────────────────────────────────────────────────
  backToCredentials(): void {
    this.clearIntervals();
    this.otpToken      = '';
    this.devOtp        = '';
    this.otpValue      = '';
    this.otpError      = '';
    this.otpSecondsLeft = 0;
    this.resendCooldown = 0;
    this.view           = 'credentials';
  }

  // ── Countdown helpers ────────────────────────────────────────────────────────
  formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  private startExpiryCountdown(seconds: number): void {
    this.clearExpiryInterval();
    this.otpSecondsLeft = seconds;
    this.expiryInterval = setInterval(() => {
      this.otpSecondsLeft = Math.max(0, this.otpSecondsLeft - 1);
      if (this.otpSecondsLeft === 0) this.clearExpiryInterval();
    }, 1000);
  }

  private startResendCooldown(seconds: number): void {
    this.clearResendInterval();
    this.resendCooldown = seconds;
    this.resendInterval = setInterval(() => {
      this.resendCooldown = Math.max(0, this.resendCooldown - 1);
      if (this.resendCooldown === 0) this.clearResendInterval();
    }, 1000);
  }

  private clearExpiryInterval(): void {
    if (this.expiryInterval) { clearInterval(this.expiryInterval); this.expiryInterval = null; }
  }

  private clearResendInterval(): void {
    if (this.resendInterval) { clearInterval(this.resendInterval); this.resendInterval = null; }
  }

  private clearIntervals(): void {
    this.clearExpiryInterval();
    this.clearResendInterval();
  }
}
