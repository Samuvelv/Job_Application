// src/app/core/services/volunteer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Volunteer } from '../models/volunteer.model';

export interface PaginatedVolunteers {
  data: Volunteer[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface VolunteerFilters {
  search?: string;
  country_placed?: string;
  availability?: string;
  language?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private readonly api = `${environment.apiUrl}/volunteers`;

  constructor(private http: HttpClient) {}

  list(filters: VolunteerFilters = {}): Observable<PaginatedVolunteers> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedVolunteers>(this.api, { params });
  }

  exportCsv(filters: Omit<VolunteerFilters, 'page' | 'limit'> = {}): Observable<Blob> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get(`${this.api}/export`, { params, responseType: 'blob' });
  }

  getById(id: string): Observable<{ volunteer: Volunteer }> {
    return this.http.get<{ volunteer: Volunteer }>(`${this.api}/${id}`);
  }

  create(data: Partial<Volunteer>): Observable<{ volunteer: Volunteer }> {
    return this.http.post<{ volunteer: Volunteer }>(this.api, data);
  }

  update(id: string, data: Partial<Volunteer>): Observable<{ volunteer: Volunteer }> {
    return this.http.put<{ volunteer: Volunteer }>(`${this.api}/${id}`, data);
  }

  uploadPhoto(id: string, file: File): Observable<{ volunteer: Volunteer; url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ volunteer: Volunteer; url: string }>(`${this.api}/${id}/photo`, form);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
