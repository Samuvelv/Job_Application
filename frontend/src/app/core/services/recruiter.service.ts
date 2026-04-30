// src/app/core/services/recruiter.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Recruiter, RecruiterFilters, ShortlistEntry } from '../models/recruiter.model';

export interface PaginatedRecruiters {
  data: Recruiter[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class RecruiterService {
  private readonly api = `${environment.apiUrl}/recruiters`;

  constructor(private http: HttpClient) {}

  // ── Admin: CRUD ─────────────────────────────────────────────────────────────
  list(filters: RecruiterFilters = {}): Observable<PaginatedRecruiters> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedRecruiters>(this.api, { params });
  }

  getById(id: string): Observable<{ recruiter: Recruiter }> {
    return this.http.get<{ recruiter: Recruiter }>(`${this.api}/${id}`);
  }

  create(data: {
    email: string;
    contact_name: string;
    company_name?: string;
    password: string;
    access_expires_at: string;
  }): Observable<{ recruiter: Recruiter }> {
    return this.http.post<{ recruiter: Recruiter }>(this.api, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  update(id: string, data: {
    contact_name?: string;
    company_name?: string | null;
    new_password?: string;
    access_expires_at?: string;
    is_active?: boolean;
  }): Observable<{ recruiter: Recruiter }> {
    return this.http.put<{ recruiter: Recruiter }>(`${this.api}/${id}`, data);
  }

  // ── Admin: resend credentials ────────────────────────────────────────────────
  resendCredentials(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/resend-credentials`, {});
  }

  // ── Recruiter self ───────────────────────────────────────────────────────────
  getMyProfile(): Observable<{ recruiter: Recruiter }> {
    return this.http.get<{ recruiter: Recruiter }>(`${this.api}/me`);
  }

  // ── Shortlist ────────────────────────────────────────────────────────────────
  getShortlist(): Observable<{ shortlist: ShortlistEntry[] }> {
    return this.http.get<{ shortlist: ShortlistEntry[] }>(`${this.api}/me/shortlist`);
  }

  getShortlistById(id: string): Observable<{ shortlist: ShortlistEntry[] }> {
    return this.http.get<{ shortlist: ShortlistEntry[] }>(`${this.api}/${id}/shortlist`);
  }

  addToShortlist(candidateId: string, notes?: string): Observable<{ entry: ShortlistEntry }> {
    return this.http.post<{ entry: ShortlistEntry }>(`${this.api}/me/shortlist/${candidateId}`, { notes });
  }

  removeFromShortlist(candidateId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/me/shortlist/${candidateId}`);
  }
}
