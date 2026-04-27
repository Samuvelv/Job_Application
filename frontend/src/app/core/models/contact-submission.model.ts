export interface ContactSubmission {
  id:           string;
  name:         string;
  email:        string;
  phone:        string | null;
  subject:      string | null;
  message:      string;
  is_read:      boolean;
  submitted_at: string;
}
