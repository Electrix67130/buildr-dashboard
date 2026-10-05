/**
 * Fabriques de donnees aux formes de l'API (docs/API.md). Chaque fabrique
 * prend des surcharges : un test ne nomme que ce qui compte pour lui.
 */
import type { ThreadMessage } from "@/components/MessageThread";
import type { Report } from "@/hooks/useReports";
import type { AdminUser } from "@/lib/admin-api";
import type { ChantierMember, ChantierStep, ChantierSubstep, Emergency, User } from "@/types/api";

const NOW = "2026-10-01T09:00:00.000Z";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-admin",
    email: "admin@buildr.test",
    first_name: "Alice",
    last_name: "Martin",
    role: "admin",
    is_active: true,
    is_super_admin: false,
    push_enabled: true,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

export function makeMessage(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  return {
    id: "msg-1",
    author_id: "user-other",
    content: "Le beton arrive a 8h",
    created_at: NOW,
    updated_at: NOW,
    first_name: "Bruno",
    last_name: "Durand",
    reply_to: null,
    reactions: [],
    ...overrides,
  };
}

export function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: "report-1",
    organization_id: "org-1",
    chantier_id: "chantier-1",
    reporter_id: "user-reporter",
    target_type: "comment",
    target_id: "comment-1",
    target_user_id: "user-target",
    target_excerpt: "Message deplace",
    reason: "harassment",
    comment: null,
    status: "pending",
    escalated: false,
    resolved_by: null,
    resolved_at: null,
    resolution_note: null,
    created_at: NOW,
    reporter_first_name: "Claire",
    reporter_last_name: "Petit",
    target_first_name: "Bruno",
    target_last_name: "Durand",
    chantier_name: "Residence Les Pins",
    organization_name: "BTP Martin",
    target_exists: true,
    ...overrides,
  };
}

export function makeSubstep(overrides: Partial<ChantierSubstep> = {}): ChantierSubstep {
  return {
    id: "sub-1",
    step_id: "step-1",
    name: "Fondations",
    position: 0,
    validated_at: null,
    validated_by: null,
    validation_comment: null,
    photos: [],
    ...overrides,
  };
}

export function makeStep(overrides: Partial<ChantierStep> = {}): ChantierStep {
  return {
    id: "step-1",
    chantier_id: "chantier-1",
    name: "Gros oeuvre",
    position: 0,
    created_at: NOW,
    substeps: [],
    photos: [],
    ...overrides,
  };
}

export function makeMember(overrides: Partial<ChantierMember> = {}): ChantierMember {
  return {
    id: "member-1",
    chantier_id: "chantier-1",
    user_id: "user-1",
    role: "ouvrier",
    can_edit: false,
    can_view_team: true,
    can_view_steps: true,
    can_view_comments: true,
    can_view_photos: false,
    can_view_documents: true,
    first_name: "Bruno",
    last_name: "Durand",
    email: "bruno@buildr.test",
    user_role: "employee",
    created_at: NOW,
    ...overrides,
  };
}

export function makeEmergency(overrides: Partial<Emergency> = {}): Emergency {
  return {
    id: "emergency-1",
    chantier_id: "chantier-1",
    type: "emergency",
    title: "Fuite d'eau au sous-sol",
    description: "La canalisation a cede",
    status: "open",
    created_by: "user-other",
    created_at: NOW,
    photo_url: null,
    photos: [],
    ...overrides,
  };
}

export function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "u-1",
    email: "bruno@buildr.test",
    first_name: "Bruno",
    last_name: "Durand",
    phone: null,
    is_active: true,
    is_super_admin: false,
    deleted_at: null,
    created_at: NOW,
    organizations: [{ id: "org-1", name: "BTP Martin", role: "employee" }],
    ...overrides,
  };
}
