// src/app/core/services/admin-master.service.ts
// Generic HTTP service for admin master data CRUD.
// One service drives all 10 tables — driven by table key string.
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MasterDataService } from './master-data.service';

export interface MasterRecord {
  id:          number;
  name?:       string;
  title?:      string;
  label?:      string;
  iso2?:       string;
  dial_code?:  string;
  flag_emoji?: string;
  country_id?: number;
  country_name?: string;
  occupation_id?: number;
  occupation_name?: string;
  code?:       string;
  symbol?:     string;
  days?:       number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  [key: string]: any;
}

export interface MasterListResponse {
  data:       MasterRecord[];
  pagination: {
    page:  number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MasterListParams {
  page?:           number;
  limit?:          number;
  search?:         string;
  sortBy?:         string;
  sortDir?:        'asc' | 'desc';
  includeDeleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminMasterService {
  private readonly base = `${environment.apiUrl}/admin/master`;

  constructor(
    private http: HttpClient,
    private masterData: MasterDataService,
  ) {}

  list(table: string, params: MasterListParams = {}): Observable<MasterListResponse> {
    let p = new HttpParams();
    if (params.page)           p = p.set('page',           String(params.page));
    if (params.limit)          p = p.set('limit',          String(params.limit));
    if (params.search)         p = p.set('search',         params.search);
    if (params.sortBy)         p = p.set('sortBy',         params.sortBy);
    if (params.sortDir)        p = p.set('sortDir',        params.sortDir);
    if (params.includeDeleted) p = p.set('includeDeleted', 'true');
    return this.http.get<MasterListResponse>(`${this.base}/${table}`, { params: p });
  }

  getOne(table: string, id: number): Observable<MasterRecord> {
    return this.http.get<MasterRecord>(`${this.base}/${table}/${id}`);
  }

  create(table: string, payload: Record<string, any>): Observable<{ message: string; data: MasterRecord }> {
    return this.http.post<{ message: string; data: MasterRecord }>(
      `${this.base}/${table}`, payload,
    ).pipe(tap(() => this.masterData.invalidate()));
  }

  update(table: string, id: number, payload: Record<string, any>): Observable<{ message: string; data: MasterRecord }> {
    return this.http.put<{ message: string; data: MasterRecord }>(
      `${this.base}/${table}/${id}`, payload,
    ).pipe(tap(() => this.masterData.invalidate()));
  }

  delete(table: string, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/${table}/${id}`,
    ).pipe(tap(() => this.masterData.invalidate()));
  }

  restore(table: string, id: number): Observable<{ message: string; data: MasterRecord }> {
    return this.http.patch<{ message: string; data: MasterRecord }>(
      `${this.base}/${table}/${id}/restore`, {},
    ).pipe(tap(() => this.masterData.invalidate()));
  }

  getCounts(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.base}/counts`);
  }
}
