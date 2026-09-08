import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { applyFieldErrors, clearServerError, serverErrorKey } from '../../core/field-errors';
import { contactRules } from '../data-access/contact-rules';
import { contactValidators, dateOfBirthRules } from '../data-access/contact-validators';
import { ContactDetail, ContactInput } from '../data-access/contact.model';
import { countries } from '../data-access/countries';
import { fieldMessages } from './field-messages';
import { FormFieldComponent } from './form-field.component';

/**
 * Every path the form can show a message for, in the order they appear on screen — which is also
 * the order the first invalid one is looked for in when a submit is refused.
 */
const fieldPaths = [
  'firstName',
  'surname',
  'dateOfBirth',
  'phoneNumber',
  'iban',
  'address.street',
  'address.houseNumber',
  'address.postalCode',
  'address.city',
  'address.country',
] as const;

@Component({
  selector: 'app-contact-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    DatePickerModule,
    FormFieldComponent,
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

  /** Today, and the earliest birthday the server will accept, for the picker's own bounds. */
  protected readonly today = startOfToday();
  protected readonly earliest = new Date(
    this.today.getFullYear() - contactRules.maximumAgeInYears,
    this.today.getMonth(),
    this.today.getDate(),
  );

  private readonly formBuilder = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Every rule comes from `contactValidators`, which is built from the same constants the server
   * validates against — so a field cannot be stricter or looser here than it is there.
   */
  protected readonly form = this.formBuilder.group({
    firstName: this.formBuilder.nonNullable.control('', contactValidators.namePart),
    surname: this.formBuilder.nonNullable.control('', contactValidators.namePart),
    dateOfBirth: this.formBuilder.control<Date | null>(null, dateOfBirthRules(this.today)),
    address: this.formBuilder.group({
      street: this.formBuilder.nonNullable.control('', contactValidators.street),
      houseNumber: this.formBuilder.nonNullable.control('', contactValidators.houseNumber),
      postalCode: this.formBuilder.nonNullable.control('', contactValidators.postalCode),
      city: this.formBuilder.nonNullable.control('', contactValidators.city),
      country: this.formBuilder.nonNullable.control('', contactValidators.country),
    }),
    phoneNumber: this.formBuilder.nonNullable.control('', contactValidators.phoneNumber),
    iban: this.formBuilder.nonNullable.control('', contactValidators.iban),
  });

  /**
   * A reactive form is not a signal, so its own event stream is what tells the messages below to
   * look again — status, value and touched changes all arrive here. Reading it once means the
   * messages are recomputed when the form actually changes rather than on every check.
   */
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  /** Path to the messages under that field, computed once per form change rather than per field. */
  protected readonly messages = computed(() => {
    this.formEvents();

    const byPath: Record<string, readonly string[]> = {};

    for (const path of fieldPaths) {
      byPath[path] = fieldMessages(path, this.form.get(path));
    }

    return byPath;
  });

  /** Messages the server sent that match no control, so they are shown with the buttons instead. */
  protected readonly formMessages = computed(() => {
    this.formEvents();

    const errors = this.form.errors;
    const homeless = errors === null ? undefined : errors[serverErrorKey];

    return Array.isArray(homeless) ? (homeless as readonly string[]) : [];
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

      this.form.setErrors(homeless.length > 0 ? { [serverErrorKey]: homeless } : null);
    });

    // One subscription rather than an (input) handler on all ten controls: a server message must
    // not outlive the value that caused it, wherever in the form that value was changed.
    this.form.valueChanges.subscribe(() => {
      for (const path of fieldPaths) {
        const control = this.form.get(path);

        if (control !== null) {
          clearServerError(control);
        }
      }
    });
  }

  get dirty(): boolean {
    return this.form.dirty;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitted.emit(toContactInput(this.form.getRawValue()));
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * A refused submit has to say so somewhere the person is looking. On a form this tall the first
   * problem is often above the fold, so the cursor goes to it rather than leaving Save looking dead.
   */
  private focusFirstInvalid(): void {
    const invalid = this.host.nativeElement.querySelector<HTMLElement>(
      'input.ng-invalid, .p-datepicker.ng-invalid input, .p-select.ng-invalid',
    );

    invalid?.focus();
    invalid?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

type FormValue = ReturnType<ContactFormComponent['form']['getRawValue']>;

function toFormValue(contact: ContactDetail) {
  return {
    firstName: contact.firstName,
    surname: contact.surname,
    dateOfBirth: fromIsoDate(contact.dateOfBirth),
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

/** Trimmed on the way out, because trimmed text is what the rules were checked against. */
function toContactInput(value: FormValue): ContactInput {
  const houseNumber = value.address.houseNumber.trim();

  return {
    firstName: value.firstName.trim(),
    surname: value.surname.trim(),
    dateOfBirth: toIsoDate(value.dateOfBirth),
    address: {
      street: value.address.street.trim(),
      houseNumber: houseNumber === '' ? null : houseNumber,
      postalCode: value.address.postalCode.trim(),
      city: value.address.city.trim(),
      country: value.address.country,
    },
    phoneNumber: value.phoneNumber.trim(),
    iban: value.iban.trim(),
  };
}

/**
 * A date of birth is a calendar date, not an instant, and the date picker works in local time.
 * `new Date('1988-04-12')` parses that as midnight *UTC*, which the picker then renders in local
 * time — a day earlier for anyone west of Greenwich, and a day earlier again every time the contact
 * is saved. Building the date from its parts keeps it the day it says it is.
 */
function fromIsoDate(value: string): Date | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (parts === null) {
    return null;
  }

  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

/** The inverse of {@link fromIsoDate}: local parts out, so the round trip is lossless. */
function toIsoDate(date: Date | null): string {
  if (date === null) {
    return '';
  }

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Midnight local, so a date-only comparison is not decided by the time the page was opened. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
