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
import { TranslateModule } from '@ngx-translate/core';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LanguageSelectorComponent],
  styles: [`
    .auth-lang-bar {
      position: absolute;
      top: 1.25rem;
      right: 1.5rem;
      z-index: 10;
    }
  `],
  template: `
    <div class="auth-wrapper">

      <!-- Language selector — top-right, always visible -->
      <div class="auth-lang-bar">
        <app-language-selector></app-language-selector>
      </div>

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
              <div class="auth-card-logo__name">NTL Career <span>Nexus</span></div>
            </div>

            <!-- Heading -->
            <div class="auth-card-heading">
              <div class="auth-card-title">{{ 'AUTH.welcome_title' | translate }}</div>
              <div class="auth-card-sub">{{ 'AUTH.sign_in_subtitle' | translate }}</div>
            </div>

            @if (errorMsg) {
              <div class="auth-alert mb-3" role="alert">
                <i class="bi bi-exclamation-circle-fill" style="color:#f87171;flex-shrink:0"></i>
                <span class="flex-grow-1">{{ errorMsg }}</span>
                <button type="button" class="btn-close btn-sm" (click)="errorMsg = ''"></button>
              </div>
            }

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

              <!-- Email / Candidate ID -->
              <div class="auth-field">
                <label for="email" class="form-label">{{ 'AUTH.email_label' | translate }}</label>
                <div style="position:relative">
                  <i class="bi bi-person-circle auth-field-icon"></i>
                  <input
                    id="email"
                    type="text"
                    class="auth-underline-field"
                    [class.is-invalid]="submitted && f['email'].errors"
                    formControlName="email"
                    [placeholder]="'AUTH.email_placeholder' | translate"
                    autocomplete="username"
                  />
                  <span class="auth-field-underline"></span>
                </div>
                @if (submitted && f['email'].errors) {
                  <div class="invalid-feedback">
                    @if (f['email'].errors['required']) { {{ 'AUTH.email_required' | translate }} }
                  </div>
                }
              </div>

              <!-- Password -->
              <div class="auth-field">
                <label for="password" class="form-label">{{ 'AUTH.password_label' | translate }}</label>
                <div style="position:relative">
                  <i class="bi bi-lock auth-field-icon"></i>
                  <input
                    id="password"
                    [type]="showPassword ? 'text' : 'password'"
                    class="auth-underline-field"
                    [class.is-invalid]="submitted && f['password'].errors"
                    formControlName="password"
                    [placeholder]="'AUTH.password_placeholder' | translate"
                    autocomplete="current-password"
                  />
                  <span class="auth-field-underline"></span>
                  <button
                    type="button"
                    class="auth-toggle-btn"
                    (click)="showPassword = !showPassword"
                    tabindex="-1"
                    [title]="(showPassword ? 'AUTH.hide_password' : 'AUTH.show_password') | translate"
                  >
                    <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                @if (submitted && f['password'].errors) {
                  <div class="invalid-feedback">
                    @if (f['password'].errors['required']) { {{ 'AUTH.password_required' | translate }} }
                    @if (f['password'].errors['minlength']) { {{ 'AUTH.password_minlength' | translate }} }
                  </div>
                }
              </div>

              <!-- Forgot password -->
              <div class="auth-forgot">
                <a href="#" class="auth-forgot__link" (click)="showForgotPopup = true; $event.preventDefault()">{{ 'AUTH.forgot_password' | translate }}</a>
              </div>

              <!-- Sign In button -->
              <button
                type="submit"
                class="btn btn-primary-gradient w-100 mt-3"
                [disabled]="loading"
              >
                @if (loading) {
                  <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ 'AUTH.signing_in' | translate }}
                } @else {
                  <i class="bi bi-box-arrow-in-right me-2"></i>{{ 'AUTH.sign_in' | translate }}
                }
              </button>

            </form>

            <!-- Divider -->
            <div class="auth-divider">
              <span></span>
              <p>{{ 'AUTH.not_registered' | translate }}</p>
              <span></span>
            </div>

            <!-- Not registered section -->
            <div class="auth-register-note">
              <p class="auth-register-note__text">
                {{ 'AUTH.register_note' | translate }}
              </p>
              <div class="auth-register-note__btns">
                <a
                   class="auth-register-note__btn auth-register-note__btn--whatsapp"
                   [href]="'https://wa.me/' + whatsappPhone + '?text=Hi%2C%20I%20would%20like%20to%20register%20on%20NTL%20Career%20Nexus.%20I%20am%20a%20%5BCandidate%2FRecruiter%5D%20from%20%5BCountry%5D%20looking%20for%20opportunities%20in%20%5BTarget%20Country%5D.'"
                   target="_blank"
                   rel="noopener noreferrer"
                 >
                   <i class="bi bi-whatsapp"></i> {{ 'AUTH.whatsapp' | translate }}
                 </a>
                <a
                  class="auth-register-note__btn auth-register-note__btn--contact"
                  href="#contact"
                >
                  <i class="bi bi-envelope-fill"></i> {{ 'AUTH.contact_us' | translate }}
                </a>
              </div>
            </div>

            <!-- Footer -->
            <p class="auth-footer-note mt-3 mb-0">
              <i class="bi bi-shield-lock-fill me-1"></i>{{ 'AUTH.access_note' | translate }}
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
              <div class="auth-card-logo__name">NTL Career <span>Nexus</span></div>
            </div>

            <!-- Heading -->
            <div class="auth-card-heading">
              <div class="auth-card-title">{{ 'AUTH.otp_title' | translate }}</div>
              <div class="auth-card-sub">{{ 'AUTH.otp_subtitle' | translate }}</div>
            </div>

            <!-- Dev-mode banner -->
            @if (devOtp) {
              <div class="auth-alert mb-3" style="background:rgba(251,191,36,0.12);border-color:rgba(251,191,36,0.4)" role="alert">
                <i class="bi bi-bug-fill" style="color:#fbbf24;flex-shrink:0"></i>
                <span class="flex-grow-1"><strong style="color:#fbbf24">{{ 'AUTH.otp_dev_mode' | translate }}</strong> &mdash; OTP: <strong style="letter-spacing:2px">{{ devOtp }}</strong></span>
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
              <label for="otpInput" class="form-label">{{ 'AUTH.otp_label' | translate }}</label>
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
                <i class="bi bi-clock me-1"></i>{{ 'AUTH.otp_expires_in' | translate }}
                <strong style="color:{{ otpSecondsLeft <= 60 ? '#f87171' : 'rgba(165,180,252,0.8)' }}">
                  {{ formatCountdown(otpSecondsLeft) }}
                </strong>
              </p>
            } @else {
              <p class="text-center mb-2" style="font-size:0.8rem;color:#f87171">
                <i class="bi bi-exclamation-circle me-1"></i>{{ 'AUTH.otp_expired' | translate }}
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
                {{ 'AUTH.verifying' | translate }}
              } @else {
                <i class="bi bi-shield-check me-2"></i>{{ 'AUTH.verify_code' | translate }}
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
                  <i class="bi bi-arrow-clockwise me-1"></i>{{ 'AUTH.resend_in' | translate: { s: resendCooldown } }}
                } @else {
                  <i class="bi bi-arrow-clockwise me-1"></i>{{ 'AUTH.resend_code' | translate }}
                }
              </button>
              <button
                type="button"
                class="btn btn-link p-0"
                style="color:rgba(165,180,252,0.5);text-decoration:none"
                (click)="backToCredentials()"
              >
                <i class="bi bi-arrow-left me-1"></i>{{ 'AUTH.back' | translate }}
              </button>
            </div>

            <!-- Footer -->
            <p class="auth-footer-note mt-4 mb-0">
              <i class="bi bi-shield-lock-fill me-1"></i>{{ 'AUTH.otp_2fa_note' | translate }}
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
            <h4 class="auth-popup__title">{{ 'AUTH.forgot_title' | translate }}</h4>
            <p class="auth-popup__msg">{{ 'AUTH.forgot_msg' | translate }}</p>
            <button class="auth-popup__btn" (click)="onForgotOk()">
              {{ 'AUTH.forgot_ok' | translate }}
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

  // ── Configuration ───────────────────────────────────────────────────────────
  readonly whatsappPhone = environment.appConfig.whatsappPhone;

  private destroy$ = new Subject<void>();

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
      email:    ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.form.controls; }

  // ── Step 1: Credentials submit ───────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid) return;

    this.loading = true;
    sessionStorage.setItem('auth:pendingEmail', this.form.getRawValue().email);
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
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err) => {
        this.otpLoading = false;
        if (err?.status === 429) {
          // Locked — force back to credentials
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

  /**
   * Start OTP expiry countdown using RxJS interval.
   * Automatically cleaned up via takeUntil(destroy$).
   */
  private startExpiryCountdown(seconds: number): void {
    this.otpSecondsLeft = seconds;
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.otpSecondsLeft = Math.max(0, this.otpSecondsLeft - 1);
      });
  }

  /**
   * Start resend cooldown using RxJS interval.
   * Automatically cleaned up via takeUntil(destroy$).
   */
  private startResendCooldown(seconds: number): void {
    this.resendCooldown = seconds;
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resendCooldown = Math.max(0, this.resendCooldown - 1);
      });
  }
}
