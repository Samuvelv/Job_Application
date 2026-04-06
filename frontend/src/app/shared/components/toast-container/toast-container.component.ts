// src/app/shared/components/toast-container/toast-container.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="position-fixed top-0 end-0 p-3" style="z-index:2000;min-width:300px">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast show align-items-center mb-2 toast-custom"
          [class.toast-custom--success]="toast.type === 'success'"
          [class.toast-custom--error]="toast.type === 'error'"
          [class.toast-custom--warning]="toast.type === 'warning'"
          [class.toast-custom--info]="toast.type === 'info'"
          role="alert">
          <div class="d-flex align-items-center gap-2 px-3 py-2">
            <div class="toast-icon">
              @if (toast.type === 'success') { <i class="bi bi-check-lg"></i> }
              @if (toast.type === 'error') { <i class="bi bi-x-lg"></i> }
              @if (toast.type === 'warning') { <i class="bi bi-exclamation-triangle"></i> }
              @if (toast.type === 'info') { <i class="bi bi-info-circle"></i> }
            </div>
            <div class="toast-body small flex-grow-1 p-0">{{ toast.message }}</div>
            <button type="button" class="btn-close ms-2"
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
