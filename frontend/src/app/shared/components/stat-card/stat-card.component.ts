// src/app/shared/components/stat-card/stat-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card">
      <div class="stat-icon">
        <i class="bi {{ icon }}"></i>
      </div>
      <div class="stat-body">
        <div class="stat-value">
          @if (loading) {
            <span class="skeleton skeleton-text" style="width:60px;height:28px;display:inline-block"></span>
          } @else {
            {{ value }}
          }
        </div>
        <div class="stat-label">{{ label }}</div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input() label   = '';
  @Input() value: string | number = '—';
  @Input() icon    = 'bi-bar-chart-fill';
  @Input() loading = false;
}
