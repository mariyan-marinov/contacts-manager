import { FormControl, FormGroup, Validators } from '@angular/forms';
import { applyFieldErrors, clearServerError, serverErrorKey } from './field-errors';

function contactForm() {
  return new FormGroup({
    firstName: new FormControl('Sanne', { nonNullable: true }),
    iban: new FormControl('GB00WRONG', { nonNullable: true }),
    address: new FormGroup({
      city: new FormControl('', { nonNullable: true }),
      country: new FormControl('NL', { nonNullable: true }),
    }),
  });
}

describe('applyFieldErrors', () => {
  it('puts a top-level message on its own control', () => {
    const form = contactForm();

    const homeless = applyFieldErrors(form, { iban: ["'Iban' has an invalid checksum."] });

    expect(form.get('iban')?.errors).toEqual({
      [serverErrorKey]: ["'Iban' has an invalid checksum."],
    });
    expect(form.get('iban')?.touched).toBe(true);
    expect(homeless).toEqual([]);
  });

  // The API keys nested rules by path, and this is the case most likely to silently miss.
  it('reaches into a nested group by its dotted path', () => {
    const form = contactForm();

    applyFieldErrors(form, { 'address.city': ["'City' must not be empty."] });

    expect(form.get('address.city')?.errors).toEqual({
      [serverErrorKey]: ["'City' must not be empty."],
    });
    expect(form.get('address.country')?.errors).toBeNull();
  });

  it('keeps client-side errors that are already on the control', () => {
    const form = contactForm();
    const city = form.get('address.city');
    city?.addValidators(Validators.required);
    city?.updateValueAndValidity();

    applyFieldErrors(form, { 'address.city': ['Server says no.'] });

    expect(city?.errors).toEqual({ required: true, [serverErrorKey]: ['Server says no.'] });
  });

  it('hands back messages that match no control instead of dropping them', () => {
    const form = contactForm();

    const homeless = applyFieldErrors(form, {
      version: ['Version must be the version returned when the contact was read.'],
    });

    expect(homeless).toEqual([
      'Version must be the version returned when the contact was read.',
    ]);
  });

  it('does nothing when there are no field errors', () => {
    const form = contactForm();

    expect(applyFieldErrors(form, null)).toEqual([]);
    expect(form.get('iban')?.errors).toBeNull();
  });
});

describe('clearServerError', () => {
  it('removes only the server message and leaves client validation alone', () => {
    const control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
    control.updateValueAndValidity();
    applyFieldErrors(new FormGroup({ field: control }), { field: ['Server says no.'] });

    clearServerError(control);

    expect(control.errors).toEqual({ required: true });
  });

  it('leaves the control valid when the server message was the only error', () => {
    const control = new FormControl('ok', { nonNullable: true });
    applyFieldErrors(new FormGroup({ field: control }), { field: ['Server says no.'] });

    clearServerError(control);

    expect(control.errors).toBeNull();
    expect(control.valid).toBe(true);
  });
});
