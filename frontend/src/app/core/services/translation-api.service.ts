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
     // Get language display name for the backend
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

     const targetLangName = langMap[targetLanguage] || targetLanguage;

     const request: BackendTranslationRequest = {
       fields: enJson,
       targetLang: targetLanguage,
       targetLangName: targetLangName,
     };

     try {
       const endpoint = `${environment.apiUrl}/translate`;
       console.log(`📤 Sending translation request to ${endpoint}`);

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
       return response.translated;
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
}
