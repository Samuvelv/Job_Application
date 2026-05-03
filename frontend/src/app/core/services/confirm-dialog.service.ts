// src/app/core/services/confirm-dialog.service.ts
import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
  showNoteField?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
}

export interface ConfirmResult {
  confirmed: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  // The dialog component registers itself here on init
  private dialog: { open(opts: ConfirmOptions): Promise<ConfirmResult> } | null = null;

  register(dialog: { open(opts: ConfirmOptions): Promise<ConfirmResult> }): void {
    this.dialog = dialog;
  }

  confirm(options: ConfirmOptions = {}): Promise<ConfirmResult> {
    if (!this.dialog) {
      // Fallback if component not mounted
      const confirmed = window.confirm(options.message ?? 'Are you sure?');
      return Promise.resolve({ confirmed });
    }
    return this.dialog.open(options);
  }
}
