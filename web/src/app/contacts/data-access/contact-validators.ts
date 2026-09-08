import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';
import { contactPatterns, contactRules, countDigits, normaliseIban } from './contact-rules';

/**
 * Angular validators built from {@link contactRules}, each applied to the same tidied text the
 * server judges rather than to the raw keystrokes — so a trailing space cannot fail on the client
 * and pass on the server, or the other way round.
 *
 * Only the rules that are cheap to check locally live here. The IBAN's mod-97 checksum stays a
 * server rule and comes back bound to its field; see `applyFieldErrors`.
 */

/** Required, but counted after trimming: a box holding only spaces is empty. */
export const requiredText: ValidatorFn = (control) =>
  text(control).length === 0 ? { required: true } : null;

export function maxTextLength(max: number): ValidatorFn {
  return (control) => {
    const length = text(control).length;
    return length > max ? { maxlength: { requiredLength: max, actualLength: length } } : null;
  };
}

export function minTextLength(min: number): ValidatorFn {
  return (control) => {
    const length = text(control).length;
    return length > 0 && length < min
      ? { minlength: { requiredLength: min, actualLength: length } }
      : null;
  };
}

export function matchesPattern(pattern: RegExp): ValidatorFn {
  return (control) => {
    const value = text(control);
    return value !== '' && !pattern.test(value) ? { pattern: true } : null;
  };
}

/** At least as many digits as the server insists on, so `+++-----` is refused here too. */
export const enoughPhoneDigits: ValidatorFn = (control) => {
  const value = text(control);

  return value !== '' && countDigits(value) < contactRules.phoneMinimumDigits
    ? { phoneDigits: { required: contactRules.phoneMinimumDigits } }
    : null;
};

/**
 * Length and shape are checked against the normalised value, which is what the server stores — so
 * an IBAN typed in its conventional spaced groups is judged the way it will be kept, and one that
 * is simply too long is caught before the round trip.
 */
export const ibanShape: ValidatorFn = (control) => {
  const value = normaliseIban(text(control));

  if (value === '') {
    return null;
  }

  if (value.length < contactRules.ibanMinLength || value.length > contactRules.ibanMaxLength) {
    return {
      ibanLength: { min: contactRules.ibanMinLength, max: contactRules.ibanMaxLength },
    };
  }

  return contactPatterns.iban.test(value) ? null : { pattern: true };
};

/**
 * Not in the future, and not more than a lifetime ago. The date picker's own min and max stop this
 * being reachable by clicking, but its input can still be typed into.
 */
export function dateOfBirthRange(today: Date): ValidatorFn {
  const earliest = new Date(
    today.getFullYear() - contactRules.maximumAgeInYears,
    today.getMonth(),
    today.getDate(),
  );

  return (control) => {
    const value: unknown = control.value;

    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return null;
    }

    if (value > today) {
      return { dateInFuture: true };
    }

    return value < earliest
      ? { dateTooEarly: { maximumAgeInYears: contactRules.maximumAgeInYears } }
      : null;
  };
}

/**
 * The date rules need to know what today is, so they are built rather than listed. Everything else
 * is a constant and sits in {@link contactValidators}.
 */
export function dateOfBirthRules(today: Date): ValidatorFn[] {
  return [Validators.required, dateOfBirthRange(today)];
}

/**
 * The rule sets each field is built from, so the form reads as a list of fields rather than of
 * rules. Left to inference: `as const` would freeze these into readonly tuples, which a
 * FormBuilder will not take, and an index signature would hide the names.
 */
export const contactValidators = {
  namePart: [
    requiredText,
    maxTextLength(contactRules.nameMaxLength),
    matchesPattern(contactPatterns.personName),
  ],
  street: [requiredText, maxTextLength(contactRules.streetMaxLength)],
  houseNumber: [maxTextLength(contactRules.houseNumberMaxLength)],
  postalCode: [
    requiredText,
    maxTextLength(contactRules.postalCodeMaxLength),
    matchesPattern(contactPatterns.postalCode),
  ],
  city: [requiredText, maxTextLength(contactRules.cityMaxLength)],
  country: [Validators.required],
  phoneNumber: [
    requiredText,
    minTextLength(contactRules.phoneMinLength),
    maxTextLength(contactRules.phoneMaxLength),
    matchesPattern(contactPatterns.phone),
    enoughPhoneDigits,
  ],
  iban: [requiredText, ibanShape],
};

function text(control: AbstractControl): string {
  return typeof control.value === 'string' ? control.value.trim() : '';
}
