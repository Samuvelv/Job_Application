// src/app/shared/components/language-selector/language-selector.component.ts
import { Component, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '../../../core/services/language.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  styles: [`
    .lang-selector {
      position: relative;
    }

    .lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius);
      background: var(--th-surface);
      color: var(--th-text);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: border-color .15s, background .15s;
      white-space: nowrap;
    }
    .lang-btn:hover {
      border-color: var(--th-border-strong);
      background: var(--th-surface-2, var(--th-surface));
    }

    .lang-flag  { font-size: 16px; line-height: 1; }
    .lang-code  { font-size: 12px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; }
    .lang-caret { font-size: 10px; opacity: .6; transition: transform .2s; }
    .lang-btn--open .lang-caret { transform: rotate(180deg); }

    /* Dropdown */
    .lang-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 190px;
      max-height: 340px;
      overflow-y: auto;
      background: var(--th-surface);
      border: 1px solid var(--th-border);
      border-radius: var(--th-radius-xl);
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      z-index: 1100;
      padding: 6px;
      animation: langFadeIn .15s ease;
    }

    @keyframes langFadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .lang-dropdown__label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--th-muted);
      padding: 4px 8px 6px;
    }

    .lang-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--th-radius);
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: start;
      color: var(--th-text);
      font-size: 13px;
      transition: background .12s;
    }
    .lang-option:hover {
      background: var(--th-surface-2, rgba(0,0,0,.05));
    }
    .lang-option--active {
      background: var(--th-primary-soft, rgba(99,102,241,.1));
      font-weight: 600;
    }
    .lang-option__flag { font-size: 18px; line-height: 1; flex-shrink: 0; }
    .lang-option__name { flex: 1; }
    .lang-option__check {
      color: var(--th-primary);
      font-size: 12px;
      flex-shrink: 0;
    }
  `],
  template: `
    <div class="lang-selector" (click)="$event.stopPropagation()">

      <!-- Trigger button -->
      <button
        class="lang-btn"
        [class.lang-btn--open]="open()"
        (click)="toggle()"
        [attr.aria-label]="'LANG.select_language' | translate"
        [attr.aria-expanded]="open()"
      >
        <span class="lang-flag">{{ langSvc.current().flag }}</span>
        <span class="lang-code">{{ langSvc.current().code }}</span>
        <i class="bi bi-chevron-down lang-caret"></i>
      </button>

      <!-- Dropdown -->
      @if (open()) {
        <div class="lang-dropdown" role="listbox" [attr.aria-label]="'LANG.select_language' | translate">
          <div class="lang-dropdown__label">{{ 'LANG.language' | translate }}</div>
          @for (lang of langSvc.languages; track lang.code) {
            <button
              class="lang-option"
              [class.lang-option--active]="lang.code === langSvc.current().code"
              role="option"
              [attr.aria-selected]="lang.code === langSvc.current().code"
              (click)="select(lang)"
            >
              <span class="lang-option__flag">{{ lang.flag }}</span>
              <span class="lang-option__name">{{ lang.name }}</span>
              @if (lang.code === langSvc.current().code) {
                <i class="bi bi-check2 lang-option__check"></i>
              }
            </button>
          }
        </div>
      }

    </div>
  `,
})
export class LanguageSelectorComponent {
  open = signal(false);

  constructor(public langSvc: LanguageService) {}

  toggle(): void { this.open.update(v => !v); }

  select(lang: Language): void {
    this.langSvc.use(lang.code);
    this.open.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.open.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.open.set(false); }
}
