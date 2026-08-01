// src/app/core/pipes/locale-number.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatNumber, formatCurrency, getCurrencySymbol } from '@angular/common';
import { LanguageService } from '../services/language.service';

/**
 * Locale-aware replacement for Angular's built-in `number` pipe.
 * Formats using the currently selected UI language's locale, re-formatting
 * live when the language changes (impure).
 */
@Pipe({
  name: 'localeNumber',
  standalone: true,
  pure: false,
})
export class LocaleNumberPipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(value: unknown, digitsInfo?: string): string | null {
    if (value == null || value === '') return null;
    const num = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (isNaN(num)) return null;
    try {
      return formatNumber(num, this.languageService.activeLocale(), digitsInfo);
    } catch {
      return formatNumber(num, 'en-US', digitsInfo);
    }
  }
}

/**
 * Locale-aware replacement for Angular's built-in `currency` pipe.
 */
@Pipe({
  name: 'localeCurrency',
  standalone: true,
  pure: false,
})
export class LocaleCurrencyPipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(value: unknown, currencyCode = 'USD', display: 'code' | 'symbol' | 'symbol-narrow' | string = 'symbol', digitsInfo?: string): string | null {
    if (value == null || value === '') return null;
    const num = typeof value === 'string' ? parseFloat(value) : (value as number);
    if (isNaN(num)) return null;
    const locale = this.languageService.activeLocale();
    const symbol = display === 'code' ? currencyCode : getCurrencySymbol(currencyCode, display === 'symbol-narrow' ? 'narrow' : 'wide', locale);
    try {
      return formatCurrency(num, locale, symbol, currencyCode, digitsInfo);
    } catch {
      return formatCurrency(num, 'en-US', symbol, currencyCode, digitsInfo);
    }
  }
}
