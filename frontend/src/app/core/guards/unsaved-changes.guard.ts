// src/app/core/guards/unsaved-changes.guard.ts
import { inject }           from '@angular/core';
import { CanDeactivateFn }  from '@angular/router';
import { ConfirmDialogService } from '../services/confirm-dialog.service';

export interface HasUnsavedChanges {
  isDirty(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  // Form is clean — allow navigation immediately
  if (!component.isDirty()) return true;

  // Show the custom modal instead of browser-native confirm()
  return inject(ConfirmDialogService)
    .confirm({
      title:        'Unsaved Changes',
      message:      'You have unsaved changes. If you leave now, your changes may be lost. ' +
                    'Your draft will be saved and can be restored when you return.',
      icon:         'bi-exclamation-triangle-fill',
      variant:      'warning',
      // "Stay on Page" — safe primary action
      cancelLabel:  'Stay on Page',
      cancelClass:  'btn-primary',
      // "Leave Page" — destructive secondary action
      confirmLabel: 'Leave Page',
      confirmClass: 'btn-outline-danger',
    })
    .then(result => result.confirmed); // confirmed = true → leave, false → stay
};
