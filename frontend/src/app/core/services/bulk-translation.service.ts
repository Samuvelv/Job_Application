// src/app/core/services/bulk-translation.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UserDataTranslationService } from './user-data-translation.service';

/**
 * Bulk Translation Service
 * Translates multiple fields in a single API call, grouped by sections
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

  constructor(
    private userDataTranslation: UserDataTranslationService,
    private translate: TranslateService
  ) {}

  /**
   * Translate a section of fields in a single API call
   * Groups all non-empty fields and translates them together
   * 
   * @param fields Object with key-value pairs to translate
   * @param language Target language code
   * @returns Promise with translated fields
   */
  async translateSection(
    fields: Record<string, string | null | undefined>,
    language: string
  ): Promise<Record<string, string>> {
    // If English or no fields, return as-is
    if (language === 'en') {
      return this.filterFields(fields);
    }

    // Create cache key
    const cacheKey = JSON.stringify(fields);
    const langCache = this.cache.get(language) || new Map();
    
    if (langCache.has(cacheKey)) {
      return langCache.get(cacheKey)!;
    }

    // Filter out null/undefined values
    const filledFields = this.filterFields(fields);
    
    if (Object.keys(filledFields).length === 0) {
      return filledFields;
    }

    try {
      // Translate all fields in one API call
      const translated = await this.userDataTranslation.translateUserFields(
        filledFields,
        language
      );

      // Cache result
      langCache.set(cacheKey, translated);
      this.cache.set(language, langCache);

      return translated;
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
   * 
   * @param experiences Array of experience objects
   * @param language Target language code
   * @returns Promise with translated experiences
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

    let fieldIndex = 0;
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
      const translated = await this.userDataTranslation.translateUserFields(
        allFields,
        language
      );

      // Reorganize by experience index
      for (const [key, value] of Object.entries(translated)) {
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
      const translated = await this.userDataTranslation.translateUserFields(
        allFields,
        language
      );

      for (const [key, value] of Object.entries(translated)) {
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
   * 
   * @param skills Array of skill objects with skill_name
   * @param language Target language code
   * @returns Promise with translated skill names
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
      const translated = await this.userDataTranslation.translateUserFields(
        skillsToTranslate,
        language
      );

      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(translated)) {
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
      const translated = await this.userDataTranslation.translateUserFields(
        allFields,
        language
      );

      for (const [key, value] of Object.entries(translated)) {
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
}
