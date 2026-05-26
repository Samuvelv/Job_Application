// src/app/shared/components/cookie-consent-banner/cookie-consent-banner.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!consent.consentGiven()) {
      <!-- Banner backdrop blur layer -->
      <div class="ccb-overlay" aria-hidden="true"></div>

      <!-- Banner -->
      <div class="ccb" role="region" aria-label="Cookie consent" aria-live="polite">
        <div class="ccb__inner">

          <!-- Icon + Text -->
          <div class="ccb__body">
            <div class="ccb__icon" aria-hidden="true">
              <i class="bi bi-cookie"></i>
            </div>
            <div class="ccb__text">
              <p class="ccb__title">We use cookies</p>
              <p class="ccb__desc">
                We use cookies and similar technologies to keep you signed in, remember your
                preferences, and improve your experience. Essential and authentication cookies
                are always active — they are required for the application to work.
                You can customise which optional cookies you allow.
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="ccb__actions">
            <button
              class="btn btn-outline-secondary btn-sm ccb__btn"
              type="button"
              (click)="openCustomize()"
              aria-label="Customise cookie preferences">
              <i class="bi bi-sliders me-1"></i>Customise
            </button>
            <button
              class="btn btn-outline-secondary btn-sm ccb__btn"
              type="button"
              (click)="rejectNonEssential()"
              aria-label="Reject non-essential cookies">
              Reject Non-Essential
            </button>
            <button
              class="btn btn-primary btn-sm ccb__btn ccb__btn--accept"
              type="button"
              (click)="acceptAll()"
              aria-label="Accept all cookies">
              <i class="bi bi-check2-circle me-1"></i>Accept All
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Overlay ──────────────────────────────────────────────────────────────── */
    .ccb-overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      z-index: 1039;
      pointer-events: none;
    }

    /* ── Banner wrapper ────────────────────────────────────────────────────────── */
    .ccb {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 1040;
      padding: 0 0 env(safe-area-inset-bottom, 0);
      animation: ccb-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    @keyframes ccb-slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    /* ── Inner card ───────────────────────────────────────────────────────────── */
    .ccb__inner {
      background: var(--th-card-bg, #ffffff);
      border-top: 1px solid var(--th-border, #e5e7eb);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    /* ── Body (icon + text) ────────────────────────────────────────────────────── */
    .ccb__body {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      flex: 1 1 0;
      min-width: 260px;
    }

    .ccb__icon {
      font-size: 1.75rem;
      line-height: 1;
      color: var(--th-primary, #5046e5);
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .ccb__text {
      flex: 1;
    }

    .ccb__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--th-text, #111827);
      margin: 0 0 0.25rem;
    }

    .ccb__desc {
      font-size: 0.8125rem;
      color: var(--th-text-muted, #6b7280);
      margin: 0;
      line-height: 1.55;
    }

    /* ── Actions ──────────────────────────────────────────────────────────────── */
    .ccb__actions {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-shrink: 0;
      flex-wrap: wrap;
    }

    .ccb__btn {
      white-space: nowrap;
      font-size: 0.8125rem;
      border-radius: 6px;
      padding: 0.4rem 0.875rem;
    }

    .ccb__btn--accept {
      background-color: var(--th-primary, #5046e5);
      border-color: var(--th-primary, #5046e5);
    }

    .ccb__btn--accept:hover {
      background-color: var(--th-primary-hover, #4338ca);
      border-color: var(--th-primary-hover, #4338ca);
    }

    /* ── Responsive ────────────────────────────────────────────────────────────── */
    @media (max-width: 767.98px) {
      .ccb__inner {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        padding: 1rem;
      }

      .ccb__actions {
        flex-direction: column;
        width: 100%;
      }

      .ccb__btn {
        width: 100%;
        justify-content: center;
        text-align: center;
        padding: 0.5rem 1rem;
      }
    }

    /* ── Dark theme ─────────────────────────────────────────────────────────── */
    :host-context([data-theme='dark']) .ccb__inner {
      background: var(--th-card-bg, #1e2433);
      border-top-color: var(--th-border, #2e3650);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
    }
  `],
})
export class CookieConsentBannerComponent {
  constructor(public consent: CookieConsentService) {}

  acceptAll(): void {
    this.consent.acceptAll();
  }

  rejectNonEssential(): void {
    this.consent.rejectNonEssential();
  }

  openCustomize(): void {
    this.consent.showPreferencesModal.set(true);
  }
}
