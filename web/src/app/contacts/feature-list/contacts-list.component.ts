import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { parseContactQuery, toQueryParams } from '../data-access/contact-query-params';
import {
  ContactListItem,
  ContactListView,
  ContactSortField,
  SortDirection,
  defaultContactQuery,
  isSameListView,
  isSortField,
} from '../data-access/contact.model';
import { contactsPageActions } from '../data-access/state/contacts.actions';
import { contactsFeature } from '../data-access/state/contacts.feature';

@Component({
  selector: 'app-contacts-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TooltipModule,
  ],
  templateUrl: './contacts-list.component.html',
  styleUrl: './contacts-list.component.scss',
})
export class ContactsListComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly contacts = this.store.selectSignal(contactsFeature.selectAllContacts);
  protected readonly total = this.store.selectSignal(contactsFeature.selectTotal);
  protected readonly loading = this.store.selectSignal(contactsFeature.selectLoading);
  protected readonly error = this.store.selectSignal(contactsFeature.selectError);
  protected readonly query = this.store.selectSignal(contactsFeature.selectQuery);
  protected readonly firstRow = this.store.selectSignal(contactsFeature.selectFirstRow);

  /** Ephemeral: what is in the box right now, before the debounce turns it into a query. */
  protected readonly searchTerm = signal('');

  constructor() {
    const fromUrl = parseContactQuery(this.route.snapshot.queryParamMap);
    this.searchTerm.set(fromUrl.search ?? '');
    this.store.dispatch(contactsPageActions.opened({ query: fromUrl }));

    // Keeps the address bar in step with the store, so a reload or a shared link lands on the
    // same view. replaceUrl, because paging is not a browser-history event.
    effect(() => {
      const query = this.query();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: toQueryParams(query),
        replaceUrl: true,
      });
    });
  }

  /**
   * The table announces its paging and sorting whenever one of those inputs settles, not only
   * when the user changes something — on a single page load it repeats the state the store just
   * gave it four times over. Each repeat used to become a request that the next one cancelled,
   * so only a genuine change is turned into an action.
   */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const size = event.rows ?? defaultContactQuery.size;
    const sortField = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
    const sort: ContactSortField = isSortField(sortField) ? sortField : defaultContactQuery.sort;
    const direction: SortDirection = event.sortOrder === -1 ? 'desc' : 'asc';
    const view: ContactListView = {
      page: Math.floor((event.first ?? 0) / size) + 1,
      size,
      sort,
      direction,
    };

    if (isSameListView(view, this.query())) {
      return;
    }

    this.store.dispatch(contactsPageActions.queryChanged({ query: view }));
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
    this.store.dispatch(contactsPageActions.searchChanged({ search: term === '' ? null : term }));
  }

  protected onRetry(): void {
    this.store.dispatch(contactsPageActions.refreshed());
  }

  protected onAdd(): void {
    void this.router.navigate(['/contacts/new']);
  }

  protected onEdit(contact: ContactListItem): void {
    void this.router.navigate(['/contacts', contact.id]);
  }

  protected onDelete(contact: ContactListItem): void {
    const name = `${contact.firstName} ${contact.surname}`;

    this.confirmation.confirm({
      header: 'Delete this contact?',
      message: `${name} will be removed permanently.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      // Backing out is the safe default, so it should not compete with the destructive button.
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () =>
        this.store.dispatch(contactsPageActions.deleteConfirmed({ id: contact.id, name })),
    });
  }
}
