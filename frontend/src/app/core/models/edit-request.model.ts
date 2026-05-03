// src/app/core/models/edit-request.model.ts

export interface EditRequest {
  id: string;
  candidate_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_photo_url?: string;
  reason?: string;
  requested_data: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface EditRequestFilters {
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
}
