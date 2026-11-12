// src/app/core/services/admin-management.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminAccount, AdminFilters, CreateAdminPayload, PaginatedAdmins } from '../models/admin-management.model';

@Injectable({ providedIn: 'root' })
export class AdminManagementService {
  private readonly api = `${environment.apiUrl}/admin-management`;

  constructor(private http: HttpClient) {}

  list(filters: AdminFilters = {}): Observable<PaginatedAdmins> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedAdmins>(this.api, { params });
  }

  getById(id: string): Observable<{ admin: AdminAccount }> {
    return this.http.get<{ admin: AdminAccount }>(`${this.api}/${id}`);
  }

  create(data: CreateAdminPayload): Observable<{ admin: AdminAccount }> {
    return this.http.post<{ admin: AdminAccount }>(this.api, data);
  }

  deactivate(id: string): Observable<{ admin: AdminAccount }> {
    return this.http.post<{ admin: AdminAccount }>(`${this.api}/${id}/deactivate`, {});
  }

  reactivate(id: string): Observable<{ admin: AdminAccount }> {
    return this.http.post<{ admin: AdminAccount }>(`${this.api}/${id}/reactivate`, {});
  }

  resetPassword(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/${id}/reset-password`, {});
  }
}
