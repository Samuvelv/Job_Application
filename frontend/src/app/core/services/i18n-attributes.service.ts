// src/app/core/services/i18n-attributes.service.ts
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

/**
 * Service to handle translation of HTML attributes and values
 * Useful for placeholders, titles, aria-labels, etc. that cannot use the translate pipe
 */
@Injectable({
  providedIn: 'root',
})
export class I18nAttributesService {
  constructor(private translateService: TranslateService) {}

  /**
   * Translate a single key
   * @param key i18n key (e.g., 'FORMS.first_name')
   * @returns Observable of translated string
   */
  translate(key: string): Observable<string> {
    return this.translateService.get(key);
  }

  /**
   * Translate multiple keys at once
   * @param keys Array of i18n keys
   * @returns Observable of object with translations
   */
  translateMultiple(keys: string[]): Observable<Record<string, string>> {
    return this.translateService.get(keys);
  }

  /**
   * Translate and subscribe (for one-time use)
   * @param key i18n key
   * @param callback Function to call with translated string
   */
  instant(key: string): string {
    return this.translateService.instant(key);
  }

  /**
   * Get translated placeholder text
   * @param key Placeholder key (e.g., 'PLACEHOLDERS.search_name')
   * @returns Translated placeholder string
   */
  getPlaceholder(key: string): Observable<string> {
    return this.translate(key);
  }

  /**
   * Get translated button label
   * @param key Button key (e.g., 'BUTTONS.save')
   * @returns Translated button text
   */
  getButtonLabel(key: string): Observable<string> {
    return this.translate(key);
  }

  /**
   * Get translated form label
   * @param key Form key (e.g., 'FORMS.first_name')
   * @returns Translated label text
   */
  getFormLabel(key: string): Observable<string> {
    return this.translate(key);
  }

  /**
   * Get translated error message
   * @param key Error key (e.g., 'FORMS.required_field')
   * @returns Translated error message
   */
  getErrorMessage(key: string): Observable<string> {
    return this.translate(key);
  }

  /**
   * Get multiple form labels at once
   * @param keys Array of form keys
   * @returns Observable of translated labels
   */
  getFormLabels(keys: string[]): Observable<Record<string, string>> {
    return this.translateMultiple(keys);
  }

  /**
   * Interpolate variables in translated string
   * @param key i18n key
   * @param vars Object with variables to interpolate
   * @returns Observable of interpolated string
   */
  interpolate(key: string, vars: Record<string, any>): Observable<string> {
    return this.translateService.get(key, vars);
  }
}
