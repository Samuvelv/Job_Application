// src/app/shared/components/cookie-preferences-modal/cookie-preferences-modal.component.ts
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';

interface CategoryRow {
  key:         'preferences' | 'analytics' | 'marketing';
  icon:        string;
  label:       string;
  description: string;
  examples:    string;
}

const CATEGORY_ROWS: CategoryRow[] = [
  {
    key:         'preferences',
    icon:        'bi-palette',
    label:       'Preference Cookies',
    description: 'Remember your UI choices so they persist across browser sessions.',
    examples:    'Dark / light theme, sidebar collapse state.',
  },
  {
    key:         'analytics',
    icon:        'bi-bar-chart-line',
    label:       'Analytics Cookies',
    description: 'Help us understand how the application is used so we can improve it. No analytics provider is active at this time — this toggle will take effect when analytics are introduced.',
    examples:    'Page views, feature usage, error rates. No personal data is shared.',
  },
  {
    key:         'marketing',
    icon:        'bi-megaphone',
    label:       'Marketing Cookies',
    description: 'Used for personalised advertising and campaign measurement. No marketing cookies are currently set — this toggle is provided for future compliance.',
    examples:    'Ad personalisation, conversion tracking. Not currently in use.',
  },
];

@Component({
  selector: 'app-cookie-preferences-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (consent.showPreferencesModal()) {
      <!-- Backdrop -->
      <div class="modal-backdrop fade show" style="z-index:1050" (click)="close()"></div>

      <!-- Modal -->
      <div class="modal d-block cpm" tabindex="-1" style="z-index:1055" role="dialog"
           aria-modal="true" aria-labelledby="cpm-title">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable cpm__dialog">
          <div class="modal-content cpm__content">

            <!-- Header -->
            <div class="modal-header cpm__header">
              <div class="cpm__header-inner">
                <div class="cpm__header-icon" aria-hidden="true">
                  <i class="bi bi-shield-check"></i>
                </div>
                <div>
                  <h5 class="modal-title cpm__title" id="cpm-title">Cookie Preferences</h5>
                  <p class="cpm__subtitle">
                    Manage how this application uses cookies and local storage on your device.
                  </p>
                </div>
              </div>
              <button type="button" class="btn-close cpm__close" (click)="close()"
                      aria-label="Close cookie preferences"></button>
            </div>

            <!-- Body -->
            <div class="modal-body cpm__body">

              <!-- Consent expiry notice -->
              @if (expiryLabel()) {
                <div class="alert alert-info cpm__expiry-notice" role="status">
                  <i class="bi bi-calendar-check me-2"></i>
                  {{ expiryLabel() }}
                </div>
              }

              <!-- ── Always-on categories ─────────────────────────────────── -->
              <p class="cpm__section-label">Always Active</p>

              <div class="cpm__category cpm__category--fixed">
                <div class="cpm__category-left">
                  <div class="cpm__category-icon" aria-hidden="true">
                    <i class="bi bi-lock-fill"></i>
                  </div>
                  <div class="cpm__category-text">
                    <span class="cpm__category-name">Essential Cookies</span>
                    <span class="cpm__category-desc">
                      Required for the application to function. Includes CSRF protection,
                      secure routing, and core session management.
                    </span>
                    <span class="cpm__category-examples">
                      <i class="bi bi-info-circle me-1"></i>
                      Internal routing state. No personally identifiable data.
                    </span>
                  </div>
                </div>
                <div class="cpm__category-right">
                  <span class="cpm__always-active">
                    <i class="bi bi-check-circle-fill me-1"></i>Always Active
                  </span>
                </div>
              </div>

              <div class="cpm__category cpm__category--fixed">
                <div class="cpm__category-left">
                  <div class="cpm__category-icon" aria-hidden="true">
                    <i class="bi bi-key-fill"></i>
                  </div>
                  <div class="cpm__category-text">
                    <span class="cpm__category-name">Authentication &amp; Session Cookies</span>
                    <span class="cpm__category-desc">
                      Keeps you signed in across page loads. The refresh token is stored in an
                      HttpOnly cookie (server-managed, inaccessible to JavaScript). The access
                      token is held in localStorage and expires automatically.
                    </span>
                    <span class="cpm__category-examples">
                      <i class="bi bi-info-circle me-1"></i>
                      HttpOnly refresh token cookie (7-day expiry, Secure + SameSite=Strict in production).
                      Access token in localStorage (2-hour expiry).
                    </span>
                  </div>
                </div>
                <div class="cpm__category-right">
                  <span class="cpm__always-active">
                    <i class="bi bi-check-circle-fill me-1"></i>Always Active
                  </span>
                </div>
              </div>

              <!-- ── Toggleable categories ────────────────────────────────── -->
              <p class="cpm__section-label mt-3">Optional Cookies</p>

              @for (row of categoryRows; track row.key) {
                <div class="cpm__category"
                     [class.cpm__category--enabled]="toggles[row.key]">
                  <div class="cpm__category-left">
                    <div class="cpm__category-icon" aria-hidden="true">
                      <i class="bi" [ngClass]="row.icon"></i>
                    </div>
                    <div class="cpm__category-text">
                      <span class="cpm__category-name">{{ row.label }}</span>
                      <span class="cpm__category-desc">{{ row.description }}</span>
                      <span class="cpm__category-examples">
                        <i class="bi bi-info-circle me-1"></i>{{ row.examples }}
                      </span>
                    </div>
                  </div>
                  <div class="cpm__category-right">
                    <div class="form-check form-switch cpm__switch" [attr.title]="'Toggle ' + row.label">
                      <input
                        class="form-check-input cpm__switch-input"
                        type="checkbox"
                        role="switch"
                        [id]="'cpm-toggle-' + row.key"
                        [checked]="toggles[row.key]"
                        (change)="setToggle(row.key, $any($event.target).checked)"
                        [attr.aria-label]="'Enable ' + row.label"
                        [attr.aria-checked]="toggles[row.key]"
                      >
                    </div>
                  </div>
                </div>
              }

              <!-- Info note -->
              <div class="cpm__note">
                <i class="bi bi-info-circle me-2 flex-shrink-0"></i>
                <span>
                  Your preferences are stored locally on your device and will be remembered
                  for <strong>12 months</strong>. You can update them at any time from the
                  <strong>Manage Cookies</strong> link in the page footer.
                </span>
              </div>

            </div>

            <!-- Footer -->
            <div class="modal-footer cpm__footer">
              <button type="button" class="btn btn-outline-secondary btn-sm cpm__footer-btn"
                      (click)="close()">
                Cancel
              </button>
              <button type="button" class="btn btn-outline-secondary btn-sm cpm__footer-btn"
                      (click)="acceptAll()">
                <i class="bi bi-check2-all me-1"></i>Accept All
              </button>
              <button type="button" class="btn btn-primary btn-sm cpm__footer-btn cpm__footer-btn--save"
                      (click)="savePreferences()">
                <i class="bi bi-floppy me-1"></i>Save Preferences
              </button>
            </div>

          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Dialog sizing ──────────────────────────────────────────────────────── */
    .cpm__dialog {
      max-width: 640px;
    }

    /* ── Content card ───────────────────────────────────────────────────────── */
    .cpm__content {
      border-radius: 12px;
      background: var(--th-card-bg, #ffffff);
      border: 1px solid var(--th-border, #e5e7eb);
    }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    .cpm__header {
      border-bottom: 1px solid var(--th-border, #e5e7eb);
      padding: 1.25rem 1.5rem 1rem;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .cpm__header-inner {
      display: flex;
      align-items: flex-start;
      gap: 0.875rem;
      flex: 1;
    }

    .cpm__header-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(80, 70, 229, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--th-primary, #5046e5);
      font-size: 1.125rem;
      flex-shrink: 0;
    }

    .cpm__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--th-text, #111827);
      margin: 0 0 0.2rem;
    }

    .cpm__subtitle {
      font-size: 0.8125rem;
      color: var(--th-text-muted, #6b7280);
      margin: 0;
    }

    .cpm__close {
      margin: 0;
      flex-shrink: 0;
    }

    /* ── Body ────────────────────────────────────────────────────────────────── */
    .cpm__body {
      padding: 1.25rem 1.5rem;
    }

    .cpm__expiry-notice {
      font-size: 0.8125rem;
      padding: 0.625rem 0.875rem;
      border-radius: 8px;
      margin-bottom: 1.125rem;
    }

    .cpm__section-label {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--th-text-muted, #6b7280);
      margin: 0 0 0.625rem;
    }

    /* ── Category row ────────────────────────────────────────────────────────── */
    .cpm__category {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1rem;
      border-radius: 10px;
      border: 1px solid var(--th-border, #e5e7eb);
      background: var(--th-bg-subtle, #f9fafb);
      margin-bottom: 0.625rem;
      transition: border-color 0.15s, background 0.15s;
    }

    .cpm__category--fixed {
      border-color: var(--th-border, #e5e7eb);
    }

    .cpm__category--enabled {
      border-color: rgba(80, 70, 229, 0.35);
      background: rgba(80, 70, 229, 0.04);
    }

    .cpm__category-left {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .cpm__category-icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: rgba(80, 70, 229, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--th-primary, #5046e5);
      font-size: 0.9375rem;
      flex-shrink: 0;
    }

    .cpm__category--fixed .cpm__category-icon {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .cpm__category-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .cpm__category-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--th-text, #111827);
    }

    .cpm__category-desc {
      font-size: 0.8rem;
      color: var(--th-text-muted, #6b7280);
      line-height: 1.5;
    }

    .cpm__category-examples {
      font-size: 0.75rem;
      color: var(--th-text-muted, #9ca3af);
      line-height: 1.4;
      margin-top: 0.125rem;
    }

    /* ── Toggle switch ───────────────────────────────────────────────────────── */
    .cpm__category-right {
      flex-shrink: 0;
      padding-top: 0.125rem;
    }

    .cpm__always-active {
      font-size: 0.75rem;
      font-weight: 600;
      color: #059669;
      white-space: nowrap;
      display: flex;
      align-items: center;
    }

    .cpm__switch {
      margin: 0;
    }

    .cpm__switch-input {
      width: 2.25em;
      height: 1.25em;
      cursor: pointer;
    }

    .cpm__switch-input:checked {
      background-color: var(--th-primary, #5046e5);
      border-color: var(--th-primary, #5046e5);
    }

    .cpm__switch-input:focus {
      box-shadow: 0 0 0 0.2rem rgba(80, 70, 229, 0.25);
    }

    /* ── Info note ───────────────────────────────────────────────────────────── */
    .cpm__note {
      display: flex;
      align-items: flex-start;
      gap: 0;
      font-size: 0.8rem;
      color: var(--th-text-muted, #6b7280);
      background: var(--th-bg-subtle, #f9fafb);
      border: 1px solid var(--th-border, #e5e7eb);
      border-radius: 8px;
      padding: 0.75rem 0.875rem;
      margin-top: 1rem;
      line-height: 1.5;
    }

    /* ── Footer ─────────────────────────────────────────────────────────────── */
    .cpm__footer {
      border-top: 1px solid var(--th-border, #e5e7eb);
      padding: 0.875rem 1.5rem;
      gap: 0.5rem;
    }

    .cpm__footer-btn {
      font-size: 0.8125rem;
      border-radius: 6px;
    }

    .cpm__footer-btn--save {
      background-color: var(--th-primary, #5046e5);
      border-color: var(--th-primary, #5046e5);
    }

    .cpm__footer-btn--save:hover {
      background-color: var(--th-primary-hover, #4338ca);
      border-color: var(--th-primary-hover, #4338ca);
    }

    /* ── Responsive ─────────────────────────────────────────────────────────── */
    @media (max-width: 575.98px) {
      .cpm__dialog {
        margin: 0.5rem;
      }

      .cpm__header,
      .cpm__body,
      .cpm__footer {
        padding-left: 1rem;
        padding-right: 1rem;
      }

      .cpm__footer {
        flex-direction: column;
        align-items: stretch;
      }

      .cpm__footer-btn {
        width: 100%;
        text-align: center;
      }

      .cpm__category {
        flex-direction: column;
        gap: 0.625rem;
      }

      .cpm__category-right {
        align-self: flex-end;
      }
    }

    /* ── Dark theme ─────────────────────────────────────────────────────────── */
    :host-context([data-theme='dark']) .cpm__content {
      background: var(--th-card-bg, #1e2433);
      border-color: var(--th-border, #2e3650);
    }

    :host-context([data-theme='dark']) .cpm__header,
    :host-context([data-theme='dark']) .cpm__footer {
      border-color: var(--th-border, #2e3650);
    }

    :host-context([data-theme='dark']) .cpm__category {
      background: var(--th-bg-subtle, #252d40);
      border-color: var(--th-border, #2e3650);
    }

    :host-context([data-theme='dark']) .cpm__category--enabled {
      border-color: rgba(80, 70, 229, 0.4);
      background: rgba(80, 70, 229, 0.08);
    }

    :host-context([data-theme='dark']) .cpm__note {
      background: var(--th-bg-subtle, #252d40);
      border-color: var(--th-border, #2e3650);
    }

    :host-context([data-theme='dark']) .cpm__header-icon {
      background: rgba(80, 70, 229, 0.15);
    }
  `],
})
export class CookiePreferencesModalComponent {

  readonly categoryRows = CATEGORY_ROWS;

  /** Live toggle state — initialised from stored consent on open. */
  toggles: Record<'preferences' | 'analytics' | 'marketing', boolean> = {
    preferences: false,
    analytics:   false,
    marketing:   false,
  };

  constructor(public consent: CookieConsentService) {
    // Re-sync toggle state every time the modal is opened so the user always
    // sees their current saved preferences rather than stale in-memory state.
    effect(() => {
      if (consent.showPreferencesModal()) {
        this.syncTogglesFromStore();
      }
    });
  }

  /** Pre-fill toggles from the currently stored consent record. */
  private syncTogglesFromStore(): void {
    const prefs = this.consent.preferences();
    if (prefs) {
      this.toggles.preferences = prefs.preferences;
      this.toggles.analytics   = prefs.analytics;
      this.toggles.marketing   = prefs.marketing;
    } else {
      // No stored record — default toggles to off (conservative default)
      this.toggles = { preferences: false, analytics: false, marketing: false };
    }
  }

  /** Computed label showing when the current consent expires. */
  expiryLabel(): string {
    try {
      const raw = localStorage.getItem('th_cookie_consent');
      if (!raw) return '';
      const record = JSON.parse(raw) as { timestamp: string };
      const given      = new Date(record.timestamp);
      const expiresAt  = new Date(given);
      expiresAt.setMonth(expiresAt.getMonth() + 12);
      const formatted  = expiresAt.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      return `Your current consent was recorded on ${given.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} and will expire on ${formatted}.`;
    } catch {
      return '';
    }
  }

  setToggle(key: 'preferences' | 'analytics' | 'marketing', value: boolean): void {
    this.toggles = { ...this.toggles, [key]: value };
  }

  acceptAll(): void {
    this.consent.acceptAll();
    // consent.saveConsent already closes the modal via showPreferencesModal.set(false)
    // but acceptAll() doesn't — close it explicitly
    this.consent.showPreferencesModal.set(false);
  }

  savePreferences(): void {
    this.consent.saveConsent({
      preferences: this.toggles.preferences,
      analytics:   this.toggles.analytics,
      marketing:   this.toggles.marketing,
    });
    // saveConsent() calls showPreferencesModal.set(false) internally
  }

  close(): void {
    // Re-sync so stale in-memory toggle state is discarded on next open
    this.syncTogglesFromStore();
    this.consent.showPreferencesModal.set(false);
  }
}
