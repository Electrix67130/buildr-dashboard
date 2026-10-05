import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";

export type ReportTarget = "comment" | "emergency_comment" | "photo" | "user";
export type ReportReason = "inappropriate" | "harassment" | "off_topic" | "other";
export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface Report {
  id: string;
  organization_id: string;
  chantier_id: string | null;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  target_user_id: string | null;
  target_excerpt: string | null;
  reason: ReportReason;
  comment: string | null;
  status: ReportStatus;
  escalated: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  reporter_first_name: string;
  reporter_last_name: string;
  target_first_name: string | null;
  target_last_name: string | null;
  chantier_name: string | null;
  organization_name: string;
  target_exists: boolean;
}

export type ReportsPage = PaginatedResponse<Report> & { counts: { pending: number } };

export interface ReportFilters {
  status?: ReportStatus | "";
  chantier_id?: string;
  escalated?: boolean;
  organization_id?: string;
  page?: number;
}

function query(filters: ReportFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("limit", "50");
  if (filters.status) params.set("status", filters.status);
  if (filters.chantier_id) params.set("chantier_id", filters.chantier_id);
  if (filters.escalated) params.set("escalated", "1");
  if (filters.organization_id) params.set("organization_id", filters.organization_id);
  return params.toString();
}

/** Les signalements de son organisation (administrateurs). */
export function useReports(filters: ReportFilters, enabled = true) {
  return useQuery({
    queryKey: ["reports", "org", filters],
    queryFn: () => apiFetch<ReportsPage>(`/reports?${query(filters)}`),
    enabled,
  });
}

/** Tous les signalements, pour la console. */
export function useAllReports(filters: ReportFilters, enabled = true) {
  return useQuery({
    queryKey: ["reports", "all", filters],
    queryFn: () => apiFetch<ReportsPage>(`/super-admin/reports?${query(filters)}`),
    enabled,
  });
}

/** Nombre de signalements en attente, pour la pastille du menu. */
export function usePendingReportsCount(enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "org", "pending-count"],
    queryFn: () => apiFetch<ReportsPage>("/reports?status=pending&limit=1"),
    enabled,
    select: (d) => d.counts.pending,
    refetchInterval: 60000,
  });
}
