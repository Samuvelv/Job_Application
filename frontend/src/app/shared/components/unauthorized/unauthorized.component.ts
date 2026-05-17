// src/app/shared/components/unauthorized/unauthorized.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { RecruiterAccessRequestService } from '../../../core/services/recruiter-access-request.service';

type PageState = 'denied' | 'form' | 'success' | 'already-sent';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  styles: [`
    .unauth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px 16px; background: var(--th-bg); }
    .unauth-card { background: var(--th-surface); border: 1px solid var(--th-border); border-radius: 16px; padding: 40px 36px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 32px rgba(0,0,0,.06); }
    .unauth-icon { font-size: 48px; margin-bottom: 16px; }
    .unauth-title { font-size: 22px; font-weight: 700; color: var(--th-text); margin-bottom: 8px; }
    .unauth-desc { font-size: 14px; color: var(--th-muted); margin-bottom: 28px; }
    .form-label-sm { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--th-muted); display: block; text-align: left; margin-bottom: 4px; }
    .unauth-input { width: 100%; height: 40px; border-radius: 8px; border: 1px solid var(--th-border-strong); padding: 0 12px; font-size: 14px; background: var(--th-surface-2); color: var(--th-text); transition: border-color .15s; }
    .unauth-input:focus { outline: none; border-color: var(--th-primary); }
    .unauth-textarea { width: 100%; border-radius: 8px; border: 1px solid var(--th-border-strong); padding: 10px 12px; font-size: 14px; background: var(--th-surface-2); color: var(--th-text); resize: vertical; min-height: 96px; transition: border-color .15s; }
    .unauth-textarea:focus { outline: none; border-color: var(--th-primary); }
    .char-counter { font-size: 11px; color: var(--th-muted); text-align: right; margin-top: 2px; margin-bottom: 16px; }
    .err-text { font-size: 13px; color: var(--th-danger, #ef4444); margin-bottom: 10px; text-align: left; }
  `],
  template: `
    <div class="unauth-page">
      <div class="unauth-card">

        <!-- ── Generic Access Denied ── -->
        @if (pageState === 'denied') {
          <div class="unauth-icon"><i class="bi bi-shield-x text-danger"></i></div>
          <div class="unauth-title">Access Denied</div>
          <p class="unauth-desc">You don't have permission to view this page.</p>
          <a [routerLink]="dashRoute" class="btn btn-primary px-4">
            <i class="bi bi-arrow-left me-1"></i>Back to Dashboard
          </a>
        }

        <!-- ── Extension Request Form ── -->
        @if (pageState === 'form') {
          <div class="unauth-icon"><i class="bi bi-clock-history" style="color:var(--th-primary,#6366f1)"></i></div>
          <div class="unauth-title">Access Expired</div>
          <p class="unauth-desc">Your recruiter access has expired. Submit a request below and our team will review it shortly.</p>

          <form [formGroup]="reqForm" (ngSubmit)="onSubmit()" novalidate style="text-align:left">
            <label class="form-label-sm">Email</label>
            <input class="unauth-input mb-3" formControlName="email" type="email" readonly />

            <label class="form-label-sm mt-3">Message <span style="font-weight:400;text-transform:none;">(optional)</span></label>
            <textarea class="unauth-textarea" formControlName="message" maxlength="1000"
              placeholder="Add a brief note about why you need extended access…"></textarea>
            <div class="char-counter">{{ msgLength }}/1000</div>

            @if (submitError) {
              <div class="err-text">{{ submitError }}</div>
            }

            <button class="btn btn-primary w-100" type="submit" [disabled]="loading">
              @if (loading) { <span class="spinner-border spinner-border-sm me-2"></span> }
              Send Request
            </button>
          </form>
        }

        <!-- ── Success ── -->
        @if (pageState === 'success') {
          <div class="unauth-icon"><i class="bi bi-check-circle-fill text-success"></i></div>
          <div class="unauth-title">Request Sent</div>
          <p class="unauth-desc">Your access extension request has been submitted. We'll email you once it's been reviewed.</p>
          <a routerLink="/login" class="btn btn-outline-primary px-4">Back to Login</a>
        }

        <!-- ── Already Sent ── -->
        @if (pageState === 'already-sent') {
          <div class="unauth-icon"><i class="bi bi-info-circle-fill" style="color:var(--th-warning,#f59e0b)"></i></div>
          <div class="unauth-title">Already Submitted</div>
          <p class="unauth-desc">You already have a pending access extension request. We'll email you once it's been reviewed.</p>
          <a routerLink="/login" class="btn btn-outline-primary px-4">Back to Login</a>
        }

      </div>
    </div>
  `,
})
export class UnauthorizedComponent implements OnInit {
  pageState: PageState = 'denied';
  dashRoute: string;
  reqForm!: FormGroup;
  loading = false;
  submitError = '';

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private accessRequestSvc: RecruiterAccessRequestService,
  ) {
    this.dashRoute = auth.getDashboardRoute();
    const nav = history.state as { reason?: string } | undefined;
    if (nav?.reason === 'expired') {
      this.pageState = 'form';
    }
  }

  ngOnInit(): void {
    const email = sessionStorage.getItem('auth:pendingEmail') ?? '';
    sessionStorage.removeItem('auth:pendingEmail');
    this.reqForm = this.fb.group({
      email:   [email, [Validators.required, Validators.email]],
      message: [''],
    });
  }

  get msgLength(): number {
    return (this.reqForm.get('message')?.value as string | null)?.length ?? 0;
  }

  onSubmit(): void {
    this.reqForm.markAllAsTouched();
    if (this.reqForm.invalid) return;

    this.loading = true;
    this.submitError = '';
    const { email, message } = this.reqForm.getRawValue() as { email: string; message: string };

    this.accessRequestSvc.submit({ email, message: message || null }).subscribe({
      next: () => { this.loading = false; this.pageState = 'success'; },
      error: (err) => {
        this.loading = false;
        if (err?.status === 409) {
          this.pageState = 'already-sent';
        } else {
          this.submitError = err?.error?.message ?? 'Failed to submit. Please try again.';
        }
      },
    });
  }
}
