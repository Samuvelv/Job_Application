// src/app/core/services/volunteer-support-request.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    if (filters.search) params['search'] = filters.search;
    if (filters.page)   params['page']   = String(filters.page);
    if (filters.limit)  params['limit']  = String(filters.limit);
    return this.http.get<PaginatedSupportRequests>(this.base, { params });
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
