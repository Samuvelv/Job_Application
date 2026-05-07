// src/app/core/models/volunteer.model.ts
export interface Volunteer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  notes?: string | null;
  // Extended fields
  photo_url?: string | null;
  nationality?: string | null;
  country_placed?: string | null;
  company_joined?: string | null;
  year_placed?: number | null;
  languages?: string[] | null;
  success_story?: string | null;
  support_method?: 'WhatsApp Support' | 'Phone Call Support' | 'Platform Messaging Only' | null;
  contact_preference?: 'WhatsApp' | 'Email' | 'Platform Only' | null;
  availability?: 'Active' | 'Temporarily Unavailable' | null;
  consent?: boolean | null;
  candidates_helped?: number;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}
