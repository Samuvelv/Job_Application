// src/app/core/services/user-data-translation.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, timeout, retry, timer } from 'rxjs';

interface BackendTranslationRequest {
  fields: Record<string, string>;
  targetLang: string;
  targetLangName: string;
}

interface BackendTranslationResponse {
  translated: Record<string, string>;
}

/**
 * Service for translating dynamic user data (bio, descriptions, etc.)
 * 
 * This service calls the backend translation API which uses OpenAI.
 * It's separate from the static i18n translations which are pre-translated.
 * 
 * Use cases:
 * - Candidate bio translations
 * - Job descriptions
 * - User-provided feedback
 * - Dynamic content from users
 */
@Injectable({
  providedIn: 'root'
})
export class UserDataTranslationService {
  private translationCache = new Map<string, Map<string, { data: string; expires: number }>>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  // Language name mappings for API — must match backend SUPPORTED_LANG_CODES
  // and frontend LanguageService.SUPPORTED_LANGUAGES (34 UI languages).
  private readonly langNameMap: Record<string, string> = {
    'en': 'English',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'it': 'Italian',
    'nl': 'Dutch',
    'ru': 'Russian',
    'zh': 'Chinese',
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

  constructor(private http: HttpClient) {}

  /**
   * Translate a single piece of user data (bio, description, etc.)
   * 
   * Example:
   * ```
   * const translated = await this.translateUserData(
   *   'I am a software engineer with 5 years of experience',
   *   'es'  // Spanish
   * );
   * // Returns: "Soy ingeniero de software con 5 años de experiencia"
   * ```
   */
  async translateUserData(text: string, targetLang: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Check cache first
    const cached = this.getCachedTranslation(text, targetLang);
    if (cached) {
      console.log(`✅ User data translation retrieved from cache`);
      return cached;
    }

    try {
      const result = await this.translateFields({ content: text }, targetLang);
      return result['content'] || text;
    } catch (error) {
      console.error('Failed to translate user data:', error);
      return text; // Fallback to original text
    }
  }

  /**
   * Translate multiple fields of user data at once
   * 
   * Example:
   * ```
   * const translated = await this.translateUserFields({
   *   bio: 'I am an engineer',
   *   experience: 'Worked at Google'
   * }, 'es');
   * ```
   */
  // Deliberately does NOT catch here — every caller (BulkTranslationService's
  // chunk promises) has its own .catch() that both falls back to the original
  // text AND records the failure so it isn't cached as a success. Swallowing
  // the error at this layer used to make that outer .catch() dead code: the
  // promise always resolved "successfully" with the untranslated fallback,
  // so a failed translation looked identical to a real one and got cached
  // forever — meaning a reload or re-navigation would never retry.
  async translateUserFields(fields: Record<string, string>, targetLang: string): Promise<Record<string, string>> {
    // Filter out empty fields
    const nonEmptyFields = Object.fromEntries(
      Object.entries(fields).filter(([_, v]) => v && v.trim().length > 0)
    );

    if (Object.keys(nonEmptyFields).length === 0) {
      return fields;
    }

    return this.translateFields(nonEmptyFields, targetLang);
  }

  /**
   * Internal method to call the backend translation API
   */
  private async translateFields(fields: Record<string, string>, targetLang: string): Promise<Record<string, string>> {
    if (!this.langNameMap[targetLang]) {
      console.warn(`Language ${targetLang} not supported, returning original`);
      return fields;
    }

    const targetLangName = this.langNameMap[targetLang];

    const request: BackendTranslationRequest = {
      fields,
      targetLang,
      targetLangName,
    };

    try {
      const endpoint = `${environment.apiUrl}/translate`;
      console.log(`📤 Translating user data to ${targetLangName}...`);

      const response = await firstValueFrom(
        this.http.post<BackendTranslationResponse>(
          endpoint,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ).pipe(
          timeout(environment.translation.timeoutMs),
          retry({ count: 2, delay: (_error, retryCount) => timer(1000 * retryCount) })
        )
      );

      if (!response?.translated) {
        throw new Error('Invalid API response format');
      }

      // Cache the translations
      for (const [key, value] of Object.entries(fields)) {
        this.cacheTranslation(value, targetLang, response.translated[key]);
      }

      console.log(`✅ User data translated successfully`);
      return response.translated;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        console.error(`API Error ${error.status}:`, error.message);
        if (error.status === 0) {
          throw new Error('Cannot reach translation service');
        }
        if (error.status === 503) {
          throw new Error('Translation service not available');
        }
      }
      throw error;
    }
  }

  /**
   * Cache a translation result
   */
  private cacheTranslation(sourceText: string, language: string, translatedText: string): void {
    if (!this.translationCache.has(language)) {
      this.translationCache.set(language, new Map());
    }

    const langCache = this.translationCache.get(language)!;
    langCache.set(sourceText, {
      data: translatedText,
      expires: Date.now() + this.CACHE_TTL,
    });
  }

  /**
   * Get cached translation if available and not expired
   */
  private getCachedTranslation(sourceText: string, language: string): string | null {
    if (!this.translationCache.has(language)) {
      return null;
    }

    const langCache = this.translationCache.get(language)!;
    const cached = langCache.get(sourceText);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      langCache.delete(sourceText);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear all cached translations
   */
  clearCache(): void {
    this.translationCache.clear();
    console.log('🗑️ User data translation cache cleared');
  }

  /**
   * Clear cache for a specific language
   */
  clearCacheForLanguage(language: string): void {
    this.translationCache.delete(language);
    console.log(`🗑️ User data translation cache cleared for ${language}`);
  }
}
