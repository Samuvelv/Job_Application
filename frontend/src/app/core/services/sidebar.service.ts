// src/app/core/services/sidebar.service.ts
import { Injectable, signal, effect } from '@angular/core';
import { CookieConsentService } from './cookie-consent.service';

const COLLAPSE_KEY = 'th_sidebar_collapsed';

@Injectable({ providedIn: 'root' })
export class SidebarService {

  private readonly _open = signal(false);
  readonly isOpen = this._open.asReadonly();

  private readonly _collapsed;
  readonly isCollapsed;

  constructor(private readonly cookieConsent: CookieConsentService) {
    // Only restore the sidebar collapse state if the user has consented to
    // preference cookies.  Without consent the sidebar always starts expanded.
    const canRead   = cookieConsent.hasConsentFor('preferences');
    const initValue = canRead && localStorage.getItem(COLLAPSE_KEY) === 'true';

    this._collapsed = signal<boolean>(initValue);
    this.isCollapsed = this._collapsed.asReadonly();

    // React to preference consent changes at runtime:
    // • Revoked  → clear the stored value and reset sidebar to expanded.
    // • Granted  → persist the current in-session state immediately.
    effect(() => {
      const prefs = cookieConsent.preferences();
      if (prefs === null) return; // no consent record yet — do nothing

      if (!prefs.preferences) {
        // Preference consent revoked → wipe storage and reset to expanded
        localStorage.removeItem(COLLAPSE_KEY);
        this._collapsed.set(false);
      } else {
        // Preference consent newly granted → persist current in-session state
        localStorage.setItem(COLLAPSE_KEY, String(this._collapsed()));
      }
    });
  }

  open():   void { this._open.set(true); }
  close():  void { this._open.set(false); }
  toggle(): void { this._open.update(v => !v); }

  toggleCollapse(): void {
    this._collapsed.update(v => {
      const next = !v;
      // Persist the new value only when preference cookies are consented to
      if (this.cookieConsent.hasConsentFor('preferences')) {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      }
      return next;
    });
  }
}
