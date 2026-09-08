import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ContactDetail,
  ContactInput,
  ContactListItem,
  ContactQuery,
  PagedResult,
} from './contact.model';

/** The only place in the app that talks HTTP. Effects call this; components never do. */
@Injectable({ providedIn: 'root' })
export class ContactsApi {
  private static readonly endpoint = '/api/contacts';

  private readonly http = inject(HttpClient);

  /** An empty search is left out of the URL entirely: absent means unfiltered to the server. */
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

  /** The one request that returns an unmasked IBAN, and only for the contact being opened. */
  getById(id: string): Observable<ContactDetail> {
    return this.http.get<ContactDetail>(`${ContactsApi.endpoint}/${encodeURIComponent(id)}`);
  }

  create(contact: ContactInput): Observable<void> {
    return this.http.post<void>(ContactsApi.endpoint, contact);
  }

  /**
   * The version travels in the body next to the values it was read with. If someone else has saved
   * in the meantime the server answers 409, which is the only way this can fail on a valid form.
   */
  update(id: string, contact: ContactInput, version: number): Observable<void> {
    return this.http.put<void>(`${ContactsApi.endpoint}/${encodeURIComponent(id)}`, {
      ...contact,
      version,
    });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${ContactsApi.endpoint}/${encodeURIComponent(id)}`);
  }
}
