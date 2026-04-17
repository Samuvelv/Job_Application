// src/app/core/models/recruiter.model.ts

export interface Recruiter {
  id: string;
  user_id: string;
  email: string;
  contact_name: string;
  company_name?: string;
  access_expires_at: string;
  is_active: boolean;
  has_active_token?: boolean;
  token_expires_at?: string | null;
  created_at?: string;
}

export interface ShortlistEntry {
  shortlist_id: string;
  notes?: string;
  shortlisted_at: string;
  candidate_id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  occupation?: string;
  industry?: string;
  current_city?: string;
  current_country?: string;
  years_experience?: number;
  profile_photo_url?: string;
  email?: string;
}

export interface RecruiterFilters {
  search?: string;
  page?: number;
  limit?: number;
}
