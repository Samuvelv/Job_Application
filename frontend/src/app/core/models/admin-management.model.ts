// src/app/core/models/admin-management.model.ts
export interface AdminAccount {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateAdminPayload {
  email: string;
  first_name: string;
  last_name?: string;
  password: string;
}

export interface AdminFilters {
  search?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export interface PaginatedAdmins {
  data: AdminAccount[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
