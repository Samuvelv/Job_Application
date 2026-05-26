// src/app/core/services/theme.service.ts
import { Injectable, signal, effect } from '@angular/core';
import { CookieConsentService } from './cookie-consent.service';

const THEME_KEY = 'th_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private readonly _dark;
  readonly isDark;

  constructor(private readonly cookieConsent: CookieConsentService) {
    // Only read the stored theme preference if the user has consented to
    // preference cookies.  Without consent the app defaults to light mode and
    // does not read from (or write to) localStorage for this key.
    const canRead    = cookieConsent.hasConsentFor('preferences');
    const storedDark = canRead && localStorage.getItem(THEME_KEY) === 'dark';

    this._dark = signal<boolean>(storedDark);
    this.isDark = this._dark.asReadonly();

    // Keep the DOM <html data-theme="..."> attribute in sync with the signal
    effect(() => this.applyTheme(this._dark()));

    // React to consent changes at runtime:
    // • If the user explicitly revokes preference consent mid-session, clear the
    //   stored value and reset to light mode immediately.
    // • If the user grants preference consent for the first time, persist whatever
    //   the current in-session theme is so the next visit restores it.
    effect(() => {
      const prefs = cookieConsent.preferences();
      if (prefs === null) return; // no consent record yet — do nothing

      if (!prefs.preferences) {
        // Preference consent revoked → wipe storage and reset to light
        localStorage.removeItem(THEME_KEY);
        this._dark.set(false);
      } else {
        // Preference consent newly granted → persist current in-session choice
        localStorage.setItem(THEME_KEY, this._dark() ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    this._dark.update(d => !d);
    // Persist the new value only when preference cookies are consented to
    if (this.cookieConsent.hasConsentFor('preferences')) {
      localStorage.setItem(THEME_KEY, this._dark() ? 'dark' : 'light');
    }
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
