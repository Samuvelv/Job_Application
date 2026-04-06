// src/app/shared/components/page-header/page-header.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <div class="page-header__title-row">
          @if (icon) {
            <div class="page-header__icon-wrap">
              <i class="bi {{ icon }}"></i>
            </div>
          }
          <div>
            <h1 class="page-header__title">{{ title }}</h1>
            @if (subtitle) {
              <p class="page-header__subtitle">{{ subtitle }}</p>
            }
          </div>
        </div>
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input() title    = '';
  @Input() subtitle = '';
  @Input() icon     = '';
}
