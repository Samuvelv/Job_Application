// frontend/src/app/core/services/candidate-translation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CacheEntry {
  data: Record<string, string>;
  timestamp: number;
  expiresAt: number;
  language: string;
}

export interface TranslationRequest {
  fields: Record<string, string>;
  targetLang: string;
  targetLangName: string;
}

export interface TranslationResponse {
  translated: Record<string, string>;
}

export interface TranslateLanguage {
  code: string;
  label: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  // English excluded - profiles display in English by default
  // { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'es', label: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'pt', label: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱', dir: 'ltr' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'zh', label: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ja', label: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', label: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱', dir: 'ltr' },
];

@Injectable({
  providedIn: 'root',
})
export class CandidateTranslationService {
  private readonly CACHE_PREFIX = 'candidate_';
  private readonly CACHE_VERSION = 'v1';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly API_ENDPOINT = '/api/v1/translate';

  // Observables for UI state
  isTranslating$ = new BehaviorSubject<boolean>(false);
  translationError$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Translate candidate profile fields to target language
   * Uses localStorage cache with 24h TTL
   * Returns an Observable (RxJS compatible)
   *
   * @param candidate - Candidate object with all profile data
   * @param language - TranslateLanguage object with code and name
   * @returns Observable of translated candidate object or fallback on error
   */
  translate(
    candidate: any,
    language: TranslateLanguage
  ): Observable<any> {
    return new Observable((observer) => {
      // Don't translate if target language is English
      if (language.code === 'en') {
        observer.next(candidate);
        observer.complete();
        return;
      }

      // Check cache first
      const cached = this.getFromCache(candidate.id, language.code);
      if (cached && !this.isCacheExpired(cached)) {
        console.log(`[Translation] Cache HIT for candidate ${candidate.id} → ${language.code}`);
        this.translationError$.next(null);
        const merged = this.mergeTranslations(candidate, cached.data);
        observer.next(merged);
        observer.complete();
        return;
      }

      // Fetch from API
      this.isTranslating$.next(true);
      this.translationError$.next(null);

      const fields = this.extractTranslatableFields(candidate);
      const request: TranslationRequest = {
        fields,
        targetLang: language.code,
        targetLangName: language.label,
      };

      this.http
        .post<TranslationResponse>('/api/v1/translate', request)
        .subscribe({
          next: (response) => {
            if (!response?.translated) {
              throw new Error('Invalid response from translation API');
            }

            // Cache the translation
            this.cacheTranslation(candidate.id, language.code, response.translated);

            console.log(
              `[Translation] API SUCCESS for candidate ${candidate.id} → ${language.code}`
            );

            const merged = this.mergeTranslations(candidate, response.translated);
            this.isTranslating$.next(false);
            observer.next(merged);
            observer.complete();
          },
          error: (error: any) => {
            const errorMsg = this.extractErrorMessage(error);
            console.error(`[Translation] API FAILED:`, errorMsg);
            this.translationError$.next(errorMsg);
            this.isTranslating$.next(false);

            // Fallback: return original candidate in English
            observer.next(candidate);
            observer.complete();
          },
        });
    });
  }

  /**
   * Extract translatable fields from candidate object
   * Filters out non-translatable content (IDs, dates, proper nouns)
   */
  extractTranslatableFields(candidate: any): Record<string, string> {
    const fields: Record<string, string> = {};

    // Bio
    if (candidate.bio) {
      fields['bio'] = candidate.bio;
    }

    // Work experiences
    if (Array.isArray(candidate.experiences)) {
      candidate.experiences.forEach((exp: any, idx: number) => {
        if (exp.description) {
          fields[`exp_${idx}_description`] = exp.description;
        }
        if (exp.reasonForLeaving) {
          fields[`exp_${idx}_reasonForLeaving`] = exp.reasonForLeaving;
        }
      });
    }

    // Educations
    if (Array.isArray(candidate.educations)) {
      candidate.educations.forEach((edu: any, idx: number) => {
        if (edu.description) {
          fields[`edu_${idx}_description`] = edu.description;
        }
      });
    }

    // Hobbies
    if (Array.isArray(candidate.hobbies)) {
      candidate.hobbies.forEach((hobby: string, idx: number) => {
        if (hobby) {
          fields[`hobby_${idx}`] = hobby;
        }
      });
    }

    // Certifications
    if (Array.isArray(candidate.certifications)) {
      candidate.certifications.forEach((cert: any, idx: number) => {
        if (cert.description) {
          fields[`cert_${idx}_description`] = cert.description;
        }
      });
    }

    // Volunteer experiences
    if (Array.isArray(candidate.volunteerExperiences)) {
      candidate.volunteerExperiences.forEach((vol: any, idx: number) => {
        if (vol.description) {
          fields[`vol_${idx}_description`] = vol.description;
        }
      });
    }

    return fields;
  }

  /**
   * Merge translated fields back into candidate object
   */
  mergeTranslations(
    candidate: any,
    translated: Record<string, string>
  ): any {
    const merged = { ...candidate };

    // Bio
    if (translated['bio']) {
      merged.bio = translated['bio'];
    }

    // Experiences
    if (Array.isArray(merged.experiences)) {
      merged.experiences = merged.experiences.map((exp: any, idx: number) => ({
        ...exp,
        description: translated[`exp_${idx}_description`] || exp.description,
        reasonForLeaving: translated[`exp_${idx}_reasonForLeaving`] || exp.reasonForLeaving,
      }));
    }

    // Educations
    if (Array.isArray(merged.educations)) {
      merged.educations = merged.educations.map((edu: any, idx: number) => ({
        ...edu,
        description: translated[`edu_${idx}_description`] || edu.description,
      }));
    }

    // Hobbies
    if (Array.isArray(merged.hobbies)) {
      merged.hobbies = merged.hobbies.map((hobby: string, idx: number) => {
        return translated[`hobby_${idx}`] || hobby;
      });
    }

    // Certifications
    if (Array.isArray(merged.certifications)) {
      merged.certifications = merged.certifications.map((cert: any, idx: number) => ({
        ...cert,
        description: translated[`cert_${idx}_description`] || cert.description,
      }));
    }

    // Volunteer experiences
    if (Array.isArray(merged.volunteerExperiences)) {
      merged.volunteerExperiences = merged.volunteerExperiences.map(
        (vol: any, idx: number) => ({
          ...vol,
          description: translated[`vol_${idx}_description`] || vol.description,
        })
      );
    }

    return merged;
  }

  /**
   * Clear all translation caches (e.g., on logout)
   */
  clearAllCaches(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.CACHE_PREFIX) && key.endsWith(this.CACHE_VERSION)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Translation] All caches cleared');
  }

  /**
   * Clear translation cache for a specific candidate
   */
  clearCandidateCache(candidateId: string): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.startsWith(`${this.CACHE_PREFIX}${candidateId}_`) &&
        key.endsWith(this.CACHE_VERSION)
      ) {
        localStorage.removeItem(key);
      }
    });
    console.log(`[Translation] Cache cleared for candidate ${candidateId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private getFromCache(candidateId: string, language: string): CacheEntry | null {
    const key = this.getCacheKey(candidateId, language);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as CacheEntry;
    } catch {
      console.warn(`[Translation] Failed to parse cache for key: ${key}`);
      localStorage.removeItem(key);
      return null;
    }
  }

  private cacheTranslation(
    candidateId: string,
    language: string,
    data: Record<string, string>
  ): void {
    const key = this.getCacheKey(candidateId, language);
    const now = Date.now();

    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_TTL_MS,
      language,
    };

    try {
      localStorage.setItem(key, JSON.stringify(entry));
      console.log(`[Translation] Cached for candidate ${candidateId} → ${language}`);
    } catch (error) {
      console.warn(`[Translation] Failed to cache translation:`, error);
    }
  }

  private isCacheExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private getCacheKey(candidateId: string, language: string): string {
    return `${this.CACHE_PREFIX}${candidateId}_${language}_${this.CACHE_VERSION}`;
  }

  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.statusText) {
      if (error.status === 429) {
        return 'Too many translation requests. Please wait a moment.';
      }
      if (error.status === 503) {
        return 'Translation service is temporarily unavailable.';
      }
      if (error.status === 401) {
        return 'Authentication required. Please log in again.';
      }
      return `Error: ${error.statusText}`;
    }

    if (error?.message) {
      return error.message;
    }

    return 'An unknown translation error occurred.';
  }
}
