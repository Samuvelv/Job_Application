// src/app/core/services/interest-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InterestRequest {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  sector: string;
  country: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  // joined fields (admin list view)
  recruiter_name?: string;
  recruiter_company?: string;
  recruiter_email?: string;
  candidate_first_name?: string;
  candidate_last_name?: string;
  candidate_number?: string;
}

export interface InterestRequestCounts {
  pending: number;
  approved: number;
  rejected: number;
  revoked: number;
  total: number;
}

export interface PaginatedInterestRequests {
  data: InterestRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class InterestRequestService {
  private readonly api = `${environment.apiUrl}/interest-requests`;

  constructor(private http: HttpClient) {}

  // Recruiter (agency): submit a new interest request
  create(body: { candidate_id: string; sector: string; country: string; message: string }): Observable<{ request: InterestRequest }> {
    return this.http.post<{ request: InterestRequest }>(this.api, body);
  }

  // Recruiter: get own requests
  getMyRequests(): Observable<{ requests: InterestRequest[] }> {
    return this.http.get<{ requests: InterestRequest[] }>(`${this.api}/me`);
  }

  // Admin: list all with optional filters
  list(filters: { status?: string; search?: string; date_from?: string; date_to?: string; page?: number; limit?: number } = {}): Observable<PaginatedInterestRequests> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedInterestRequests>(this.api, { params });
  }

  // Admin: export CSV with active filters
  exportCsv(filters: { status?: string; search?: string; date_from?: string; date_to?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.api}/export`, { params, responseType: 'blob' });
  }

  // Admin: approve or reject
  review(id: string, data: { status: 'approved' | 'rejected'; admin_note?: string }): Observable<{ request: InterestRequest }> {
    return this.http.patch<{ request: InterestRequest }>(`${this.api}/${id}/review`, data);
  }

  // Admin: revoke an approved request
  revoke(id: string, reason?: string): Observable<{ request: InterestRequest }> {
    return this.http.post<{ request: InterestRequest }>(`${this.api}/${id}/revoke`, { reason });
  }

  // Admin: status counts for tabs
  getCounts(): Observable<InterestRequestCounts> {
    return this.http.get<InterestRequestCounts>(`${this.api}/counts`);
  }

  // Admin: pending count for sidebar badge
  getPendingCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.api}/pending-count`);
  }
}
