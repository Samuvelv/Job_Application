// src/app/core/services/stats.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  candidates:                number;
  recruiters:                number;
  pendingEdits:              number;
  auditLogsToday:            number;
  registrationsToday:        number;
  profilesForwardedToday:    number;
  totalVolunteers:           number;
  activeVolunteers:          number;
  candidatesHelpedThisMonth: number;
}

export interface CandidateStats {
  profileCompleteness: number;
  pendingRequest:      boolean;
}

export interface RecruiterStats {
  shortlistCount:      number;
  candidatesAvailable: number;
}

export interface PublicStats {
  totalCandidates: number;
  totalCompanies:  number;
  totalMatches:    number;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private base = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  getAdminStats():     Observable<AdminStats>     { return this.http.get<AdminStats>(`${this.base}/admin`); }
  getCandidateStats(): Observable<CandidateStats> { return this.http.get<CandidateStats>(`${this.base}/candidate`); }
  getRecruiterStats(): Observable<RecruiterStats> { return this.http.get<RecruiterStats>(`${this.base}/recruiter`); }
  getPublicStats():    Observable<PublicStats>    { return this.http.get<PublicStats>(`${this.base}/public`); }
}
