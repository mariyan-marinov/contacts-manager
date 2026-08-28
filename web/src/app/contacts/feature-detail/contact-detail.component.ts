import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ContactInput } from '../data-access/contact.model';
import { contactFormActions } from '../data-access/state/contacts.actions';
import { contactsFeature } from '../data-access/state/contacts.feature';
import { ContactFormComponent } from '../ui/contact-form.component';

@Component({
  selector: 'app-contact-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    CardModule,
    ContactFormComponent,
    MessageModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './contact-detail.component.html',
  styleUrl: './contact-detail.component.scss',
})
export class ContactDetailComponent implements OnInit {
  /** Bound from the route. Absent on /contacts/new, which is what makes this page serve both. */
  readonly id = input<string | undefined>();

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly form = viewChild(ContactFormComponent);

  protected readonly contact = this.store.selectSignal(contactsFeature.selectSelected);
  protected readonly loading = this.store.selectSignal(contactsFeature.selectSelectedLoading);
  protected readonly saving = this.store.selectSignal(contactsFeature.selectSaving);
  private readonly saved = this.store.selectSignal(contactsFeature.selectSaved);
  protected readonly fieldErrors = this.store.selectSignal(contactsFeature.selectFieldErrors);
  protected readonly conflict = this.store.selectSignal(contactsFeature.selectConflict);
  protected readonly error = this.store.selectSignal(contactsFeature.selectError);

  /** Not the constructor: a route-bound input is not set until after construction. */
  ngOnInit(): void {
    this.store.dispatch(contactFormActions.opened({ id: this.id() ?? null }));
  }

  /**
   * Consulted by the route guard before this page is left. A form stays dirty after a successful
   * save, so being saved has to count as having nothing left to lose.
   */
  hasUnsavedChanges(): boolean {
    return this.form()?.dirty === true && !this.saving() && !this.saved();
  }

  protected onSubmitted(contact: ContactInput): void {
    this.store.dispatch(contactFormActions.submitted({ contact }));
  }

  protected onCancelled(): void {
    void this.router.navigate(['/contacts']);
  }

  protected onReload(): void {
    this.store.dispatch(contactFormActions.reloadRequested());
  }
}
