import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { ContactDetail, ContactInput } from '../data-access/contact.model';
import { ContactFormComponent } from './contact-form.component';

const detail: ContactDetail = {
  id: '8f1d0f1e-3a6c-4a2b-9c7d-0b5a2e6f1c34',
  firstName: 'Sanne',
  surname: 'Bakker',
  dateOfBirth: '1988-04-12',
  address: {
    street: 'Keizersgracht',
    houseNumber: '241',
    postalCode: '1016 EA',
    city: 'Amsterdam',
    country: 'NL',
  },
  phoneNumber: '+31 6 2145 8890',
  iban: 'NL91ABNA0417164300',
  version: 7,
};

/**
 * The form is `protected`, which is right for the template and inconvenient for a test. Reaching it
 * here is deliberate and confined to this helper.
 */
function formOf(fixture: ComponentFixture<ContactFormComponent>): FormGroup {
  return (fixture.componentInstance as unknown as { form: FormGroup }).form;
}

async function render(contact: ContactDetail | null = null) {
  TestBed.configureTestingModule({ imports: [ContactFormComponent] });

  const fixture = TestBed.createComponent(ContactFormComponent);
  fixture.componentRef.setInput('contact', contact);
  await fixture.whenStable();

  return fixture;
}

/** Submits through the real event, so the template's own wiring is part of what is tested. */
async function submit(fixture: ComponentFixture<ContactFormComponent>): Promise<ContactInput[]> {
  const emitted: ContactInput[] = [];
  fixture.componentInstance.submitted.subscribe((contact) => emitted.push(contact));

  const form = (fixture.nativeElement as HTMLElement).querySelector('form');
  form?.dispatchEvent(new Event('submit'));
  await fixture.whenStable();

  return emitted;
}

describe('ContactFormComponent', () => {
  describe('the date of birth', () => {
    /**
     * The bug this pins: `new Date('1988-04-12')` is midnight **UTC**, and the picker reads it back
     * with local getters — so west of Greenwich it showed, and then saved, the 11th. Asserting that
     * the control holds local midnight of the stated day is what makes this test decisive in every
     * timezone rather than only in the one the suite happens to run in.
     */
    it('is held as local midnight of the day the server sent', async () => {
      const fixture = await render(detail);

      const value: unknown = formOf(fixture).get('dateOfBirth')?.value;

      expect(value).toBeInstanceOf(Date);
      expect(value).toEqual(new Date(1988, 3, 12));
      expect((value as Date).getHours()).toBe(0);
    });

    it('goes back to the server as the day it came in as', async () => {
      const fixture = await render(detail);

      const emitted = await submit(fixture);

      expect(emitted).toHaveLength(1);
      expect(emitted[0].dateOfBirth).toBe('1988-04-12');
    });

    it('survives a load and save with nothing touched in between', async () => {
      const fixture = await render(detail);

      const emitted = await submit(fixture);

      expect(emitted[0]).toEqual({
        firstName: detail.firstName,
        surname: detail.surname,
        dateOfBirth: detail.dateOfBirth,
        address: detail.address,
        phoneNumber: detail.phoneNumber,
        iban: detail.iban,
      });
    });

    it('refuses a date in the future, which the picker alone cannot stop being typed', async () => {
      const fixture = await render(detail);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      formOf(fixture).get('dateOfBirth')?.setValue(tomorrow);

      expect(formOf(fixture).get('dateOfBirth')?.errors).toEqual({ dateInFuture: true });
    });

    it('refuses a date more than a lifetime ago', async () => {
      const fixture = await render(detail);

      formOf(fixture)
        .get('dateOfBirth')
        ?.setValue(new Date(1700, 0, 1));

      expect(formOf(fixture).get('dateOfBirth')?.errors).toHaveProperty('dateTooEarly');
    });
  });

  /** Each of these was a rule only the server enforced, so a valid-looking form earned a 400. */
  describe('the rules the server would otherwise have to catch', () => {
    it('refuses an IBAN longer than the server will store', async () => {
      const fixture = await render(detail);

      formOf(fixture)
        .get('iban')
        ?.setValue(`NL91ABNA${'0'.repeat(30)}`);

      expect(formOf(fixture).get('iban')?.errors).toHaveProperty('ibanLength');
    });

    it('accepts an IBAN typed in the spaced groups it is normally written in', async () => {
      const fixture = await render(detail);

      formOf(fixture).get('iban')?.setValue('NL91 ABNA 0417 1643 00');

      expect(formOf(fixture).get('iban')?.errors).toBeNull();
    });

    it('refuses a phone number with too few digits to be one', async () => {
      const fixture = await render(detail);

      formOf(fixture).get('phoneNumber')?.setValue('+++-----');

      expect(formOf(fixture).get('phoneNumber')?.errors).toHaveProperty('phoneDigits');
    });

    it('counts a name after trimming, not as typed', async () => {
      const fixture = await render(detail);

      formOf(fixture)
        .get('surname')
        ?.setValue(`  ${'a'.repeat(50)}  `);

      expect(formOf(fixture).get('surname')?.errors).toBeNull();
    });

    it('treats a box holding only spaces as empty', async () => {
      const fixture = await render(detail);

      formOf(fixture).get('surname')?.setValue('   ');

      expect(formOf(fixture).get('surname')?.errors).toEqual({ required: true });
    });

    it('trims what it sends, because trimmed text is what the rules were checked against', async () => {
      const fixture = await render(detail);
      formOf(fixture).get('surname')?.setValue('  Bakker  ');

      const emitted = await submit(fixture);

      expect(emitted[0].surname).toBe('Bakker');
    });

    it('sends a blank house number as absent rather than as an empty string', async () => {
      const fixture = await render(detail);
      formOf(fixture).get('address.houseNumber')?.setValue('  ');

      const emitted = await submit(fixture);

      expect(emitted[0].address.houseNumber).toBeNull();
    });
  });

  describe('submitting', () => {
    it('emits nothing while anything is invalid', async () => {
      const fixture = await render(detail);
      formOf(fixture).get('surname')?.setValue('');

      const emitted = await submit(fixture);

      expect(emitted).toHaveLength(0);
    });

    it('shows what is wrong instead of failing silently', async () => {
      const fixture = await render(detail);
      formOf(fixture).get('surname')?.setValue('');

      await submit(fixture);

      expect(formOf(fixture).get('surname')?.touched).toBe(true);
      expect(text(fixture)).toContain('Surname is required.');
    });

    it('says which limit was passed rather than that something is wrong', async () => {
      const fixture = await render(detail);
      formOf(fixture).get('surname')?.setValue('a'.repeat(51));

      await submit(fixture);

      expect(text(fixture)).toContain('Surname must be 50 characters or fewer.');
    });

    it('names the characters a name may contain', async () => {
      const fixture = await render(detail);
      formOf(fixture).get('surname')?.setValue('Bakker42');

      await submit(fixture);

      expect(text(fixture)).toContain('may contain only letters, spaces, apostrophes and hyphens');
    });
  });

  describe('errors the server sent', () => {
    it('shows a message under the field it belongs to', async () => {
      const fixture = await render(detail);

      fixture.componentRef.setInput('fieldErrors', {
        iban: ["'Iban' has an invalid checksum."],
      });
      await fixture.whenStable();

      expect(formOf(fixture).get('iban')?.touched).toBe(true);
      expect(text(fixture)).toContain("'Iban' has an invalid checksum.");
    });

    it('shows a message that matches no field rather than dropping it', async () => {
      const fixture = await render(detail);

      fixture.componentRef.setInput('fieldErrors', {
        somethingElse: ['That will not do.'],
      });
      await fixture.whenStable();

      expect(text(fixture)).toContain('That will not do.');
    });

    it('drops a message as soon as the value that caused it changes', async () => {
      const fixture = await render(detail);
      fixture.componentRef.setInput('fieldErrors', {
        iban: ["'Iban' has an invalid checksum."],
      });
      await fixture.whenStable();

      formOf(fixture).get('iban')?.setValue('NL91ABNA0417164300');
      await fixture.whenStable();

      expect(text(fixture)).not.toContain('invalid checksum');
    });
  });

  describe('a new contact', () => {
    it('opens empty and with nothing marked wrong yet', async () => {
      const fixture = await render(null);

      expect(formOf(fixture).get('surname')?.value).toBe('');
      expect(formOf(fixture).get('surname')?.touched).toBe(false);
      expect(text(fixture)).not.toContain('is required');
    });

    it('is not dirty until something is typed into it', async () => {
      const fixture = await render(null);

      expect(fixture.componentInstance.dirty).toBe(false);

      formOf(fixture).get('surname')?.markAsDirty();

      expect(fixture.componentInstance.dirty).toBe(true);
    });
  });

  describe('every field', () => {
    it('has a label pointing at the control it labels', async () => {
      const fixture = await render(detail);
      const host = fixture.nativeElement as HTMLElement;

      for (const label of host.querySelectorAll('label')) {
        const id = label.getAttribute('for');

        expect(id).toBeTruthy();
        expect(host.querySelector(`#${id}`)).not.toBeNull();
      }
    });

    it('points its control at the region its messages appear in', async () => {
      const fixture = await render(detail);
      const host = fixture.nativeElement as HTMLElement;

      const input = host.querySelector('#surnameInput');
      const describedBy = input?.getAttribute('aria-describedby') ?? '';

      expect(describedBy).toContain('surname-error');
      expect(host.querySelector('#surname-error')).not.toBeNull();
    });
  });
});

function text(fixture: ComponentFixture<ContactFormComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}
