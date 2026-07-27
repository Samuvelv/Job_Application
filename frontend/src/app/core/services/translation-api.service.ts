// src/app/core/services/translation-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, timeout, retry } from 'rxjs';

interface CacheEntry {
  translations: Record<string, any>;
  timestamp: number;
  ttl: number;
}

interface BackendTranslationRequest {
  fields: Record<string, string>;
  targetLang: string;
  targetLangName: string;
}

interface BackendTranslationResponse {
  translated: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationApiService {
  private translationCache: Map<string, CacheEntry> = new Map();

  constructor(private http: HttpClient) {}

  /**
   * Get cached translation for a language
   */
  getCachedTranslation(language: string): Record<string, any> | null {
    const entry = this.translationCache.get(language);

    if (!entry) {
      return null;
    }

    // Check if cache expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.translationCache.delete(language);
      return null;
    }

    console.log(`✅ Cache HIT for ${language}`);
    return entry.translations;
  }

  /**
   * Set translation cache
   */
  setCachedTranslation(language: string, translations: Record<string, any>): void {
    this.translationCache.set(language, {
      translations,
      timestamp: Date.now(),
      ttl: environment.translation.cacheTtlMs,
    });

    console.log(`💾 Cached translation for ${language} (TTL: ${environment.translation.cacheTtlMs / 1000}s)`);
  }

  /**
   * Clear cache for specific language or all
   */
  clearCache(language?: string): void {
    if (language) {
      this.translationCache.delete(language);
      console.log(`🗑️ Cache cleared for ${language}`);
    } else {
      this.translationCache.clear();
      console.log(`🗑️ All cache cleared`);
    }
  }

  /**
   * Translate all i18n keys to target language via backend
   */
  async translateAllKeys(
    enJson: Record<string, any>,
    targetLanguage: string
  ): Promise<Record<string, any>> {
    // Check cache first
    const cached = this.getCachedTranslation(targetLanguage);
    if (cached) {
      return cached;
    }

    console.log(`🌐 Translating to ${targetLanguage}...`);
    const startTime = Date.now();

    try {
      const translatedJson = await this.callBackendTranslationAPI(enJson, targetLanguage);

      // Validate JSON structure
      if (!translatedJson || typeof translatedJson !== 'object') {
        throw new Error('Invalid translation response - not an object');
      }

      // Cache the translation
      this.setCachedTranslation(targetLanguage, translatedJson);

      const duration = Date.now() - startTime;
      console.log(`✅ Translation complete for ${targetLanguage} in ${duration}ms`);

      return translatedJson;
    } catch (error) {
      console.error(`❌ Translation failed for ${targetLanguage}:`, error);
      throw error;
    }
  }

  /**
   * Call backend translation API (which calls OpenAI)
   */
  private async callBackendTranslationAPI(
    enJson: Record<string, any>,
    targetLanguage: string
  ): Promise<Record<string, any>> {
    // Map language codes to human-readable names
    // Only use languages supported by the backend DTO (15 languages max)
    const langMap: Record<string, string> = {
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
    };

    // Map extended language codes to backend-supported codes
    const langCodeMap: Record<string, string> = {
      // Extended languages map to closest supported language
      'bg': 'ru',      // Bulgarian → Russian
      'hr': 'ru',      // Croatian → Russian
      'el': 'de',      // Greek → German
      'cs': 'de',      // Czech → German
      'da': 'nl',      // Danish → Dutch
      'et': 'nl',      // Estonian → Dutch
      'fi': 'nl',      // Finnish → Dutch
      'sv': 'nl',      // Swedish → Dutch
      'hu': 'de',      // Hungarian → German
      'ga': 'en',      // Irish → English
      'lv': 'nl',      // Latvian → Dutch
      'lt': 'nl',      // Lithuanian → Dutch
      'lb': 'fr',      // Luxembourgish → French
      'mt': 'it',      // Maltese → Italian
      'ro': 'fr',      // Romanian → French
      'sk': 'de',      // Slovak → German
      'sl': 'de',      // Slovenian → German
      'no': 'nl',      // Norwegian → Dutch
      'rm': 'fr',      // Romansh → French
      'is': 'en',      // Icelandic → English
    };

    // Map to supported language code if needed
    const mappedLangCode = langCodeMap[targetLanguage] || targetLanguage;

    if (!langMap[mappedLangCode]) {
      console.warn(`Language ${targetLanguage} (mapped to ${mappedLangCode}) not supported by backend, falling back to English`);
      // Return original if language not supported
      return enJson;
    }

    const targetLangName = langMap[mappedLangCode];

    // Flatten nested JSON into flat key-value pairs
    const flatFields = this.flattenJson(enJson);
    console.log(`📋 Flattened ${Object.keys(enJson).length} top-level keys into ${Object.keys(flatFields).length} flat fields`);

    const request: BackendTranslationRequest = {
      fields: flatFields,
      targetLang: mappedLangCode,
      targetLangName: targetLangName,
    };

    try {
      const endpoint = `${environment.apiUrl}/translate`;
      console.log(`📤 Sending translation request to ${endpoint} for language: ${targetLangName}`);

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
          retry({ count: 2, delay: 1000 })
        )
      );

      if (!response?.translated) {
        throw new Error('Invalid API response format - missing translated field');
      }

      console.log(`✅ Received translated content from backend`);

      // Unflatten the response back into nested structure
      const unflattened = this.unflattenJson(response.translated);
      return unflattened;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        console.error(`API Error ${error.status}:`, error.message);
        console.error(`Response:`, error.error);
        if (error.status === 0) {
          throw new Error('Cannot reach translation service. Please ensure the backend server is running.');
        }
        if (error.status === 503) {
          throw new Error('Translation service is not configured on the server.');
        }
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.status === 404) {
          throw new Error('Translation endpoint not found on backend.');
        }
      }
      console.error('Backend Translation API Error:', error);
      throw error;
    }
  }

  /**
   * Flatten nested JSON object into dot-notation keys
   * Example: { greeting: { hello: "Hi" } } → { "greeting.hello": "Hi" }
   */
  private flattenJson(obj: Record<string, any>, prefix: string = ''): Record<string, string> {
    const result: Record<string, string> = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
          // Skip null/undefined values
          continue;
        } else if (typeof value === 'string') {
          result[newKey] = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          result[newKey] = String(value);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively flatten nested objects
          Object.assign(result, this.flattenJson(value, newKey));
        } else if (Array.isArray(value)) {
          // Handle arrays (e.g., list of items)
          value.forEach((item, index) => {
            const arrayKey = `${newKey}[${index}]`;
            if (typeof item === 'string') {
              result[arrayKey] = item;
            } else if (typeof item === 'object') {
              Object.assign(result, this.flattenJson(item, arrayKey));
            }
          });
        }
      }
    }

    return result;
  }

  /**
   * Unflatten dot-notation keys back into nested JSON
   * Example: { "greeting.hello": "Hi" } → { greeting: { hello: "Hi" } }
   */
  private unflattenJson(flat: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in flat) {
      if (Object.prototype.hasOwnProperty.call(flat, key)) {
        const value = flat[key];
        const keys = key.split('.');
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!(k in current)) {
            current[k] = {};
          }
          current = current[k];
        }

        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
      }
    }

    return result;
  }
}
