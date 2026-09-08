import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Leaving a half-filled form should be a decision, not an accident. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  // Injected before the early return: inject() belongs at the top of an injection context, not
  // behind a branch that decides whether it runs.
  const confirmation = inject(ConfirmationService);

  if (!component.hasUnsavedChanges()) {
    return true;
  }

  return new Observable<boolean>((subscriber) => {
    const answer = (leave: boolean) => {
      subscriber.next(leave);
      subscriber.complete();
    };

    confirmation.confirm({
      header: 'Discard your changes?',
      message: 'This contact has edits that have not been saved.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Discard',
      rejectLabel: 'Keep editing',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => answer(true),
      // Every way out other than Discard arrives here: the Keep editing button, the close icon and
      // Escape all emit reject, so the router always gets an answer.
      reject: () => answer(false),
    });
  });
};
