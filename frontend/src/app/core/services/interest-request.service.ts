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
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  // joined fields (admin list view)
  recruiter_name?: string;
  recruiter_company?: string;
  recruiter_email?: string;
  candidate_first_name?: string;
  candidate_last_name?: string;
  candidate_number?: string;
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
  list(filters: { status?: string; search?: string; page?: number; limit?: number } = {}): Observable<PaginatedInterestRequests> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedInterestRequests>(this.api, { params });
  }

  // Admin: approve or reject
  review(id: string, data: { status: 'approved' | 'rejected'; admin_note?: string }): Observable<{ request: InterestRequest }> {
    return this.http.patch<{ request: InterestRequest }>(`${this.api}/${id}/review`, data);
  }

  // Admin: pending count for sidebar badge
  getPendingCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.api}/pending-count`);
  }
}
