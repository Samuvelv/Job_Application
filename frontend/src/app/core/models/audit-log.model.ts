// src/app/core/models/audit-log.model.ts
export interface AuditLog {
  id:          string;
  user_id:     string | null;
  user_name:   string | null;
  action:      string;
  resource:    string | null;
  resource_id: string | null;
  metadata:    Record<string, unknown> | null;
  ip_address:  string | null;
  created_at:  string;
}

export interface AuditLogFilters {
  page?:       number;
  limit?:      number;
  userId?:     string;
  action?:     string;
  resource?:   string;
  resourceId?: string;
  from?:       string;
  to?:         string;
}
