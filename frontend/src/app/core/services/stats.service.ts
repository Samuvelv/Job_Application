// src/app/core/services/stats.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  employees:      number;
  recruiters:     number;
  pendingEdits:   number;
  auditLogsToday: number;
}

export interface EmployeeStats {
  profileCompleteness: number;
  pendingRequest:      boolean;
}

export interface RecruiterStats {
  shortlistCount:      number;
  candidatesAvailable: number;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private base = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  getAdminStats():    Observable<AdminStats>    { return this.http.get<AdminStats>(`${this.base}/admin`); }
  getEmployeeStats(): Observable<EmployeeStats> { return this.http.get<EmployeeStats>(`${this.base}/employee`); }
  getRecruiterStats():Observable<RecruiterStats>{ return this.http.get<RecruiterStats>(`${this.base}/recruiter`); }
}
