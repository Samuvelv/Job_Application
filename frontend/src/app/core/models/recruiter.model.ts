// src/app/core/models/recruiter.model.ts

export type RecruiterType = 'direct_employer' | 'recruitment_agency';

export interface Recruiter {
  id: string;
  user_id: string;
  recruiter_number?: string;
  email: string;
  contact_name: string;
  contact_job_title?: string;
  type?: RecruiterType;
  phone?: string;
  whatsapp_number?: string;
  company_name?: string;
  company_logo_url?: string;
  company_country?: string;
  company_city?: string;
  company_website?: string;
  industry?: string;
  company_size?: string;
  has_sponsor_licence?: 'yes' | 'no' | 'applied' | 'unknown';
  sponsor_licence_number?: string;
  sponsor_licence_countries?: string[];
  licence_rating?: string;
  licence_verified?: boolean;
  target_nationalities?: string[];
  sectors_recruit_for?: string[];
  countries_place_in?: string[];
  hires_per_year?: string;
  job_types?: string[];
  account_status?: 'active' | 'pending' | 'suspended';
  access_start_date?: string;
  free_account?: boolean;
  admin_notes?: string;
  access_expires_at: string;
  is_active: boolean;
  plain_password?: string;
  has_active_token?: boolean;
  token_expires_at?: string | null;
  shortlists_count?: number;
  contact_requests_count?: number;
  profiles_viewed_count?: number;
  last_login_at?: string;
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
  search?:            string;
  company?:           string;
  isActive?:          'true' | 'false';   // legacy
  companyCountry?:    string;
  industry?:          string;             // comma-sep
  hasSponsorLicence?: 'yes' | 'no' | 'applied' | 'unknown';
  sponsorCountry?:    string;             // comma-sep
  accountStatus?:     'active' | 'pending' | 'suspended' | 'inactive' | 'expired';
  joinedFrom?:        string;             // YYYY-MM-DD
  joinedTo?:          string;             // YYYY-MM-DD
  lastActive?:        '7_days' | '30_days' | '90_days';
  sortBy?:            string;
  page?:              number;
  limit?:             number;
}
