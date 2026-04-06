// src/app/core/services/theme.service.ts
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = signal(localStorage.getItem('th_theme') === 'dark');
  readonly isDark = this._dark.asReadonly();

  constructor() {
    // Apply theme on init
    this.applyTheme(this._dark());
    // Keep DOM in sync whenever signal changes
    effect(() => this.applyTheme(this._dark()));
  }

  toggle(): void {
    this._dark.update(d => !d);
    localStorage.setItem('th_theme', this._dark() ? 'dark' : 'light');
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
