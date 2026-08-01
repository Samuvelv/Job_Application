// src/app/core/pipes/locale-date.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { LanguageService } from '../services/language.service';

/**
 * Locale-aware replacement for Angular's built-in `date` pipe.
 * Formats using the currently selected UI language's locale instead of a
 * fixed LOCALE_ID, and re-formats live when the language changes (impure).
 */
@Pipe({
  name: 'localeDate',
  standalone: true,
  pure: false,
})
export class LocaleDatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(value: unknown, format = 'mediumDate', timezone?: string): string | null {
    if (value == null || value === '') return null;
    try {
      return formatDate(value as string | number | Date, format, this.languageService.activeLocale(), timezone);
    } catch {
      return formatDate(value as string | number | Date, format, 'en-US', timezone);
    }
  }
}
