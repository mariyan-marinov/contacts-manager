import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { countryName } from '../data-access/countries';
import { contactFormActions } from '../data-access/state/contacts.actions';
import { contactsFeature } from '../data-access/state/contacts.feature';

/**
 * Reading a contact without being able to change it by accident. The edit form is one click away,
 * and until then nothing on this page can be typed into — which is the whole point of it: opening
 * someone's record to look up a phone number should not put every field of it at risk.
 *
 * It reuses the same `Contact Form Opened` action as the edit page, so the detail is fetched by the
 * one effect that knows how.
 */
@Component({
  selector: 'app-contact-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, MessageModule, ProgressSpinnerModule, TooltipModule],
  templateUrl: './contact-view.component.html',
  styleUrl: './contact-view.component.scss',
})
export class ContactViewComponent implements OnInit {
  /** Bound from the route. */
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly contact = this.store.selectSignal(contactsFeature.selectSelected);
  protected readonly loading = this.store.selectSignal(contactsFeature.selectSelectedLoading);

  protected readonly fullName = computed(() => {
    const contact = this.contact();
    return contact === null ? '' : `${contact.firstName} ${contact.surname}`;
  });

  /** The address as it would be written on an envelope, so it reads as one thing rather than five. */
  protected readonly addressLines = computed(() => {
    const address = this.contact()?.address;

    if (address === undefined) {
      return [];
    }

    return [
      `${address.street} ${address.houseNumber ?? ''}`.trim(),
      `${address.postalCode} ${address.city}`.trim(),
      countryName(address.country),
    ].filter((line) => line !== '');
  });

  ngOnInit(): void {
    this.store.dispatch(contactFormActions.opened({ id: this.id() }));
  }

  protected onEdit(): void {
    void this.router.navigate(['/contacts', this.id(), 'edit']);
  }

  protected onBack(): void {
    this.store.dispatch(contactFormActions.abandoned());
  }
}
