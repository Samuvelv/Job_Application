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

      <!-- Content stack -->
      <div class="d-flex flex-column align-items-center w-100" style="position:relative;z-index:1">

        <!-- Bold wordmark above card -->
        <div class="text-center mb-4">
          <div class="auth-wordmark">TalentHub</div>
          <div class="auth-tagline mt-2">Your hiring platform</div>
        </div>

        <!-- Login card -->
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

        </div><!-- /auth-card -->
      </div><!-- /content stack -->
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
