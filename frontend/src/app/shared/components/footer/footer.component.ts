// src/app/shared/components/footer/footer.component.ts
import { Component } from '@angular/core';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer" role="contentinfo">
      <span class="app-footer__copy">
        &copy; {{ year }} NTL Career Nexus. All rights reserved.
      </span>
      <span class="app-footer__sep" aria-hidden="true">&middot;</span>
      <button
        type="button"
        class="app-footer__link"
        (click)="openCookiePreferences()"
        aria-label="Manage cookie preferences">
        <i class="bi bi-cookie me-1" aria-hidden="true"></i>Manage Cookies
      </button>
    </footer>
  `,
  styles: [`
    .app-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.375rem 0.75rem;
      padding: 0.875rem 1.5rem;
      border-top: 1px solid var(--th-border, #e5e7eb);
      background: var(--th-card-bg, #ffffff);
      font-size: 0.8125rem;
      color: var(--th-text-muted, #6b7280);
    }

    .app-footer__copy {
      white-space: nowrap;
    }

    .app-footer__sep {
      color: var(--th-border, #d1d5db);
    }

    .app-footer__link {
      background: none;
      border: none;
      padding: 0;
      font-size: 0.8125rem;
      color: var(--th-primary, #5046e5);
      cursor: pointer;
      text-decoration: none;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 0;
      transition: opacity 0.15s;
    }

    .app-footer__link:hover {
      opacity: 0.75;
      text-decoration: underline;
    }

    .app-footer__link:focus-visible {
      outline: 2px solid var(--th-primary, #5046e5);
      outline-offset: 2px;
      border-radius: 3px;
    }

    /* ── Dark theme ─────────────────────────────────────────────────────────── */
    :host-context([data-theme='dark']) .app-footer {
      background: var(--th-card-bg, #1e2433);
      border-top-color: var(--th-border, #2e3650);
    }
  `],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();

  constructor(private cookieConsent: CookieConsentService) {}

  openCookiePreferences(): void {
    this.cookieConsent.showPreferencesModal.set(true);
  }
}
