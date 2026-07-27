// src/app/core/services/language.service.ts
import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TranslationApiService } from './translation-api.service';

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
const RTL_LANGS    = new Set(['ar', 'he', 'fa', 'ur']);

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages = SUPPORTED_LANGUAGES;
  readonly current   = signal<Language>(SUPPORTED_LANGUAGES[0]);
  isTranslating      = signal(false);
  translationError   = signal<string | null>(null);

  constructor(
    private translate: TranslateService,
    private http: HttpClient,
    private translationApi: TranslationApiService
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

  /** Switch the active language and persist the preference */
  async use(code: string): Promise<void> {
    const lang = this.languages.find(l => l.code === code) ?? this.languages[0];
    this.current.set(lang);
    localStorage.setItem(STORAGE_KEY, code);

    // Apply RTL / LTR to document
    document.documentElement.setAttribute('dir', lang.dir);
    document.documentElement.setAttribute('lang', code);

    // If English, no translation needed
    if (code === DEFAULT_LANG) {
      return new Promise<void>((resolve, reject) => {
        this.translate.use(code).subscribe({
          next:     () => {
            this.translationError.set(null);
            resolve();
          },
          error:    (err) => {
            console.error(`Failed to load English translations:`, err);
            this.translationError.set('Failed to load English');
            reject(err);
          },
        });
      });
    }

    // For other languages, use real-time translation API
    this.isTranslating.set(true);
    this.translationError.set(null);

    try {
      // Load English base translations
      const enJson = await this.loadJsonFile('assets/i18n/en.json');

      // Translate to target language using API
      const translatedJson = await this.translationApi.translateAllKeys(enJson, this.getLanguageName(code));

      // Set the translated JSON in TranslateService
      this.translate.setTranslation(code, translatedJson, true);

      // Use the translated language
      await new Promise<void>((resolve, reject) => {
        this.translate.use(code).subscribe({
          next:     () => {
            this.translationError.set(null);
            this.isTranslating.set(false);
            console.log(`✅ Language switched to ${code}`);
            resolve();
          },
          error:    (err) => {
            this.translationError.set(`Failed to switch to ${code}`);
            this.isTranslating.set(false);
            reject(err);
          },
        });
      });
    } catch (error) {
      console.error(`Translation failed for ${code}:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.translationError.set(`Translation failed: ${errorMsg}. Falling back to English.`);
      this.isTranslating.set(false);

      // Fallback to English
      return new Promise<void>((resolve, reject) => {
        this.translate.use(DEFAULT_LANG).subscribe({
          next:     () => resolve(),
          error:    (err) => reject(err),
        });
      });
    }
  }

  /** Load JSON file from assets */
  private async loadJsonFile(path: string): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      this.http.get<Record<string, any>>(path).subscribe({
        next:  (data) => resolve(data),
        error: (err) => {
          console.error(`Failed to load ${path}:`, err);
          reject(err);
        }
      });
    });
  }

  /** Get language name from code for API translation */
  private getLanguageName(code: string): string {
    const langMap: Record<string, string> = {
      'en': 'English',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'pt': 'Portuguese',
      'it': 'Italian',
      'nl': 'Dutch',
      'ru': 'Russian',
      'zh': 'Chinese (Simplified)',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'tr': 'Turkish',
      'pl': 'Polish',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'el': 'Greek',
      'cs': 'Czech',
      'da': 'Danish',
      'et': 'Estonian',
      'fi': 'Finnish',
      'sv': 'Swedish',
      'hu': 'Hungarian',
      'ga': 'Irish',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'lb': 'Luxembourgish',
      'mt': 'Maltese',
      'ro': 'Romanian',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'no': 'Norwegian',
      'rm': 'Romansh',
      'is': 'Icelandic',
    };

    return langMap[code] || code;
  }

  /** Convenience getter */
  get currentLang(): string {
    return this.current().code;
  }
}

