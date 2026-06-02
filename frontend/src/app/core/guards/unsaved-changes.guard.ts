// src/app/core/guards/unsaved-changes.guard.ts
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  isDirty(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.isDirty()) return true;
  return confirm('You have unsaved changes. Are you sure you want to leave? Your draft has been saved and can be restored when you return.');
};
