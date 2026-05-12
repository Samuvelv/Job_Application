// src/app/core/services/audit-log.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog, AuditLogFilters } from '../models/audit-log.model';

export interface PaginatedAuditLogs {
  data: AuditLog[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly api = `${environment.apiUrl}/audit-logs`;

  constructor(private http: HttpClient) {}

  list(filters: AuditLogFilters = {}): Observable<PaginatedAuditLogs> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedAuditLogs>(this.api, { params });
  }

  /** Export all logs matching the given filters as a CSV blob. */
  exportCsv(filters: Omit<AuditLogFilters, 'page' | 'limit'> = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.api}/export`, { params, responseType: 'blob' });
  }

  getDistinctActions(): Observable<{ actions: string[] }> {
    return this.http.get<{ actions: string[] }>(`${this.api}/actions`);
  }
}
