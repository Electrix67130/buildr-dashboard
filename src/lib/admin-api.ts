import { apiFetch } from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface AdminOverview {
  orgs: { total: number; active: number };
  users: { total: number; active: number };
  chantiers: { active: number; archived: number };
  billing: { billable_seats: number; estimated_monthly_eur: number };
  recent_orgs: { id: string; name: string; created_at: string }[];
  recent_users: { id: string; email: string; first_name: string; last_name: string; created_at: string }[];
}

export interface AdminOrg {
  id: string;
  name: string;
  is_active: boolean;
  archive_retention_years: number;
  created_at: string;
  member_count: number;
  chantier_count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
}

export type ChantierStatus = "a_venir" | "en_cours" | "termine";

export interface AdminChantier {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  status: ChantierStatus;
  archived_at: string | null;
  created_at: string;
  organization_id: string;
  organization_name: string;
  organization_active: boolean;
  created_by_id: string;
  created_by_email: string;
  created_by_first_name: string;
  created_by_last_name: string;
  member_count: number;
}

export interface AdminChantierDetail extends AdminChantier {
  description: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string | null;
  end_date: string | null;
  auto_delete_at: string | null;
  updated_at: string;
  members: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    role: string;
    joined_at: string;
  }[];
  counts: {
    photos: number;
    documents: number;
    steps: number;
    members: number;
  };
}

export interface ChantierFilters {
  q?: string;
  organization_id?: string;
  user_id?: string;
  status?: ChantierStatus;
  archived?: "true" | "false" | "all";
  sort?: "created_at" | "name" | "status";
  order?: "asc" | "desc";
  page?: number;
}

export interface AuditEntry {
  id: string;
  super_admin_id: string;
  super_admin_email: string;
  super_admin_first_name: string;
  super_admin_last_name: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface ErrorEntry {
  id: string;
  level: "error" | "warn";
  message: string;
  stack: string | null;
  route: string | null;
  method: string | null;
  user_id: string | null;
  user_email: string | null;
  status_code: number | null;
  request_id: string | null;
  /** Origine du signalement : erreur serveur ou plantage client. */
  source: "api" | "mobile" | "dashboard";
  platform: "ios" | "android" | "web" | null;
  app_version: string | null;
  screen: string | null;
  created_at: string;
}

export const adminApi = {
  overview: () => apiFetch<AdminOverview>("/super-admin/overview"),
  orgs: (q?: string, page = 1) =>
    apiFetch<PaginatedResponse<AdminOrg>>(
      `/super-admin/orgs?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  org: (id: string) => apiFetch<AdminOrg & { members: unknown[]; chantiers: unknown[] }>(`/super-admin/orgs/${id}`),
  enableOrg: (id: string) => apiFetch(`/super-admin/orgs/${id}/enable`, { method: "POST" }),
  disableOrg: (id: string) => apiFetch(`/super-admin/orgs/${id}/disable`, { method: "POST" }),
  impersonate: (id: string) =>
    apiFetch<{ access_token: string; user_id: string }>(`/super-admin/orgs/${id}/impersonate`, {
      method: "POST",
    }),

  users: (q?: string, page = 1) =>
    apiFetch<PaginatedResponse<AdminUser>>(
      `/super-admin/users?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`,
    ),
  user: (id: string) =>
    apiFetch<AdminUser & { memberships: unknown[]; active_sessions: number }>(`/super-admin/users/${id}`),
  enableUser: (id: string) => apiFetch(`/super-admin/users/${id}/enable`, { method: "POST" }),
  disableUser: (id: string) => apiFetch(`/super-admin/users/${id}/disable`, { method: "POST" }),
  kickSessions: (id: string) =>
    apiFetch<{ sessions_killed: number }>(`/super-admin/users/${id}/kick-sessions`, { method: "POST" }),
  forceReset: (id: string) =>
    apiFetch<{ temporary_password: string }>(`/super-admin/users/${id}/force-reset`, { method: "POST" }),
  deleteUser: (id: string) => apiFetch(`/super-admin/users/${id}`, { method: "DELETE" }),

  chantiers: (filters: ChantierFilters = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(filters.page ?? 1));
    if (filters.q) params.set("q", filters.q);
    if (filters.organization_id) params.set("organization_id", filters.organization_id);
    if (filters.user_id) params.set("user_id", filters.user_id);
    if (filters.status) params.set("status", filters.status);
    if (filters.archived) params.set("archived", filters.archived);
    if (filters.sort) params.set("sort", filters.sort);
    if (filters.order) params.set("order", filters.order);
    return apiFetch<PaginatedResponse<AdminChantier>>(`/super-admin/chantiers?${params.toString()}`);
  },
  chantier: (id: string) => apiFetch<AdminChantierDetail>(`/super-admin/chantiers/${id}`),

  audit: (page = 1) => apiFetch<PaginatedResponse<AuditEntry>>(`/super-admin/audit?page=${page}`),
  errors: (page = 1) => apiFetch<PaginatedResponse<ErrorEntry>>(`/super-admin/errors?page=${page}`),
};
