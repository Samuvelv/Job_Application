// src/app/core/services/volunteer-support-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  VolunteerSupportRequest,
  VolunteerSupportRequestCounts,
} from '../models/volunteer-support-request.model';

export interface PaginatedSupportRequests {
  data: VolunteerSupportRequest[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface SupportRequestFilters {
  status?: 'pending' | 'connected' | 'closed';
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class VolunteerSupportRequestService {
  private base = `${environment.apiUrl}/volunteer-support-requests`;

  constructor(private http: HttpClient) {}

  /** Candidate: submit a support request for a volunteer */
  create(volunteerId: string, message?: string): Observable<{ supportRequest: VolunteerSupportRequest }> {
    return this.http.post<{ supportRequest: VolunteerSupportRequest }>(
      `${this.base}/${volunteerId}`,
      { message: message ?? null },
    );
  }

  /** Candidate: get all own support requests (to detect duplicates per volunteer) */
  getMine(): Observable<{ supportRequests: VolunteerSupportRequest[] }> {
    return this.http.get<{ supportRequests: VolunteerSupportRequest[] }>(`${this.base}/me`);
  }

  /** Admin: list all support requests */
  list(filters: SupportRequestFilters = {}): Observable<PaginatedSupportRequests> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedSupportRequests>(this.base, { params });
  }

  /** Admin: export CSV with active filters */
  exportCsv(filters: { status?: string; search?: string; date_from?: string; date_to?: string } = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob' });
  }

  /** Admin: mark connected or closed */
  review(id: string, status: 'connected' | 'closed', adminNote?: string): Observable<{ supportRequest: VolunteerSupportRequest }> {
    return this.http.put<{ supportRequest: VolunteerSupportRequest }>(
      `${this.base}/${id}/review`,
      { status, admin_note: adminNote ?? null },
    );
  }

  /** Admin: get counts grouped by status */
  getCounts(): Observable<VolunteerSupportRequestCounts> {
    return this.http.get<VolunteerSupportRequestCounts>(`${this.base}/counts`);
  }
}
