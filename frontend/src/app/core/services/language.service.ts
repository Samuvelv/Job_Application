// src/app/core/services/language.service.ts
import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  code:   string;
  name:   string;   // Name in its own script
  flag:   string;   // Flag emoji
  dir:    'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English',    flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪', dir: 'ltr' },
  { code: 'es', name: 'Español',    flag: '🇪🇸', dir: 'ltr' },
  { code: 'pt', name: 'Português',  flag: '🇵🇹', dir: 'ltr' },
  { code: 'it', name: 'Italiano',   flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺', dir: 'ltr' },
  { code: 'zh', name: '中文',        flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', name: '日本語',       flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: '한국어',       flag: '🇰🇷', dir: 'ltr' },
  { code: 'ar', name: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी',       flag: '🇮🇳', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe',     flag: '🇹🇷', dir: 'ltr' },
  { code: 'pl', name: 'Polski',     flag: '🇵🇱', dir: 'ltr' },
];

const STORAGE_KEY = 'preferred_lang';
const DEFAULT_LANG = 'en';
const RTL_LANGS    = new Set(['ar', 'he', 'fa', 'ur']);

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages = SUPPORTED_LANGUAGES;
  readonly current   = signal<Language>(SUPPORTED_LANGUAGES[0]);

  constructor(private translate: TranslateService) {}

  /** Called once at app startup via APP_INITIALIZER */
  init(): Promise<void> {
    const codes = this.languages.map(l => l.code);
    this.translate.addLangs(codes);
    this.translate.setDefaultLang(DEFAULT_LANG);

    const saved   = localStorage.getItem(STORAGE_KEY);
    const browser = this.translate.getBrowserLang() ?? DEFAULT_LANG;
    const chosen  = codes.includes(saved ?? '') ? (saved as string)
                  : codes.includes(browser)     ? browser
                  : DEFAULT_LANG;

    return this.use(chosen);
  }

  /** Switch the active language and persist the preference */
  use(code: string): Promise<void> {
    const lang = this.languages.find(l => l.code === code) ?? this.languages[0];
    this.current.set(lang);
    localStorage.setItem(STORAGE_KEY, code);

    // Apply RTL / LTR to document
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', code);

    return new Promise<void>((resolve, reject) => {
      this.translate.use(code).subscribe({
        next:     () => resolve(),
        error:    (err) => {
          // Graceful fallback — switch to English if the file is missing
          console.warn(`[i18n] Missing translation file for "${code}", falling back to "en"`, err);
          this.translate.use(DEFAULT_LANG).subscribe({ next: resolve, error: reject });
        },
      });
    });
  }

  /** Convenience getter */
  get currentLang(): string {
    return this.current().code;
  }
}
