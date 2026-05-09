// src/app/core/models/contact-request.model.ts
export interface ContactRequest {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
  // Revocation audit fields
  revoked_at?: string | null;
  revoked_by_name?: string | null;
  revocation_reason?: string | null;
  // Admin list joined fields
  recruiter_name?: string;
  recruiter_company?: string;
  recruiter_email?: string;
  candidate_first_name?: string;
  candidate_last_name?: string;
  candidate_number?: string;
  candidate_job_title?: string;
  candidate_email?: string;
}
