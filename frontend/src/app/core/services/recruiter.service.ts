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
    contact_job_title?: string;
    company_name?: string;
    company_country?: string;
    company_city?: string;
    company_website?: string;
    industry?: string;
    phone?: string;
    has_sponsor_licence?: 'yes' | 'no' | 'unknown';
    sponsor_licence_number?: string;
    sponsor_licence_countries?: string[];
    target_nationalities?: string[];
    hires_per_year?: string;
    is_active?: boolean;
    admin_notes?: string;
    password: string;
    access_expires_at: string;
  }): Observable<{ recruiter: Recruiter }> {
    return this.http.post<{ recruiter: Recruiter }>(this.api, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  update(id: string, data: {
    email?: string;
    contact_name?: string;
    contact_job_title?: string | null;
    company_name?: string | null;
    company_country?: string | null;
    company_city?: string | null;
    company_website?: string | null;
    industry?: string | null;
    phone?: string | null;
    has_sponsor_licence?: 'yes' | 'no' | 'unknown' | null;
    sponsor_licence_number?: string | null;
    sponsor_licence_countries?: string[] | null;
    target_nationalities?: string[] | null;
    hires_per_year?: string | null;
    admin_notes?: string | null;
    new_password?: string;
    access_expires_at?: string;
    is_active?: boolean;
  }): Observable<{ recruiter: Recruiter }> {
    return this.http.put<{ recruiter: Recruiter }>(`${this.api}/${id}`, data);
  }

  bulkStatus(ids: string[], is_active: boolean): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.api}/bulk-status`, { ids, is_active });
  }

  exportSelected(ids: string[]): Observable<Blob> {
    return this.http.post(`${this.api}/export-selected`, { ids }, { responseType: 'blob' });
  }

  exportCsv(filters: RecruiterFilters = {}): Observable<Blob> {
    debugger
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.api}/export`, { params, responseType: 'blob' });
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
