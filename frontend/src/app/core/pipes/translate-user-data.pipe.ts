// src/app/core/pipes/translate-user-data.pipe.ts
import { Pipe, PipeTransform, ChangeDetectorRef } from '@angular/core';
import { UserDataTranslationService } from '../services/user-data-translation.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';

/**
 * Pipe for real-time translation of user-provided data (bio, descriptions, etc.)
 * 
 * Usage in templates:
 * {{ candidate.bio | translateUserData | async }}
 * {{ candidate.job_title | translateUserData | async }}
 * 
 * Features:
 * - Auto-translates when language changes
 * - Caches translations for 1 hour
 * - Graceful fallback to original text on error
 * - Shows loading state while translating
 */
@Pipe({
  name: 'translateUserData',
  standalone: true,
  pure: false
})
export class TranslateUserDataPipe implements PipeTransform {
  private lastValue: string | null | undefined = '';
  private lastLang: string = '';
  private lastResult$: Observable<string | null | undefined> | null = null;

  constructor(
    private userDataTranslation: UserDataTranslationService,
    private translate: TranslateService
  ) {}

  transform(value: string | null | undefined): Observable<string | null | undefined> {
    // Return original if empty or English
    if (!value || this.translate.currentLang === 'en') {
      return of(value);
    }

    // Return cached result if text and language haven't changed
    if (value === this.lastValue && this.lastLang === this.translate.currentLang && this.lastResult$) {
      return this.lastResult$;
    }

    // Cache the new value and language
    this.lastValue = value;
    this.lastLang = this.translate.currentLang;

    // Create new translation observable
    this.lastResult$ = new Observable(observer => {
      this.userDataTranslation
        .translateUserData(value, this.translate.currentLang)
        .then(translated => {
          observer.next(translated);
          observer.complete();
        })
        .catch(error => {
          console.warn('Translation failed, using original text:', error);
          observer.next(value); // Fallback
          observer.complete();
        });
    });

    return this.lastResult$;
  }
}
