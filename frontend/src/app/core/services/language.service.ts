// src/app/core/services/language.service.ts
import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';

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
   { code: 'bg', name: 'Български',  flag: '🇧🇬', dir: 'ltr' },
   { code: 'hr', name: 'Hrvatski',   flag: '🇭🇷', dir: 'ltr' },
   { code: 'el', name: 'Ελληνικά',    flag: '🇬🇷', dir: 'ltr' },
   { code: 'cs', name: 'Čeština',    flag: '🇨🇿', dir: 'ltr' },
   { code: 'da', name: 'Dansk',      flag: '🇩🇰', dir: 'ltr' },
   { code: 'et', name: 'Eesti',      flag: '🇪🇪', dir: 'ltr' },
   { code: 'fi', name: 'Suomi',      flag: '🇫🇮', dir: 'ltr' },
   { code: 'sv', name: 'Svenska',    flag: '🇸🇪', dir: 'ltr' },
   { code: 'hu', name: 'Magyar',     flag: '🇭🇺', dir: 'ltr' },
   { code: 'ga', name: 'Gaeilge',    flag: '🇮🇪', dir: 'ltr' },
   { code: 'lv', name: 'Latvian',    flag: '🇱🇻', dir: 'ltr' },
   { code: 'lt', name: 'Lithuanian', flag: '🇱🇹', dir: 'ltr' },
   { code: 'lb', name: 'Lëtzebuergesch', flag: '🇱🇺', dir: 'ltr' },
   { code: 'mt', name: 'Malti',         flag: '🇲🇹', dir: 'ltr' },
   { code: 'ro', name: 'Română',       flag: '🇷🇴', dir: 'ltr' },
   { code: 'sk', name: 'Slovenčina',   flag: '🇸🇰', dir: 'ltr' },
   { code: 'sl', name: 'Slovenščina',  flag: '🇸🇮', dir: 'ltr' },
   { code: 'no', name: 'Norsk',        flag: '🇳🇴', dir: 'ltr' },
   { code: 'rm', name: 'Rumantsch',    flag: '🇨🇭', dir: 'ltr' },
   { code: 'is', name: 'Íslenska',     flag: '🇮🇸', dir: 'ltr' },
];

const STORAGE_KEY = 'preferred_lang';
const DEFAULT_LANG = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages = SUPPORTED_LANGUAGES;
  readonly current   = signal<Language>(SUPPORTED_LANGUAGES[0]);
  isTranslating      = signal(false);
  translationError   = signal<string | null>(null);

  /** Angular locale ID (e.g. for date/number pipes) for the active language — updates after locale data has loaded. */
  readonly activeLocale = signal<string>(DEFAULT_LANG);
  private readonly registeredLocales = new Set<string>(['en']);

  constructor(
    private translate: TranslateService,
    private http: HttpClient
  ) {}

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

  /**
   * Import functions for each supported locale's Angular locale data. Each entry
   * is a literal `import('@angular/common/locales/<code>.mjs')` call — the bundler
   * (esbuild) can only code-split dynamic imports whose path is statically known,
   * so a template-literal path like `locales/${code}.mjs` would NOT be bundled and
   * would 404 in production. Listing every code explicitly keeps each locale as
   * its own lazy-loaded chunk.
   */
  private readonly localeLoaders: Record<string, () => Promise<{ default: unknown }>> = {
    en: () => import('@angular/common/locales/en'),
    fr: () => import('@angular/common/locales/fr'),
    de: () => import('@angular/common/locales/de'),
    es: () => import('@angular/common/locales/es'),
    pt: () => import('@angular/common/locales/pt'),
    it: () => import('@angular/common/locales/it'),
    nl: () => import('@angular/common/locales/nl'),
    ru: () => import('@angular/common/locales/ru'),
    zh: () => import('@angular/common/locales/zh'),
    ja: () => import('@angular/common/locales/ja'),
    ko: () => import('@angular/common/locales/ko'),
    ar: () => import('@angular/common/locales/ar'),
    hi: () => import('@angular/common/locales/hi'),
    tr: () => import('@angular/common/locales/tr'),
    pl: () => import('@angular/common/locales/pl'),
    bg: () => import('@angular/common/locales/bg'),
    hr: () => import('@angular/common/locales/hr'),
    el: () => import('@angular/common/locales/el'),
    cs: () => import('@angular/common/locales/cs'),
    da: () => import('@angular/common/locales/da'),
    et: () => import('@angular/common/locales/et'),
    fi: () => import('@angular/common/locales/fi'),
    sv: () => import('@angular/common/locales/sv'),
    hu: () => import('@angular/common/locales/hu'),
    ga: () => import('@angular/common/locales/ga'),
    lv: () => import('@angular/common/locales/lv'),
    lt: () => import('@angular/common/locales/lt'),
    lb: () => import('@angular/common/locales/lb'),
    mt: () => import('@angular/common/locales/mt'),
    ro: () => import('@angular/common/locales/ro'),
    sk: () => import('@angular/common/locales/sk'),
    sl: () => import('@angular/common/locales/sl'),
    no: () => import('@angular/common/locales/no'),
    rm: () => import('@angular/common/locales/rm'),
    is: () => import('@angular/common/locales/is'),
  };

  /**
   * Load and register Angular's locale data (date/number/currency formatting
   * rules) for a language code, so date/number pipes format according to the
   * selected language instead of always using en-US.
   */
  private async registerLocale(code: string): Promise<void> {
    if (this.registeredLocales.has(code)) {
      this.activeLocale.set(code);
      return;
    }
    const loader = this.localeLoaders[code];
    if (!loader) {
      this.activeLocale.set(DEFAULT_LANG);
      return;
    }
    try {
      const module = await loader();
      registerLocaleData(module.default);
      this.registeredLocales.add(code);
      this.activeLocale.set(code);
    } catch {
      // No Angular locale data for this code — fall back to default formatting.
      this.activeLocale.set(DEFAULT_LANG);
    }
  }

  /** Switch the active language and persist the preference */
  async use(code: string): Promise<void> {
    const lang = this.languages.find(l => l.code === code) ?? this.languages[0];
    this.current.set(lang);
    localStorage.setItem(STORAGE_KEY, code);

    // Apply RTL / LTR to document
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', code);

    // Load locale data for date/number formatting (non-blocking for UI text switch)
    void this.registerLocale(code);

    // Load static i18n file for UI text (pre-translated, no API needed)
    return new Promise<void>((resolve, reject) => {
      this.http.get<Record<string, any>>(`assets/i18n/${code}.json`).subscribe({
        next:     (data) => {
          // Set the static i18n translations directly from file
          this.translate.setTranslation(code, data, true);
          
          this.translate.use(code).subscribe({
            next:     () => {
              this.translationError.set(null);
              this.isTranslating.set(false);
              console.log(`✅ Language switched to ${code} (using pre-translated static file)`);
              resolve();
            },
            error:    (err) => {
              this.translationError.set(`Failed to switch to ${code}`);
              this.isTranslating.set(false);
              console.error(`Failed to load ${code} translations:`, err);
              reject(err);
            },
          });
        },
        error:    (err) => {
          console.error(`Failed to load i18n file for ${code}:`, err);
          this.translationError.set(`Language file not found for ${code}`);
          this.isTranslating.set(false);
          
          // Fallback to English
          this.translate.use(DEFAULT_LANG).subscribe({
            next:     () => resolve(),
            error:    (err) => reject(err),
          });
        }
      });
    });
  }

  /** Convenience getter */
  get currentLang(): string {
    return this.current().code;
  }
}

