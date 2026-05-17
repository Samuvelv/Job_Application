// src/app/core/services/recruiter-access-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecruiterAccessRequest } from '../models/recruiter-access-request.model';

export interface PaginatedRecruiterAccessRequests {
  data: RecruiterAccessRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface RecruiterAccessRequestCounts {
  pending: number; approved: number; rejected: number; total: number;
}

@Injectable({ providedIn: 'root' })
export class RecruiterAccessRequestService {
  private readonly api = `${environment.apiUrl}/recruiter-access-requests`;

  constructor(private http: HttpClient) {}

  submit(data: { email: string; message?: string | null }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.api, data);
  }

  list(filters: { status?: string; search?: string; date_from?: string; date_to?: string; sort?: string; page?: number; limit?: number } = {}): Observable<PaginatedRecruiterAccessRequests> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedRecruiterAccessRequests>(this.api, { params });
  }

  getCounts(): Observable<RecruiterAccessRequestCounts> {
    return this.http.get<RecruiterAccessRequestCounts>(`${this.api}/counts`);
  }

  review(id: string, data: { status: 'approved' | 'rejected'; new_expires_at?: string | null; admin_note?: string | null }): Observable<{ id: string }> {
    return this.http.put<{ id: string }>(`${this.api}/${id}/review`, data);
  }
}
