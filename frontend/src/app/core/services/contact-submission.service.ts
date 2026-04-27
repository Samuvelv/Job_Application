import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactSubmission } from '../models/contact-submission.model';

export interface SubmitPayload {
  name:     string;
  email:    string;
  phone?:   string | null;
  subject?: string | null;
  message:  string;
}

export interface PaginatedSubmissions {
  data: ContactSubmission[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class ContactSubmissionService {
  private readonly api = `${environment.apiUrl}/contact-submissions`;

  constructor(private http: HttpClient) {}

  submit(payload: SubmitPayload): Observable<{ submission: ContactSubmission }> {
    return this.http.post<{ submission: ContactSubmission }>(this.api, payload);
  }

  list(page = 1, limit = 10): Observable<PaginatedSubmissions> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedSubmissions>(this.api, { params });
  }

  markRead(id: string): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.api}/${id}/read`, {});
  }
}
