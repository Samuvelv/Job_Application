// src/app/shared/components/skeleton/skeleton.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton"
         [style.width]="width"
         [style.height]="height"
         [style.border-radius]="radius"
         [class.skeleton-circle]="circle">
    </div>
  `,
})
export class SkeletonComponent {
  @Input() width  = '100%';
  @Input() height = '1rem';
  @Input() radius = '0.375rem';
  @Input() circle = false;
}
