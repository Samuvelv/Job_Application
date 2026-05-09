// src/app/core/models/agency-referral.model.ts

export type ReferralStatus = 'pending' | 'progressing' | 'placed' | 'not_suitable';

export interface AgencyReferral {
  id: string;
  candidate_id: string;
  agency_name: string;
  employer_name: string;
  country: string;
  referral_date: string;
  status: ReferralStatus;
  notes?: string | null;
  created_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
