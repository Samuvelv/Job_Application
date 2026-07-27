// src/app/core/services/component-translation.service.ts
import { Injectable, inject } from '@angular/core';
import { UserDataTranslationService } from './user-data-translation.service';
import { TranslateService } from '@ngx-translate/core';

/**
 * Component Translation Service
 * 
 * Provides easy-to-use methods for translating user data in components
 * without needing to manage complexity of async operations
 * 
 * Usage:
 * constructor(private componentTranslation: ComponentTranslationService) {}
 * 
 * async translateProfile() {
 *   const translated = await this.componentTranslation.translateFields({
 *     bio: candidate.bio,
 *     job_title: candidate.job_title
 *   }, 'es');
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class ComponentTranslationService {
  private userDataTranslation = inject(UserDataTranslationService);
  private translate = inject(TranslateService);

  /**
   * Translate a single field
   */
  async translateField(text: string, language?: string): Promise<string> {
    const lang = language || this.translate.currentLang || 'en';
    
    if (lang === 'en' || !text) {
      return text;
    }

    return this.userDataTranslation.translateUserData(text, lang);
  }

  /**
   * Translate multiple fields at once
   */
  async translateFields(
    fields: Record<string, string>,
    language?: string
  ): Promise<Record<string, string>> {
    const lang = language || this.translate.currentLang || 'en';
    
    if (lang === 'en') {
      return fields;
    }

    // Filter out empty fields
    const fieldsToTranslate = Object.fromEntries(
      Object.entries(fields).filter(([_, v]) => v && v.trim())
    );

    if (Object.keys(fieldsToTranslate).length === 0) {
      return fields;
    }

    return this.userDataTranslation.translateUserFields(fieldsToTranslate, lang);
  }

  /**
   * Translate candidate's key fields
   */
  async translateCandidate(candidate: any, language?: string): Promise<any> {
    const lang = language || this.translate.currentLang || 'en';
    
    if (lang === 'en') {
      return candidate;
    }

    const fieldsToTranslate: Record<string, string> = {};
    
    if (candidate.bio) fieldsToTranslate.bio = candidate.bio;
    if (candidate.job_title) fieldsToTranslate.job_title = candidate.job_title;
    if (candidate.occupation) fieldsToTranslate.occupation = candidate.occupation;
    if (candidate.industry) fieldsToTranslate.industry = candidate.industry;
    if (candidate.hobbies?.length) fieldsToTranslate.hobbies = candidate.hobbies.join(', ');

    const translated = await this.userDataTranslation.translateUserFields(
      fieldsToTranslate,
      lang
    );

    return {
      ...candidate,
      ...translated
    };
  }

  /**
   * Translate experience item
   */
  async translateExperience(experience: any, language?: string): Promise<any> {
    const lang = language || this.translate.currentLang || 'en';
    
    if (lang === 'en') {
      return experience;
    }

    const fieldsToTranslate: Record<string, string> = {};
    
    if (experience.job_title) fieldsToTranslate.job_title = experience.job_title;
    if (experience.company_name) fieldsToTranslate.company_name = experience.company_name;
    if (experience.description) fieldsToTranslate.description = experience.description;
    if (experience.reason_for_leaving) fieldsToTranslate.reason_for_leaving = experience.reason_for_leaving;

    const translated = await this.userDataTranslation.translateUserFields(
      fieldsToTranslate,
      lang
    );

    return {
      ...experience,
      ...translated
    };
  }

  /**
   * Translate education item
   */
  async translateEducation(education: any, language?: string): Promise<any> {
    const lang = language || this.translate.currentLang || 'en';
    
    if (lang === 'en') {
      return education;
    }

    const fieldsToTranslate: Record<string, string> = {};
    
    if (education.degree) fieldsToTranslate.degree = education.degree;
    if (education.field_of_study) fieldsToTranslate.field_of_study = education.field_of_study;
    if (education.institution) fieldsToTranslate.institution = education.institution;

    const translated = await this.userDataTranslation.translateUserFields(
      fieldsToTranslate,
      lang
    );

    return {
      ...education,
      ...translated
    };
  }

  /**
   * Check if translation is needed
   */
  needsTranslation(): boolean {
    return (this.translate.currentLang || 'en') !== 'en';
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.translate.currentLang || 'en';
  }
}
