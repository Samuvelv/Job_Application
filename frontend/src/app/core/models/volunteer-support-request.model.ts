// src/app/core/models/volunteer-support-request.model.ts
export interface VolunteerSupportRequest {
  id: string;
  candidate_id: string;
  volunteer_id: string;
  message?: string | null;
  status: 'pending' | 'connected' | 'closed';
  admin_note?: string | null;
  created_at: string;
  updated_at?: string;
  // Joined fields (admin list)
  candidate_first_name?: string;
  candidate_last_name?: string;
  candidate_email?: string;
  volunteer_name?: string;
  volunteer_role?: string;
}

export interface VolunteerSupportRequestCounts {
  pending: number;
  connected: number;
  closed: number;
  total: number;
}
