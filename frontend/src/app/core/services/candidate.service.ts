// src/app/core/services/candidate.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Candidate, CandidateFilters } from '../models/candidate.model';

export interface PaginatedCandidates {
  data: Candidate[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private readonly api = `${environment.apiUrl}/candidates`;

  constructor(private http: HttpClient) {}

  // ── List / Filter ─────────────────────────────────────────────────────────
  list(filters: CandidateFilters = {}): Observable<PaginatedCandidates> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    });
    return this.http.get<PaginatedCandidates>(this.api, { params });
  }

  // ── Export CSV ───────────────────────────────────────────────────────────
  exportCsv(filters: CandidateFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    });
    return this.http.get(`${this.api}/export`, { params, responseType: 'blob' });
  }

  // ── Get one ───────────────────────────────────────────────────────────────
  getById(id: string): Observable<{ candidate: Candidate }> {
    return this.http.get<{ candidate: Candidate }>(`${this.api}/${id}`);
  }

  getMyProfile(): Observable<{ candidate: Candidate }> {
    return this.http.get<{ candidate: Candidate }>(`${this.api}/me`);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  create(data: Partial<Candidate> & { email: string; password: string }): Observable<{ candidate: Candidate }> {
    return this.http.post<{ candidate: Candidate }>(this.api, data);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(id: string, data: Partial<Candidate>): Observable<{ candidate: Candidate }> {
    return this.http.put<{ candidate: Candidate }>(`${this.api}/${id}`, data);
  }

  // ── Bulk action ───────────────────────────────────────────────────────────
  bulkAction(
    candidateIds: string[],
    action: 'mark_fee_paid' | 'change_status',
    payload?: { profile_status?: string },
  ): Observable<{ message: string; updated: number }> {
    return this.http.post<{ message: string; updated: number }>(
      `${this.api}/bulk-action`,
      { candidateIds, action, payload },
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }

  // ── Resend credentials ────────────────────────────────────────────────────
  resendCredentials(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/resend-credentials`, {});
  }

  // ── File upload ───────────────────────────────────────────────────────────
  uploadFile(
    candidateId: string,
    type: 'profiles' | 'resumes' | 'videos' | 'certificates',
    file: File,
    name?: string,
  ): Observable<{ url: string; filename: string }> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return this.http.post<{ url: string; filename: string }>(
      `${environment.apiUrl}/candidates/${candidateId}/files/${type}`,
      form,
    );
  }

  // ── File delete ───────────────────────────────────────────────────────────
  deleteFile(
    candidateId: string,
    type: 'profiles' | 'resumes' | 'videos',
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/candidates/${candidateId}/files/${type}`,
    );
  }

  deleteCertificate(
    candidateId: string,
    certId: number,
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/candidates/${candidateId}/certificates/${certId}`,
    );
  }

  // ── Self-service file helpers (candidate uploading to own profile) ──────────

  /** Stage a file for an edit-request: stores on disk, returns relativePath only.
   *  Does NOT update the candidate row — include relativePath in the edit-request payload. */
  stageMyFile(
    type: 'profiles' | 'resumes' | 'videos',
    file: File,
  ): Observable<{ relativePath: string; url: string; message: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ relativePath: string; url: string; message: string }>(
      `${environment.apiUrl}/candidates/me/stage-file/${type}`,
      form,
    );
  }

  uploadMyFile(
    candidateId: string,
    type: 'profiles' | 'resumes' | 'videos' | 'certificates',
    file: File,
    name?: string,
  ): Observable<{ url: string; filename: string; message: string }> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return this.http.post<{ url: string; filename: string; message: string }>(
      `${environment.apiUrl}/candidates/${candidateId}/files/${type}`,
      form,
    );
  }

  deleteMyFile(
    candidateId: string,
    type: 'profiles' | 'resumes' | 'videos',
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/candidates/${candidateId}/files/${type}`,
    );
  }

  deleteMyCertificate(
    candidateId: string,
    certId: number,
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrl}/candidates/${candidateId}/certificates/${certId}`,
    );
  }
}
