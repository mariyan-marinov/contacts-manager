import { AbstractControl } from '@angular/forms';
import { contactRules } from '../data-access/contact-rules';
import { serverErrorKey } from '../../core/field-errors';

/**
 * What to show under a field that is invalid. A server message wins outright — it knows things the
 * client cannot check, such as an IBAN's checksum — and otherwise the rule that failed is named in
 * the terms the person typing would use.
 *
 * Nothing is shown until the control has been touched, so a form does not open covered in errors.
 */
export function fieldMessages(path: string, control: AbstractControl | null): readonly string[] {
  if (control === null || !control.touched || control.errors === null) {
    return [];
  }

  const fromServer = control.errors[serverErrorKey];

  if (Array.isArray(fromServer)) {
    return fromServer as readonly string[];
  }

  return [describe(path, control.errors)];
}

/**
 * One message per field: the first rule that failed, said plainly. Vague copy — "not in a form we
 * recognise" — leaves a person guessing, so each message states the limit or the characters allowed
 * rather than only that something is wrong.
 */
function describe(path: string, errors: Record<string, unknown>): string {
  const label = labels[path] ?? path;

  if ('required' in errors) {
    return `${label} is required.`;
  }

  const tooLong = lengthBound(errors['maxlength']);

  if (tooLong !== null) {
    return `${label} must be ${tooLong} characters or fewer.`;
  }

  const tooShort = lengthBound(errors['minlength']);

  if (tooShort !== null) {
    return `${label} must be at least ${tooShort} characters.`;
  }

  if ('ibanLength' in errors) {
    return `${label} must be between ${contactRules.ibanMinLength} and ${contactRules.ibanMaxLength} characters, ignoring spaces.`;
  }

  if ('phoneDigits' in errors) {
    return `${label} must contain at least ${contactRules.phoneMinimumDigits} digits.`;
  }

  if ('dateInFuture' in errors) {
    return `${label} cannot be in the future.`;
  }

  if ('dateTooEarly' in errors) {
    return `${label} cannot be more than ${contactRules.maximumAgeInYears} years ago.`;
  }

  return patternMessages[path] ?? `${label} is not in a form we recognise.`;
}

/**
 * Angular's length errors carry the limit they enforced, so the message quotes it from there rather
 * than from a second table that would have to be kept in step with the validators.
 */
function lengthBound(error: unknown): number | null {
  if (error === null || typeof error !== 'object' || !('requiredLength' in error)) {
    return null;
  }

  const required = (error as { requiredLength: unknown }).requiredLength;

  return typeof required === 'number' ? required : null;
}

const labels: Readonly<Record<string, string>> = {
  firstName: 'First name',
  surname: 'Surname',
  dateOfBirth: 'Date of birth',
  'address.street': 'Street',
  'address.houseNumber': 'House number',
  'address.postalCode': 'Postal code',
  'address.city': 'City',
  'address.country': 'Country',
  phoneNumber: 'Phone number',
  iban: 'IBAN',
};

/** The same wording the server uses when it rejects the same pattern. */
const patternMessages: Readonly<Record<string, string>> = {
  firstName: 'First name may contain only letters, spaces, apostrophes and hyphens.',
  surname: 'Surname may contain only letters, spaces, apostrophes and hyphens.',
  'address.postalCode': 'Postal code may contain only letters, digits, spaces and hyphens.',
  phoneNumber: 'Phone number may contain only digits, spaces and the characters + - ( ).',
  iban: 'IBAN starts with two letters and two digits, then letters and digits.',
};
