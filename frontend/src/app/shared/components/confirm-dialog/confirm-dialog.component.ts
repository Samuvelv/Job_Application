// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService, ConfirmOptions } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <!-- Backdrop -->
      <div class="modal-backdrop fade show" style="z-index:1050"></div>

      <!-- Dialog -->
      <div class="modal d-block" tabindex="-1" style="z-index:1055" role="dialog">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content confirm-dialog">
            <div class="modal-header border-0 pb-0">
              <div>
                <div class="confirm-dialog__icon">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <h5 class="modal-title fw-semibold">{{ title() }}</h5>
              </div>
            </div>
            <div class="modal-body pt-2">
              <p class="text-muted mb-0">{{ message() }}</p>
            </div>
            <div class="modal-footer border-0 pt-0 gap-2">
              <button class="btn btn-outline-secondary btn-sm"
                      (click)="resolve(false)">
                {{ cancelLabel() }}
              </button>
              <button class="btn btn-sm"
                      [class]="confirmClass()"
                      (click)="resolve(true)">
                {{ confirmLabel() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent implements OnInit {
  visible      = signal(false);
  title        = signal('Are you sure?');
  message      = signal('This action cannot be undone.');
  confirmLabel = signal('Confirm');
  cancelLabel  = signal('Cancel');
  confirmClass = signal('btn-danger');

  private resolveFn!: (value: boolean) => void;

  constructor(private dialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.dialogService.register(this);
  }

  open(options: ConfirmOptions = {}): Promise<boolean> {
    this.title.set(options.title ?? 'Are you sure?');
    this.message.set(options.message ?? 'This action cannot be undone.');
    this.confirmLabel.set(options.confirmLabel ?? 'Confirm');
    this.cancelLabel.set(options.cancelLabel ?? 'Cancel');
    this.confirmClass.set(options.confirmClass ?? 'btn-danger');
    this.visible.set(true);
    return new Promise<boolean>(resolve => { this.resolveFn = resolve; });
  }

  resolve(value: boolean): void {
    this.visible.set(false);
    this.resolveFn?.(value);
  }
}
