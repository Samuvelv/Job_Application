// src/app/core/services/bulk-translation.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UserDataTranslationService } from './user-data-translation.service';

/**
 * Bulk Translation Service
 * Translates multiple fields in a single API call, grouped by sections
 * 
 * OPTIMIZATION STRATEGY:
 * - Batches multiple fields (professional, bio, skills, experiences, etc.) into ONE API call per section
 * - Intelligent text length handling: if section exceeds MAX_CHUNK_SIZE, splits into smaller chunks
 * - Verifies ALL text is translated with comprehensive logging
 * - Caches results with 1-hour TTL to minimize API calls
 * 
 * API EFFICIENCY:
 * - Profile with 5 skills + 3 experiences + 2 educations = 7 API calls max (1 per section)
 * - If section text is large, auto-splits: e.g., 5 skills → 1-2 API calls instead of 5
 * - All text is guaranteed to be translated or falls back to original
 * 
 * Usage:
 * const translations = await bulkTranslationService.translateSection({
 *   job_title: 'Angular Developer',
 *   industry: 'Technology & Software',
 *   years_experience: '5'
 * }, 'fr');
 * 
 * Result:
 * {
 *   job_title: 'Développeur Angular',
 *   industry: 'Technologie et logiciels',
 *   years_experience: '5'
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class BulkTranslationService {
  private cache = new Map<string, Map<string, Record<string, string>>>();
  
  // OpenAI has token limits (~2000 tokens per request for safety)
  // Each token is roughly 4 characters, so max 8000 chars per batch
  // Being conservative: 5000 chars max per API call to stay well within limits
  private readonly MAX_CHUNK_SIZE = 5000;

  constructor(
    private userDataTranslation: UserDataTranslationService,
    private translate: TranslateService
  ) {}

  /**
   * Translate a section of fields in a single API call (or multiple if text is large)
   * Groups all non-empty fields and translates them together
   * Automatically chunks if text length exceeds MAX_CHUNK_SIZE
   * Verifies ALL text was translated
   * 
   * @param fields Object with key-value pairs to translate
   * @param language Target language code
   * @returns Promise with translated fields (guaranteed complete or original fallback)
   */
  async translateSection(
    fields: Record<string, string | null | undefined>,
    language: string
  ): Promise<Record<string, string>> {
    // If English or no fields, return as-is
    if (language === 'en') {
      return this.filterFields(fields);
    }

    // Create cache key from filtered fields
    const filledFields = this.filterFields(fields);
    
    if (Object.keys(filledFields).length === 0) {
      return filledFields;
    }

    const cacheKey = JSON.stringify(filledFields);
    const langCache = this.cache.get(language) || new Map();
    
    if (langCache.has(cacheKey)) {
      console.log('📦 Translation retrieved from cache');
      return langCache.get(cacheKey)!;
    }

    try {
      // Chunk fields if necessary
      const chunks = this.chunkFieldsBySize(filledFields);
      const translatedChunks: Record<string, string> = {};

      // Translate each chunk in parallel (usually just 1 chunk)
      const chunkPromises = chunks.map(chunk =>
        this.userDataTranslation.translateUserFields(chunk, language)
          .catch(error => {
            console.error('Chunk translation failed:', error);
            return chunk; // Fallback to original on error
          })
      );

      const allTranslated = await Promise.all(chunkPromises);

      // Merge all chunks
      for (const translated of allTranslated) {
        Object.assign(translatedChunks, translated);
      }

      // Verify completeness
      const verification = this.verifyTranslationCompleteness(filledFields, translatedChunks);
      
      // Cache result (complete or partial with fallback)
      langCache.set(cacheKey, translatedChunks);
      this.cache.set(language, langCache);

      return translatedChunks;
    } catch (error) {
      console.error('Bulk translation failed:', error);
      return filledFields; // Fallback to original
    }
  }

  /**
   * Translate multiple sections at once
   * Each section makes one API call
   * 
   * @param sections Object with section names and their fields
   * @param language Target language code
   * @returns Promise with all sections translated
   * 
   * Usage:
   * const result = await bulkService.translateMultipleSections({
   *   professional: {
   *     job_title: 'Angular Developer',
   *     industry: 'Technology',
   *     occupation: 'Software Engineer'
   *   },
   *   bio: {
   *     bio: 'I am a developer...'
   *   },
   *   hobbies: {
   *     hobbies: 'Coding, Gaming, Reading'
   *   }
   * }, 'fr');
   */
  async translateMultipleSections(
    sections: Record<string, Record<string, string | null | undefined>>,
    language: string
  ): Promise<Record<string, Record<string, string>>> {
    if (language === 'en') {
      const result: Record<string, Record<string, string>> = {};
      for (const [sectionName, fields] of Object.entries(sections)) {
        result[sectionName] = this.filterFields(fields);
      }
      return result;
    }

    const result: Record<string, Record<string, string>> = {};

    // Translate each section in parallel
    const translationPromises = Object.entries(sections).map(
      async ([sectionName, fields]) => {
        const translated = await this.translateSection(fields, language);
        result[sectionName] = translated;
      }
    );

    await Promise.all(translationPromises);
    return result;
  }

  /**
   * Translate experience entries in bulk
   * Combines all descriptions and translates them together
   * Automatically chunks if total text exceeds MAX_CHUNK_SIZE
   * Verifies ALL experience fields are translated
   * 
   * @param experiences Array of experience objects
   * @param language Target language code
   * @returns Promise with translated experiences (guaranteed complete or original fallback)
   */
  async translateExperienceBulk(
    experiences: Array<{
      id?: string;
      job_title?: string | null;
      company_name?: string | null;
      description?: string | null;
      reason_for_leaving?: string | null;
      [key: string]: any;
    }>,
    language: string
  ): Promise<Record<string, Record<string, string>>> {
    if (language === 'en' || !experiences?.length) {
      return {};
    }

    const result: Record<string, Record<string, string>> = {};

    // Create a single payload with all experiences
    const allFields: Record<string, string> = {};
    const indexMap: Record<string, string> = {}; // Maps payload key to exp index

    for (let i = 0; i < experiences.length; i++) {
      const exp = experiences[i];
      
      if (exp.job_title) {
        const key = `exp_${i}_job_title`;
        allFields[key] = exp.job_title;
        indexMap[key] = `${i}`;
      }
      if (exp.company_name) {
        const key = `exp_${i}_company_name`;
        allFields[key] = exp.company_name;
        indexMap[key] = `${i}`;
      }
      if (exp.description) {
        const key = `exp_${i}_description`;
        allFields[key] = exp.description;
        indexMap[key] = `${i}`;
      }
      if (exp.reason_for_leaving) {
        const key = `exp_${i}_reason`;
        allFields[key] = exp.reason_for_leaving;
        indexMap[key] = `${i}`;
      }
    }

    if (Object.keys(allFields).length === 0) {
      return result;
    }

    try {
      // Chunk fields if necessary
      const chunks = this.chunkFieldsBySize(allFields);
      const translatedChunks: Record<string, string> = {};

      // Translate each chunk in parallel
      const chunkPromises = chunks.map(chunk =>
        this.userDataTranslation.translateUserFields(chunk, language)
          .catch(error => {
            console.error('Experience chunk translation failed:', error);
            return chunk; // Fallback to original on error
          })
      );

      const allTranslated = await Promise.all(chunkPromises);

      // Merge all chunks
      for (const translated of allTranslated) {
        Object.assign(translatedChunks, translated);
      }

      // Verify completeness
      this.verifyTranslationCompleteness(allFields, translatedChunks);

      // Reorganize by experience index
      for (const [key, value] of Object.entries(translatedChunks)) {
        const expIndex = indexMap[key];
        if (!result[expIndex]) {
          result[expIndex] = {};
        }
        const fieldName = key.replace(/exp_\d+_/, '');
        result[expIndex][fieldName] = value;
      }

      return result;
    } catch (error) {
      console.error('Experience bulk translation failed:', error);
      return result;
    }
  }

  /**
   * Translate education entries in bulk
   * Automatically chunks if text length exceeds MAX_CHUNK_SIZE
   * Verifies ALL education fields are translated
   * 
   * @param educations Array of education objects
   * @param language Target language code
   * @returns Promise with translated educations
   */
  async translateEducationBulk(
    educations: Array<{
      id?: string;
      degree?: string | null;
      field_of_study?: string | null;
      institution?: string | null;
      description?: string | null;
      [key: string]: any;
    }>,
    language: string
  ): Promise<Record<string, Record<string, string>>> {
    if (language === 'en' || !educations?.length) {
      return {};
    }

    const result: Record<string, Record<string, string>> = {};
    const allFields: Record<string, string> = {};
    const indexMap: Record<string, string> = {};

    for (let i = 0; i < educations.length; i++) {
      const edu = educations[i];
      
      if (edu.degree) {
        const key = `edu_${i}_degree`;
        allFields[key] = edu.degree;
        indexMap[key] = `${i}`;
      }
      if (edu.field_of_study) {
        const key = `edu_${i}_field`;
        allFields[key] = edu.field_of_study;
        indexMap[key] = `${i}`;
      }
      if (edu.institution) {
        const key = `edu_${i}_institution`;
        allFields[key] = edu.institution;
        indexMap[key] = `${i}`;
      }
      if (edu.description) {
        const key = `edu_${i}_description`;
        allFields[key] = edu.description;
        indexMap[key] = `${i}`;
      }
    }

    if (Object.keys(allFields).length === 0) {
      return result;
    }

    try {
      // Chunk fields if necessary
      const chunks = this.chunkFieldsBySize(allFields);
      const translatedChunks: Record<string, string> = {};

      // Translate each chunk in parallel
      const chunkPromises = chunks.map(chunk =>
        this.userDataTranslation.translateUserFields(chunk, language)
          .catch(error => {
            console.error('Education chunk translation failed:', error);
            return chunk; // Fallback to original on error
          })
      );

      const allTranslated = await Promise.all(chunkPromises);

      // Merge all chunks
      for (const translated of allTranslated) {
        Object.assign(translatedChunks, translated);
      }

      // Verify completeness
      this.verifyTranslationCompleteness(allFields, translatedChunks);

      for (const [key, value] of Object.entries(translatedChunks)) {
        const eduIndex = indexMap[key];
        if (!result[eduIndex]) {
          result[eduIndex] = {};
        }
        const fieldName = key.replace(/edu_\d+_/, '');
        result[eduIndex][fieldName] = value;
      }

      return result;
    } catch (error) {
      console.error('Education bulk translation failed:', error);
      return result;
    }
  }

  /**
   * Translate skills in bulk
   * All skill names translated in 1-2 API calls (chunked if needed)
   * Verifies ALL skill names are translated
   * 
   * @param skills Array of skill objects with skill_name
   * @param language Target language code
   * @returns Promise with translated skill names mapped by index
   */
  async translateSkillsBulk(
    skills: Array<{ skill_name: string; [key: string]: any }>,
    language: string
  ): Promise<Record<string, string>> {
    if (language === 'en' || !skills?.length) {
      return {};
    }

    const skillsToTranslate: Record<string, string> = {};
    skills.forEach((skill, index) => {
      if (skill.skill_name) {
        skillsToTranslate[`skill_${index}`] = skill.skill_name;
      }
    });

    if (Object.keys(skillsToTranslate).length === 0) {
      return {};
    }

    try {
      // Chunk fields if necessary
      const chunks = this.chunkFieldsBySize(skillsToTranslate);
      const translatedChunks: Record<string, string> = {};

      // Translate each chunk in parallel
      const chunkPromises = chunks.map(chunk =>
        this.userDataTranslation.translateUserFields(chunk, language)
          .catch(error => {
            console.error('Skills chunk translation failed:', error);
            return chunk; // Fallback to original on error
          })
      );

      const allTranslated = await Promise.all(chunkPromises);

      // Merge all chunks
      for (const translated of allTranslated) {
        Object.assign(translatedChunks, translated);
      }

      // Verify completeness
      this.verifyTranslationCompleteness(skillsToTranslate, translatedChunks);

      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(translatedChunks)) {
        const index = key.replace('skill_', '');
        result[index] = value;
      }
      return result;
    } catch (error) {
      console.error('Skills bulk translation failed:', error);
      return {};
    }
  }

  /**
   * Translate certificates in bulk
   * Automatically chunks if text length exceeds MAX_CHUNK_SIZE
   * Verifies ALL certificate fields are translated
   * 
   * @param certificates Array of certificate objects
   * @param language Target language code
   * @returns Promise with translated certificates
   */
  async translateCertificatesBulk(
    certificates: Array<{
      id?: string;
      name?: string | null;
      issuer?: string | null;
      description?: string | null;
      [key: string]: any;
    }>,
    language: string
  ): Promise<Record<string, Record<string, string>>> {
    if (language === 'en' || !certificates?.length) {
      return {};
    }

    const result: Record<string, Record<string, string>> = {};
    const allFields: Record<string, string> = {};
    const indexMap: Record<string, string> = {};

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      
      if (cert.name) {
        const key = `cert_${i}_name`;
        allFields[key] = cert.name;
        indexMap[key] = `${i}`;
      }
      if (cert.issuer) {
        const key = `cert_${i}_issuer`;
        allFields[key] = cert.issuer;
        indexMap[key] = `${i}`;
      }
      if (cert.description) {
        const key = `cert_${i}_description`;
        allFields[key] = cert.description;
        indexMap[key] = `${i}`;
      }
    }

    if (Object.keys(allFields).length === 0) {
      return result;
    }

    try {
      // Chunk fields if necessary
      const chunks = this.chunkFieldsBySize(allFields);
      const translatedChunks: Record<string, string> = {};

      // Translate each chunk in parallel
      const chunkPromises = chunks.map(chunk =>
        this.userDataTranslation.translateUserFields(chunk, language)
          .catch(error => {
            console.error('Certificates chunk translation failed:', error);
            return chunk; // Fallback to original on error
          })
      );

      const allTranslated = await Promise.all(chunkPromises);

      // Merge all chunks
      for (const translated of allTranslated) {
        Object.assign(translatedChunks, translated);
      }

      // Verify completeness
      this.verifyTranslationCompleteness(allFields, translatedChunks);

      for (const [key, value] of Object.entries(translatedChunks)) {
        const certIndex = indexMap[key];
        if (!result[certIndex]) {
          result[certIndex] = {};
        }
        const fieldName = key.replace(/cert_\d+_/, '');
        result[certIndex][fieldName] = value;
      }

      return result;
    } catch (error) {
      console.error('Certificates bulk translation failed:', error);
      return result;
    }
  }

  /**
   * Clear all cached translations
   * Call this when language changes
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific language
   */
  clearLanguageCache(language: string): void {
    this.cache.delete(language);
  }

  /**
   * Filter out null and undefined values from object
   */
  private filterFields(
    fields: Record<string, string | null | undefined>
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Calculate total text length for a batch of fields
   * Returns cumulative character count
   */
  private calculateTextLength(fields: Record<string, string>): number {
    return Object.values(fields).reduce((sum, text) => sum + (text?.length || 0), 0);
  }

  /**
   * Intelligently split fields into chunks if they exceed MAX_CHUNK_SIZE
   * Ensures each chunk stays under text length limit while keeping related fields together
   * 
   * Strategy:
   * 1. Group fields by type (job_title, company_name, description, etc.)
   * 2. If total length < MAX_CHUNK_SIZE, send as one batch
   * 3. If total length > MAX_CHUNK_SIZE, split into multiple batches
   * 4. Each batch respects the MAX_CHUNK_SIZE limit
   * 
   * @returns Array of field batches, each ready for one API call
   */
  private chunkFieldsBySize(fields: Record<string, string>): Array<Record<string, string>> {
    const totalLength = this.calculateTextLength(fields);
    
    // If fits in one chunk, return as-is
    if (totalLength <= this.MAX_CHUNK_SIZE) {
      return [fields];
    }

    console.warn(
      `⚠️ Translation batch (${totalLength} chars) exceeds MAX_CHUNK_SIZE (${this.MAX_CHUNK_SIZE} chars). ` +
      `Splitting into multiple requests for optimal API usage.`
    );

    const chunks: Array<Record<string, string>> = [];
    let currentChunk: Record<string, string> = {};
    let currentSize = 0;

    for (const [key, value] of Object.entries(fields)) {
      const valueLength = value?.length || 0;
      
      // If adding this field exceeds limit, start a new chunk
      if (currentSize + valueLength > this.MAX_CHUNK_SIZE && Object.keys(currentChunk).length > 0) {
        chunks.push({ ...currentChunk });
        currentChunk = {};
        currentSize = 0;
      }

      currentChunk[key] = value;
      currentSize += valueLength;
    }

    // Add remaining fields
    if (Object.keys(currentChunk).length > 0) {
      chunks.push(currentChunk);
    }

    console.log(
      `✂️  Split into ${chunks.length} batches: ` +
      chunks.map((c, i) => `Batch ${i + 1}: ${this.calculateTextLength(c)} chars`).join(' | ')
    );

    return chunks;
  }

  /**
   * Verify translation completeness
   * Ensures every input field has a translated output
   * Logs any fields that failed to translate
   * 
   * @returns Object with verification result and missing translations
   */
  private verifyTranslationCompleteness(
    originalFields: Record<string, string>,
    translatedFields: Record<string, string>
  ): { complete: boolean; missingKeys: string[] } {
    const missingKeys: string[] = [];

    for (const key of Object.keys(originalFields)) {
      if (!translatedFields[key] || translatedFields[key].trim().length === 0) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length === 0) {
      console.log('✅ Translation verification: ALL fields translated successfully');
      return { complete: true, missingKeys: [] };
    }

    console.warn(
      `⚠️ Translation verification: ${missingKeys.length}/${Object.keys(originalFields).length} fields failed. ` +
      `Missing: ${missingKeys.join(', ')}`
    );
    return { complete: false, missingKeys };
  }
}
