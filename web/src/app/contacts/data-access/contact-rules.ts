/**
 * The client-side half of the validation rules, and the only place they are written in TypeScript.
 *
 * Every value here mirrors a constant or a pattern on `ContactRules` in the Domain project.
 * `ContactRulesParityTests` in ContactsManager.Tests reads this file and fails the build if the two
 * ever disagree, so the duplication cannot drift silently — see RATIONALE for why the rules are
 * mirrored at all rather than fetched.
 *
 * Mirrors: src/ContactsManager.Domain/Validation/ContactRules.cs
 */

export const contactRules = {
  nameMaxLength: 50,
  streetMaxLength: 100,
  houseNumberMaxLength: 10,
  postalCodeMaxLength: 12,
  cityMaxLength: 85,
  maximumAgeInYears: 130,
  phoneMinLength: 8,
  phoneMaxLength: 20,
  phoneMinimumDigits: 7,
  ibanMinLength: 15,
  ibanMaxLength: 34,
} as const;

/**
 * Written exactly as the server writes them, so the parity test can compare the two character for
 * character. Each is applied to the same tidied text the server judges — trimmed, and for an IBAN
 * normalised — never to the raw keystrokes.
 */
export const contactPatterns = {
  personName: /^\p{L}[\p{L}\p{M}\s'-]*$/u,
  postalCode: /^[A-Za-z0-9][A-Za-z0-9 -]*$/,
  phone: /^[0-9+\-() ]+$/,
  iban: /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/,
} as const;

/** The same normalisation `IbanText.Normalise` applies: whitespace out, upper-cased. */
export function normaliseIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

/** The digits the server counts when it checks that a number carries enough of them. */
export function countDigits(value: string): number {
  return (value.match(/[0-9]/g) ?? []).length;
}
