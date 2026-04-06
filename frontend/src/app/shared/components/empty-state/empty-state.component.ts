// src/app/shared/components/empty-state/empty-state.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="empty-state">
      <i class="bi {{ icon }} empty-state-icon"></i>
      <h5 class="empty-state-title">{{ title }}</h5>
      @if (subtitle || message) {
        <p class="empty-state-message">{{ subtitle || message }}</p>
      }
      @if (actionLabel && actionRoute) {
        <a [routerLink]="actionRoute" class="btn btn-primary mt-2">{{ actionLabel }}</a>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon        = 'bi-inbox';
  @Input() title       = 'Nothing here yet';
  /** @deprecated use subtitle instead */
  @Input() message     = '';
  @Input() subtitle    = '';
  @Input() actionLabel = '';
  @Input() actionRoute = '';
}
