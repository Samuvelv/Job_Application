// src/app/core/services/candidate-translation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Candidate, Experience } from '../models/candidate.model';

// ── Language descriptor (mirrors LanguageService.SUPPORTED_LANGUAGES) ─────────
export interface TranslateLanguage {
  code: string;
  name: string;  // English name sent to GPT as targetLangName
  label: string; // Display label shown in the UI dropdown
  flag: string;
}

export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
  { code: 'fr', name: 'French',     label: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'German',     label: 'German',     flag: '🇩🇪' },
  { code: 'es', name: 'Spanish',    label: 'Spanish',    flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian',    label: 'Italian',    flag: '🇮🇹' },
  { code: 'nl', name: 'Dutch',      label: 'Dutch',      flag: '🇳🇱' },
  { code: 'ru', name: 'Russian',    label: 'Russian',    flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese',    label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',   label: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     label: 'Korean',     flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic',     label: 'Arabic',     flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi',      label: 'Hindi',      flag: '🇮🇳' },
  { code: 'tr', name: 'Turkish',    label: 'Turkish',    flag: '🇹🇷' },
  { code: 'pl', name: 'Polish',     label: 'Polish',     flag: '🇵🇱' },
];

// ── Field key builders ─────────────────────────────────────────────────────────
// Deterministic key format so applyTranslation can map values back precisely.

function expDescKey(i: number)    { return `exp_${i}_description`; }
function expReasonKey(i: number)  { return `exp_${i}_reason`; }
function hobbyKey(i: number)      { return `hobby_${i}`; }

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class CandidateTranslationService {

  private readonly api = `${environment.apiUrl}/translate`;

  /** In-memory cache: key = `${candidateId}_${langCode}` → translated Candidate clone */
  private cache = new Map<string, Candidate>();

  constructor(private http: HttpClient) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Translate a candidate's free-form text fields into the target language.
   *
   * - Returns from cache immediately on second call for the same candidate + language.
   * - Emits a new Candidate object (shallow clone) — the original is never mutated.
   * - If a field fails to translate, the original English value is preserved (graceful fallback handled server-side).
   */
  translate(
    candidate: Candidate,
    lang: TranslateLanguage,
  ): Observable<Candidate> {
    const cacheKey = `${candidate.id}_${lang.code}`;

    // Cache hit — return immediately
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    // Extract only the free-form translatable fields
    const fields = this.extractFields(candidate);

    // If there is nothing translatable, return original unchanged
    if (Object.keys(fields).length === 0) {
      return of(candidate);
    }

    return this.http.post<{ translated: Record<string, string> }>(this.api, {
      fields,
      targetLang:     lang.code,
      targetLangName: lang.name,
    }).pipe(
      map(res => this.applyTranslation(candidate, res.translated)),
      tap(translated => this.cache.set(cacheKey, translated)),
    );
  }

  /** Clear the entire in-memory cache (e.g. on logout or profile update). */
  clearCache(): void {
    this.cache.clear();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Pull only free-form text fields from the candidate.
   *
   * NOT included (correct per the prompt template rules):
   *   - Names, email, phone, dates, numbers
   *   - job_title, occupation, industry  (professional terms / already in i18n OPTIONS)
   *   - company_name, institution, degree, field_of_study  (proper nouns)
   *   - skill_name, certificate names, language names  (technical / proper nouns)
   *   - city, country, nationality  (geographic proper nouns)
   *   - employment_status, visa_status  (enum codes mapped via existing i18n)
   */
  private extractFields(candidate: Candidate): Record<string, string> {
    const fields: Record<string, string> = {};

    // Bio
    if (candidate.bio?.trim()) {
      fields['bio'] = candidate.bio.trim();
    }

    // Work experience — description + reason_for_leaving
    candidate.experience?.forEach((exp, i) => {
      if (exp.description?.trim()) {
        fields[expDescKey(i)] = exp.description.trim();
      }
      if (exp.reason_for_leaving?.trim()) {
        fields[expReasonKey(i)] = exp.reason_for_leaving.trim();
      }
    });

    // Hobbies
    candidate.hobbies?.forEach((hobby, i) => {
      if (typeof hobby === 'string' && hobby.trim()) {
        fields[hobbyKey(i)] = hobby.trim();
      }
    });

    return fields;
  }

  /**
   * Overlay translated values onto a shallow clone of the original candidate.
   * The original candidate object is never mutated.
   */
  private applyTranslation(
    candidate: Candidate,
    translated: Record<string, string>,
  ): Candidate {
    // Shallow clone the top-level object
    const clone: Candidate = { ...candidate };

    // Bio
    if (translated['bio'] !== undefined) {
      clone.bio = translated['bio'];
    }

    // Work experience — clone the array and each translated entry
    if (candidate.experience?.length) {
      clone.experience = candidate.experience.map((exp, i) => {
        const descKey   = expDescKey(i);
        const reasonKey = expReasonKey(i);
        const hasChange = translated[descKey] !== undefined || translated[reasonKey] !== undefined;
        if (!hasChange) return exp;

        const clonedExp: Experience = { ...exp };
        if (translated[descKey]   !== undefined) clonedExp.description       = translated[descKey];
        if (translated[reasonKey] !== undefined) clonedExp.reason_for_leaving = translated[reasonKey];
        return clonedExp;
      });
    }

    // Hobbies — clone the array with translated values
    if (candidate.hobbies?.length) {
      clone.hobbies = candidate.hobbies.map((hobby, i) => {
        const key = hobbyKey(i);
        return translated[key] !== undefined ? translated[key] : hobby;
      });
    }

    return clone;
  }
}
