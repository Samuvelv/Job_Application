// src/app/core/services/employee.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, EmployeeFilters } from '../models/employee.model';

export interface PaginatedEmployees {
  data: Employee[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly api = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  // ── List / Filter ─────────────────────────────────────────────────────────
  list(filters: EmployeeFilters = {}): Observable<PaginatedEmployees> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    });
    return this.http.get<PaginatedEmployees>(this.api, { params });
  }

  // ── Get one ───────────────────────────────────────────────────────────────
  getById(id: string): Observable<{ employee: Employee }> {
    return this.http.get<{ employee: Employee }>(`${this.api}/${id}`);
  }

  getMyProfile(): Observable<{ employee: Employee }> {
    return this.http.get<{ employee: Employee }>(`${this.api}/me`);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  create(data: Partial<Employee> & { email: string; password: string }): Observable<{ employee: Employee }> {
    return this.http.post<{ employee: Employee }>(this.api, data);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  update(id: string, data: Partial<Employee>): Observable<{ employee: Employee }> {
    return this.http.put<{ employee: Employee }>(`${this.api}/${id}`, data);
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
    employeeId: string,
    type: 'profiles' | 'resumes' | 'videos' | 'certificates',
    file: File,
    name?: string,
  ): Observable<{ url: string; filename: string }> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return this.http.post<{ url: string; filename: string }>(
      `${environment.apiUrl}/employees/${employeeId}/files/${type}`,
      form,
    );
  }
}
