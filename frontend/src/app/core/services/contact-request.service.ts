// src/app/core/services/contact-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactRequest } from '../models/contact-request.model';

export interface PaginatedContactRequests {
  data: ContactRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class ContactRequestService {
  private readonly api = `${environment.apiUrl}/contact-requests`;

  constructor(private http: HttpClient) {}

  // Recruiter: request contact info for a candidate
  create(candidateId: string): Observable<{ request: ContactRequest }> {
    return this.http.post<{ request: ContactRequest }>(`${this.api}/${candidateId}`, {});
  }

  // Recruiter: get own requests
  getMyRequests(): Observable<{ requests: ContactRequest[] }> {
    return this.http.get<{ requests: ContactRequest[] }>(`${this.api}/me`);
  }

  // Admin: list all requests with optional status filter
  list(filters: { status?: string; page?: number; limit?: number } = {}): Observable<PaginatedContactRequests> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedContactRequests>(this.api, { params });
  }

  // Admin: approve or reject
  review(id: string, data: { status: 'approved' | 'rejected'; admin_note?: string }): Observable<{ request: ContactRequest }> {
    return this.http.put<{ request: ContactRequest }>(`${this.api}/${id}/review`, data);
  }
}
