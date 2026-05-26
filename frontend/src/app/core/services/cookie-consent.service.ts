// src/app/core/services/cookie-consent.service.ts
import { Injectable, signal } from '@angular/core';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CookieCategories {
  /** App routing, CSRF protection — always required, cannot be disabled. */
  essential: true;
  /**
   * HttpOnly refresh token (server-side cookie) + access token in localStorage.
   * Required for any authenticated session — cannot be disabled.
   */
  authentication: true;
  /**
   * UI preferences: dark/light theme, sidebar collapse state.
   * Stored in localStorage only when this consent is granted.
   */
  preferences: boolean;
  /**
   * Usage analytics (not currently active — placeholder for future integration).
   * No analytics scripts are loaded until this consent is granted.
   */
  analytics: boolean;
  /**
   * Marketing and tracking cookies (not currently used).
   * Included for compliance completeness and future use.
   */
  marketing: boolean;
}

export interface CookieConsentRecord {
  /** Schema version — bump when the categories shape changes to force re-consent. */
  version: number;
  /** ISO timestamp of when consent was given — used to enforce 12-month expiry. */
  timestamp: string;
  categories: CookieCategories;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONSENT_KEY            = 'th_cookie_consent';
const CONSENT_VERSION        = 1;
/** Re-prompt after this many months. */
const CONSENT_EXPIRY_MONTHS  = 12;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CookieConsentService {

  // ── Reactive signals ───────────────────────────────────────────────────────

  /**
   * `true` when a valid, non-expired consent record is stored.
   * Drives banner visibility — banner shows when this is `false`.
   */
  readonly consentGiven = signal<boolean>(this.hasValidConsent());

  /**
   * The current category preferences, or `null` if no valid consent record exists.
   * ThemeService and SidebarService use an `effect()` on this signal to react
   * immediately when the user grants or revokes preference consent.
   */
  readonly preferences = signal<CookieCategories | null>(this.readCategories());

  /**
   * Cross-component trigger for the preferences modal.
   * Set to `true` from the banner ("Customize") or footer ("Manage Cookies").
   * The modal sets it back to `false` on close.
   */
  readonly showPreferencesModal = signal<boolean>(false);

  // ── Public query helpers ───────────────────────────────────────────────────

  /**
   * Returns `true` when a consent record exists, is the current version,
   * and was given within the last 12 months.
   */
  hasValidConsent(): boolean {
    const record = this.readRecord();
    if (!record) return false;
    if (record.version !== CONSENT_VERSION) return false;
    const given    = new Date(record.timestamp);
    const expiresAt = new Date(given);
    expiresAt.setMonth(expiresAt.getMonth() + CONSENT_EXPIRY_MONTHS);
    return new Date() < expiresAt;
  }

  /**
   * Returns `true` for a specific category.
   * Essential and authentication always return `true` even if no consent record exists
   * (they are strictly necessary cookies).
   */
  hasConsentFor(category: keyof CookieCategories): boolean {
    if (category === 'essential' || category === 'authentication') return true;
    const record = this.readRecord();
    if (!record || !this.hasValidConsent()) return false;
    return record.categories[category] as boolean;
  }

  // ── Consent actions ────────────────────────────────────────────────────────

  /** Accept all cookie categories and dismiss the banner. */
  acceptAll(): void {
    this.writeRecord({
      essential:      true,
      authentication: true,
      preferences:    true,
      analytics:      true,
      marketing:      true,
    });
  }

  /** Accept only strictly necessary cookies (essential + authentication). */
  rejectNonEssential(): void {
    this.writeRecord({
      essential:      true,
      authentication: true,
      preferences:    false,
      analytics:      false,
      marketing:      false,
    });
  }

  /**
   * Save a custom category selection from the preferences modal.
   * Essential and authentication are always forced to `true` regardless of input.
   */
  saveConsent(partial: Pick<CookieCategories, 'preferences' | 'analytics' | 'marketing'>): void {
    this.writeRecord({
      essential:      true,
      authentication: true,
      preferences:    partial.preferences,
      analytics:      partial.analytics,
      marketing:      partial.marketing,
    });
    this.showPreferencesModal.set(false);
  }

  /**
   * Clear stored consent — banner will re-appear on next page load.
   * Used for "Reset all cookie preferences" flows.
   */
  resetConsent(): void {
    localStorage.removeItem(CONSENT_KEY);
    this.consentGiven.set(false);
    this.preferences.set(null);
  }

  // ── Private storage helpers ────────────────────────────────────────────────

  private readRecord(): CookieConsentRecord | null {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? (JSON.parse(raw) as CookieConsentRecord) : null;
    } catch {
      return null;
    }
  }

  private readCategories(): CookieCategories | null {
    if (!this.hasValidConsent()) return null;
    return this.readRecord()?.categories ?? null;
  }

  private writeRecord(categories: CookieCategories): void {
    const record: CookieConsentRecord = {
      version:    CONSENT_VERSION,
      timestamp:  new Date().toISOString(),
      categories,
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      // localStorage unavailable (e.g. storage quota exceeded) — degrade gracefully
      console.warn('[CookieConsentService] Failed to persist consent record to localStorage.');
    }
    // Always update signals even if storage failed, so the UI responds correctly
    this.consentGiven.set(true);
    this.preferences.set(categories);
  }
}
