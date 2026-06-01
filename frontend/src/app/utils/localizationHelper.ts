import { TranslateService } from '@ngx-translate/core';

/**
 * Translate plain strings dynamically using ngx-translate.
 * Assumes translations exist in ./assets/i18n/{language}.json files.
 * 
 * @param {string} text - The string to translate.
 * @param {TranslateService} translate - ngx-translate service instance.
 * @param {string} fallback - Fallback string if translation is unavailable.
 * @returns {string} - Translated or fallback string.
 */
export function translatePlainString(text: string, translate: TranslateService, fallback: string = text): string {
  if (!text) return fallback; // Return original for empty values

  // Check for translation; return fallback if none exists.
  return translate.instant(text) || fallback;
}