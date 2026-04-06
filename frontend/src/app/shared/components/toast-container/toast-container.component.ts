// src/app/shared/components/toast-container/toast-container.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="position-fixed top-0 end-0 p-3" style="z-index:2000;min-width:280px">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast show align-items-center mb-2"
          [class.text-bg-success]="toast.type === 'success'"
          [class.text-bg-danger]="toast.type === 'error'"
          [class.text-bg-warning]="toast.type === 'warning'"
          [class.text-bg-info]="toast.type === 'info'"
          role="alert">
          <div class="d-flex">
            <div class="toast-body small">{{ toast.message }}</div>
            <button type="button" class="btn-close me-2 m-auto btn-close-white"
              (click)="toastSvc.dismiss(toast.id)"></button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  constructor(readonly toastSvc: ToastService) {}
}
