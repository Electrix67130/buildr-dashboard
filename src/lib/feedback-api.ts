import { apiFetch } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";

export type FeedbackType = "bug" | "suggestion";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "declined";

export interface Feedback {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: FeedbackType;
  subject: string;
  message: string;
  status: FeedbackStatus;
  platform: "mobile" | "web" | null;
  app_version: string | null;
  screen: string | null;
  locale: string;
  /** Reponse du support. Nulle tant que personne n'a repondu. */
  response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Signalement enrichi de son auteur, tel que le voit la console support. */
export interface FeedbackWithAuthor extends Feedback {
  author_email: string | null;
  author_first_name: string | null;
  author_last_name: string | null;
  organization_name: string | null;
  responder_email: string | null;
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  subject: string;
  message: string;
  platform?: "mobile" | "web";
  app_version?: string;
  screen?: string;
  locale?: string;
}

export interface FeedbackFilters {
  page?: number;
  status?: FeedbackStatus;
  type?: FeedbackType;
  q?: string;
}

/** Reponse de la console : la liste, plus le compte par statut pour les onglets. */
export type FeedbackListResponse = PaginatedResponse<FeedbackWithAuthor> & {
  counts: Partial<Record<FeedbackStatus, number>>;
};

export const feedbackApi = {
  /** Deposer un bug ou une suggestion. */
  create: (input: CreateFeedbackInput) =>
    apiFetch<Feedback>("/feedbacks", { method: "POST", body: input }),

  /** Ses propres signalements, avec les reponses recues. */
  mine: (page = 1) => apiFetch<PaginatedResponse<Feedback>>(`/feedbacks/mine?page=${page}`),
};

export const feedbackSupportApi = {
  list: (filters: FeedbackFilters = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(filters.page ?? 1));
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);
    if (filters.q) params.set("q", filters.q);
    return apiFetch<FeedbackListResponse>(`/super-admin/feedbacks?${params.toString()}`);
  },

  get: (id: string) => apiFetch<FeedbackWithAuthor>(`/super-admin/feedbacks/${id}`),

  /**
   * Traite un signalement. Ecrire une reponse le passe a `resolved` cote API,
   * sauf si un statut est precise explicitement.
   */
  respond: (id: string, patch: { status?: FeedbackStatus; response?: string | null }) =>
    apiFetch<Feedback>(`/super-admin/feedbacks/${id}`, { method: "PATCH", body: patch }),
};
