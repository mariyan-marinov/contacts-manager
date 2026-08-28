import { AbstractControl } from '@angular/forms';

export const serverErrorKey = 'server';

/**
 * Puts each server-side message on the control that caused it, so a rule only the API knows about —
 * an IBAN checksum, say — appears under its own field instead of in a toast. The API keys errors by
 * camel-cased path, which is exactly what `form.get()` understands, nested groups included.
 *
 * Anything with no matching control is returned rather than dropped, so the caller can still show it.
 */
export function applyFieldErrors(
  form: AbstractControl,
  fieldErrors: Readonly<Record<string, readonly string[]>> | null,
): readonly string[] {
  if (fieldErrors === null) {
    return [];
  }

  const homeless: string[] = [];

  for (const [path, messages] of Object.entries(fieldErrors)) {
    const control = form.get(path);

    if (control === null) {
      homeless.push(...messages);
      continue;
    }

    control.setErrors({ ...control.errors, [serverErrorKey]: messages });
    control.markAsTouched();
  }

  return homeless;
}

/** Server messages are cleared as soon as the value changes, so they cannot outlive their cause. */
export function clearServerError(control: AbstractControl): void {
  if (control.errors === null || !(serverErrorKey in control.errors)) {
    return;
  }

  const remaining = { ...control.errors };
  delete remaining[serverErrorKey];

  control.setErrors(Object.keys(remaining).length === 0 ? null : remaining);
}
