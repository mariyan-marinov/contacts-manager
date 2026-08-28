import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { applyFieldErrors, clearServerError, serverErrorKey } from '../../core/field-errors';
import { ContactDetail, ContactInput } from '../data-access/contact.model';
import { countries } from '../data-access/countries';

/** Mirrors the server rules that are cheap to check, so an obvious slip costs no round trip. */
const namePattern = /^\p{L}[\p{L}\p{M}\s'-]*$/u;
const phonePattern = /^[0-9+\-() ]+$/;
const postalCodePattern = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;
const ibanPattern = /^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9 ]+$/;
const maximumAgeInYears = 130;

@Component({
  selector: 'app-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  readonly contact = input<ContactDetail | null>(null);
  readonly saving = input(false);
  readonly fieldErrors = input<Readonly<Record<string, readonly string[]>> | null>(null);

  readonly submitted = output<ContactInput>();
  readonly cancelled = output<void>();

  protected readonly countries = countries;
  protected readonly today = new Date();
  protected readonly earliest = new Date(
    this.today.getFullYear() - maximumAgeInYears,
    this.today.getMonth(),
    this.today.getDate(),
  );

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.group({
    firstName: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(namePattern),
    ]),
    surname: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(namePattern),
    ]),
    dateOfBirth: this.formBuilder.control<Date | null>(null, [Validators.required]),
    address: this.formBuilder.group({
      street: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(100),
      ]),
      houseNumber: this.formBuilder.nonNullable.control('', [Validators.maxLength(10)]),
      postalCode: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(12),
        Validators.pattern(postalCodePattern),
      ]),
      city: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(85),
      ]),
      country: this.formBuilder.nonNullable.control('', [Validators.required]),
    }),
    phoneNumber: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(20),
      Validators.pattern(phonePattern),
    ]),
    // Length and shape only. The mod-97 checksum stays a server rule, and its message comes back
    // bound to this control rather than as a toast.
    iban: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.minLength(15),
      Validators.pattern(ibanPattern),
    ]),
  });

  constructor() {
    effect(() => {
      const contact = this.contact();

      if (contact !== null) {
        this.form.reset(toFormValue(contact));
      }
    });

    effect(() => {
      const homeless = applyFieldErrors(this.form, this.fieldErrors());

      if (homeless.length > 0) {
        this.form.setErrors({ [serverErrorKey]: homeless });
      }
    });
  }

  get dirty(): boolean {
    return this.form.dirty;
  }

  protected messagesFor(path: string): readonly string[] {
    const control = this.form.get(path);

    if (control === null || !control.touched || control.errors === null) {
      return [];
    }

    const server = control.errors[serverErrorKey];

    return Array.isArray(server) ? (server as readonly string[]) : [describe(path, control)];
  }

  /** A server message must not outlive the value that caused it. */
  protected onFieldInput(path: string): void {
    const control = this.form.get(path);

    if (control !== null) {
      clearServerError(control);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(toContactInput(this.form.getRawValue()));
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}

type FormValue = ContactFormComponent['form'] extends { getRawValue(): infer T } ? T : never;

function toFormValue(contact: ContactDetail) {
  return {
    firstName: contact.firstName,
    surname: contact.surname,
    dateOfBirth: new Date(contact.dateOfBirth),
    address: {
      street: contact.address.street,
      houseNumber: contact.address.houseNumber ?? '',
      postalCode: contact.address.postalCode,
      city: contact.address.city,
      country: contact.address.country,
    },
    phoneNumber: contact.phoneNumber,
    iban: contact.iban,
  };
}

function toContactInput(value: FormValue): ContactInput {
  return {
    firstName: value.firstName,
    surname: value.surname,
    dateOfBirth: toIsoDate(value.dateOfBirth),
    address: {
      street: value.address.street,
      houseNumber: value.address.houseNumber === '' ? null : value.address.houseNumber,
      postalCode: value.address.postalCode,
      city: value.address.city,
      country: value.address.country,
    },
    phoneNumber: value.phoneNumber,
    iban: value.iban,
  };
}

/** The date picker works in local time; the API wants a plain calendar date. */
function toIsoDate(date: Date | null): string {
  if (date === null) {
    return '';
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function describe(path: string, control: AbstractControl): string {
  const errors = control.errors ?? {};
  const label = labels[path] ?? path;

  if ('required' in errors) {
    return `${label} is required.`;
  }

  if ('maxlength' in errors || 'minlength' in errors) {
    return `${label} is the wrong length.`;
  }

  return `${label} is not in a form we recognise.`;
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
