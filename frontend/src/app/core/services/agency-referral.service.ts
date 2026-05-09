// src/app/core/services/agency-referral.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgencyReferral } from '../models/agency-referral.model';

export interface ReferralPayload {
  agency_name: string;
  employer_name: string;
  country: string;
  referral_date: string;
  status: string;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AgencyReferralService {
  private base = `${environment.apiUrl}/candidates`;

  constructor(private http: HttpClient) {}

  list(candidateId: string): Observable<{ referrals: AgencyReferral[] }> {
    return this.http.get<{ referrals: AgencyReferral[] }>(`${this.base}/${candidateId}/referrals`);
  }

  create(candidateId: string, data: ReferralPayload): Observable<{ referral: AgencyReferral }> {
    return this.http.post<{ referral: AgencyReferral }>(`${this.base}/${candidateId}/referrals`, data);
  }

  update(candidateId: string, referralId: string, data: Partial<ReferralPayload>): Observable<{ referral: AgencyReferral }> {
    return this.http.put<{ referral: AgencyReferral }>(`${this.base}/${candidateId}/referrals/${referralId}`, data);
  }

  delete(candidateId: string, referralId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${candidateId}/referrals/${referralId}`);
  }
}
