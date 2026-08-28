import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Leaving a half-filled form should be a decision, not an accident. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  const confirmation = inject(ConfirmationService);

  return new Observable<boolean>((subscriber) => {
    confirmation.confirm({
      header: 'Discard your changes?',
      message: 'This contact has edits that have not been saved.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Discard',
      rejectLabel: 'Keep editing',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        subscriber.next(true);
        subscriber.complete();
      },
      reject: () => {
        subscriber.next(false);
        subscriber.complete();
      },
    });
  });
};
