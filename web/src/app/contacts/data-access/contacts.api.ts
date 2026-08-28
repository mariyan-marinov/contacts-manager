import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactListItem, ContactQuery, PagedResult } from './contact.model';

/** The only place in the app that talks HTTP. Effects call this; components never do. */
@Injectable({ providedIn: 'root' })
export class ContactsApi {
  private static readonly endpoint = '/api/contacts';

  private readonly http = inject(HttpClient);

  list(query: ContactQuery): Observable<PagedResult<ContactListItem>> {
    let params = new HttpParams()
      .set('sort', query.sort)
      .set('direction', query.direction)
      .set('page', query.page)
      .set('size', query.size);

    if (query.search !== null && query.search !== '') {
      params = params.set('search', query.search);
    }

    return this.http.get<PagedResult<ContactListItem>>(ContactsApi.endpoint, { params });
  }
}
