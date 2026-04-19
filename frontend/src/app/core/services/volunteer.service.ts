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

@Injectable({ providedIn: 'root' })
export class VolunteerService {
  private readonly api = `${environment.apiUrl}/volunteers`;

  constructor(private http: HttpClient) {}

  list(filters: { search?: string; page?: number; limit?: number } = {}): Observable<PaginatedVolunteers> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<PaginatedVolunteers>(this.api, { params });
  }

  create(data: Partial<Volunteer>): Observable<{ volunteer: Volunteer }> {
    return this.http.post<{ volunteer: Volunteer }>(this.api, data);
  }

  update(id: string, data: Partial<Volunteer>): Observable<{ volunteer: Volunteer }> {
    return this.http.put<{ volunteer: Volunteer }>(`${this.api}/${id}`, data);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
