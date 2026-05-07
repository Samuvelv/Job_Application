// src/app/core/services/edit-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EditRequest, EditRequestFilters } from '../models/edit-request.model';

export interface PaginatedEditRequests {
  data: EditRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface EditRequestCounts {
  pending: number; approved: number; rejected: number; total: number;
}

@Injectable({ providedIn: 'root' })
export class EditRequestService {
  private readonly api = `${environment.apiUrl}/edit-requests`;

  constructor(private http: HttpClient) {}

  // ── Candidate ─────────────────────────────────────────────────────────────────
  submit(data: Record<string, unknown>): Observable<{ request: EditRequest }> {
    return this.http.post<{ request: EditRequest }>(`${this.api}/me`, data);
  }

  getMyRequest(): Observable<{ request: EditRequest | null }> {
    return this.http.get<{ request: EditRequest | null }>(`${this.api}/me`);
  }

  // ── Admin ────────────────────────────────────────────────────────────────────
  list(filters: EditRequestFilters = {}): Observable<PaginatedEditRequests> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedEditRequests>(this.api, { params });
  }

  getById(id: string): Observable<{ request: EditRequest }> {
    return this.http.get<{ request: EditRequest }>(`${this.api}/${id}`);
  }

  review(
    id: string,
    decision: { status: 'approved' | 'rejected'; admin_note?: string },
  ): Observable<{ request: EditRequest }> {
    return this.http.patch<{ request: EditRequest }>(`${this.api}/${id}`, decision);
  }

  getCounts(): Observable<EditRequestCounts> {
    return this.http.get<EditRequestCounts>(`${this.api}/counts`);
  }

  bulkReview(
    ids: string[],
    status: 'approved' | 'rejected',
    adminNote?: string,
  ): Observable<{ succeeded: string[]; failed: { id: string; reason: string }[] }> {
    return this.http.post<{ succeeded: string[]; failed: { id: string; reason: string }[] }>(
      `${this.api}/bulk-review`,
      { ids, status, admin_note: adminNote },
    );
  }

  exportCsv(filters: Omit<EditRequestFilters, 'page' | 'limit'> = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.api}/export`, { params, responseType: 'blob' });
  }
}
