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
      <!-- Animated floating orbs -->
      <div class="auth-orb auth-orb--1"></div>
      <div class="auth-orb auth-orb--2"></div>
      <div class="auth-orb auth-orb--3"></div>

      <div class="auth-card">

        <!-- Logo / Brand -->
        <div class="text-center mb-4">
          <div class="auth-brand-icon mb-3">
            <i class="bi bi-briefcase-fill text-white" style="font-size:1.5rem"></i>
          </div>
          <h1 class="auth-title mb-0">
            TalentHub
          </h1>
          <p class="text-muted small mt-1">Sign in to your account</p>
        </div>

        <!-- Error alert -->
        @if (errorMsg) {
          <div class="alert alert-danger alert-dismissible py-2 px-3 small" role="alert">
            <i class="bi bi-exclamation-circle me-1"></i>{{ errorMsg }}
            <button type="button" class="btn-close btn-sm" (click)="errorMsg = ''"></button>
          </div>
        }

        <!-- Login form -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

          <!-- Email -->
          <div class="mb-3">
            <label for="email" class="form-label">Email address</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-envelope"></i></span>
              <input
                id="email"
                type="email"
                class="form-control"
                [class.is-invalid]="submitted && f['email'].errors"
                formControlName="email"
                placeholder="admin@talenthub.com"
                autocomplete="email"
              />
              @if (submitted && f['email'].errors) {
                <div class="invalid-feedback">
                  @if (f['email'].errors['required']) { Email is required. }
                  @if (f['email'].errors['email']) { Enter a valid email address. }
                </div>
              }
            </div>
          </div>

          <!-- Password -->
          <div class="mb-4">
            <label for="password" class="form-label">Password</label>
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-lock"></i></span>
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                class="form-control"
                [class.is-invalid]="submitted && f['password'].errors"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              <button
                class="btn btn-outline-secondary"
                type="button"
                (click)="showPassword = !showPassword"
                tabindex="-1"
              >
                <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
              @if (submitted && f['password'].errors) {
                <div class="invalid-feedback">
                  @if (f['password'].errors['required']) { Password is required. }
                  @if (f['password'].errors['minlength']) { Minimum 6 characters. }
                </div>
              }
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn btn-primary-gradient w-100 py-2"
            [disabled]="loading"
          >
            @if (loading) {
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
              Signing in…
            } @else {
              <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
            }
          </button>

        </form>

        <p class="text-center text-muted small mt-4 mb-0">
          <i class="bi bi-shield-check me-1"></i>Access is provided by your administrator.
        </p>
      </div>
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

  onSubmit(): void {
    this.submitted = true;
    this.errorMsg  = '';

    if (this.form.invalid) return;

    // ── Mock login (no API required) ──────────────────────────────────────
    // Detect role from the email field:
    //   • contains "recruiter" → recruiter
    //   • contains "employee" or "emp" → employee
    //   • anything else → admin
    const email: string = (this.form.value.email ?? '').toLowerCase().trim();
    let role: 'admin' | 'employee' | 'recruiter' = 'admin';
    if (email.includes('recruiter')) {
      role = 'recruiter';
    } else if (email.includes('employee') || email.includes('emp')) {
      role = 'employee';
    }

    const mockUser = {
      id: 'mock-' + role + '-001',
      email: email || role + '@talenthub.com',
      role,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Write to localStorage so isLoggedIn() returns true and the shell renders
    localStorage.setItem('th_access_token', 'mock-token-' + role + '-' + Date.now());
    localStorage.setItem('th_user', JSON.stringify(mockUser));

    // Update the AuthService signal so getRole() / currentUser() reflect the mock user
    this.auth.currentUser.set(mockUser);

    this.router.navigate([this.auth.getDashboardRoute()]);
  }
}
