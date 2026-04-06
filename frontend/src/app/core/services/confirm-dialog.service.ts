// src/app/core/services/confirm-dialog.service.ts
import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  // The dialog component registers itself here on init
  private dialog: { open(opts: ConfirmOptions): Promise<boolean> } | null = null;

  register(dialog: { open(opts: ConfirmOptions): Promise<boolean> }): void {
    this.dialog = dialog;
  }

  confirm(options: ConfirmOptions = {}): Promise<boolean> {
    if (!this.dialog) {
      // Fallback if component not mounted
      return Promise.resolve(window.confirm(options.message ?? 'Are you sure?'));
    }
    return this.dialog.open(options);
  }
}
