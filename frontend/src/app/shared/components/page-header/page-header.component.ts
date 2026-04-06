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
        <h1 class="page-title">
          @if (icon) { <i class="bi {{ icon }} me-2"></i> }
          {{ title }}
        </h1>
        @if (subtitle) {
          <p class="page-subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="page-header-actions">
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
