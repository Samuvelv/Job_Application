// src/app/core/models/recruiter-access-request.model.ts
export interface RecruiterAccessRequest {
  id: string;
  user_id: string;
  email: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}
