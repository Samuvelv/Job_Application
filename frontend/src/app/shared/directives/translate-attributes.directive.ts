// src/app/shared/directives/translate-attributes.directive.ts
import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Directive to automatically translate HTML attributes
 * Usage:
 *   [appTranslatePlaceholder]="'PLACEHOLDERS.search_name'"
 *   [appTranslateTitle]="'BUTTONS.save'"
 *   [appTranslateAriaLabel]="'FORMS.first_name'"
 */
@Directive({
  selector: '[appTranslatePlaceholder], [appTranslateTitle], [appTranslateAriaLabel]',
  standalone: true,
})
export class TranslateAttributesDirective implements OnInit, OnDestroy {
  @Input() appTranslatePlaceholder: string = '';
  @Input() appTranslateTitle: string = '';
  @Input() appTranslateAriaLabel: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private el: ElementRef<HTMLElement>,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    if (this.appTranslatePlaceholder) {
      this.translate
        .get(this.appTranslatePlaceholder)
        .pipe(takeUntil(this.destroy$))
        .subscribe((translated) => {
          this.el.nativeElement.placeholder = translated;
        });

      // Update on language change
      this.translate.onLangChange
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.translate
            .get(this.appTranslatePlaceholder)
            .pipe(takeUntil(this.destroy$))
            .subscribe((translated) => {
              this.el.nativeElement.placeholder = translated;
            });
        });
    }

    if (this.appTranslateTitle) {
      this.translate
        .get(this.appTranslateTitle)
        .pipe(takeUntil(this.destroy$))
        .subscribe((translated) => {
          this.el.nativeElement.title = translated;
        });

      // Update on language change
      this.translate.onLangChange
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.translate
            .get(this.appTranslateTitle)
            .pipe(takeUntil(this.destroy$))
            .subscribe((translated) => {
              this.el.nativeElement.title = translated;
            });
        });
    }

    if (this.appTranslateAriaLabel) {
      this.translate
        .get(this.appTranslateAriaLabel)
        .pipe(takeUntil(this.destroy$))
        .subscribe((translated) => {
          this.el.nativeElement.setAttribute('aria-label', translated);
        });

      // Update on language change
      this.translate.onLangChange
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.translate
            .get(this.appTranslateAriaLabel)
            .pipe(takeUntil(this.destroy$))
            .subscribe((translated) => {
              this.el.nativeElement.setAttribute('aria-label', translated);
            });
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
