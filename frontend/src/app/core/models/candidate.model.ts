// src/app/core/models/candidate.model.ts

export interface Skill {
  id?: number;
  skill_name: string;
  proficiency?: string;
}

export interface Language {
  id?: number;
  language: string;
  proficiency?: string;
}

export interface Experience {
  id?: number;
  company_name?: string;
  job_title?: string;
  start_date?: string;
  end_date?: string | null;
  description?: string;
  location?: string;
}

export interface Education {
  id?: number;
  institution?: string;
  degree?: string;
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  location?: string;
}

export interface Certificate {
  id?: number;
  name?: string;
  issuer?: string;
  issue_date?: string;
  file_url?: string;
}

export interface Candidate {
  id: string;
  user_id: string;
  email?: string;

  // Personal
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  profile_photo_url?: string;
  bio?: string;

  // Professional
  job_title?: string;
  occupation?: string;
  industry?: string;
  years_experience?: number;
  linkedin_url?: string;

  // Location
  current_country?: string;
  current_city?: string;
  nationality?: string;
  postal_code?: string;
  target_locations?: string[];
  hobbies?: string[];

  // Salary
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_type?: string;

  // Files
  resume_url?: string;
  intro_video_url?: string;

  // Status
  profile_status?: string;

  // Relations
  skills?: Skill[];
  languages?: Language[];
  experience?: Experience[];
  education?: Education[];
  certificates?: Certificate[];

  created_at?: string;
  updated_at?: string;
}

export interface CandidateFilters {
  search?: string;
  industry?: string;
  occupation?: string;
  currentCountry?: string;
  skills?: string[];
  languages?: string[];
  salaryMin?: number;
  salaryMax?: number;
  yearsExperience?: number;
  page?: number;
  limit?: number;
}
