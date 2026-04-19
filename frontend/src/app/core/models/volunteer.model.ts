// src/app/core/models/volunteer.model.ts
export interface Volunteer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}
