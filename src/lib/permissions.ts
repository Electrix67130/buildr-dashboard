/**
 * Permissions Buildr — référence : `docs/PERMISSIONS.md`.
 *
 * L'API enforce les vraies règles côté serveur (403 sur action interdite).
 * Ces helpers servent à masquer / désactiver l'UI côté client pour ne pas
 * proposer ce qui ne marchera pas.
 */

import type {
  ChantierMember,
  ChantierMemberRole,
  Chantier,
  User,
  UserRole,
} from "@/types/api";

// ---------- Navigation ----------

export const canSeeOrgTeamSection = (user: User | null): boolean =>
  !!user && user.role !== "client";

export const canSeeTemplatesSection = (user: User | null): boolean =>
  !!user && user.role !== "client" && user.role !== "gestionnaire_reseau";

export const canSeeBillingSection = (user: User | null): boolean =>
  user?.role === "admin";

export const isSuperAdmin = (user: User | null): boolean => !!user?.is_super_admin;

// ---------- Chantiers (liste) ----------

export const canCreateChantier = (user: User | null): boolean => user?.role === "admin";
export const canDeleteChantier = (user: User | null): boolean => user?.role === "admin";
export const canArchiveChantier = (user: User | null): boolean => user?.role === "admin";
export const canChangeChantierRetention = (user: User | null): boolean =>
  user?.role === "admin";

// ---------- Chantier — contexte d'un user ----------

export interface ChantierContext {
  user: User | null;
  chantier: Chantier | null;
  // Membre courant dans le chantier (peut être null pour un admin qui n'est pas explicitement membre).
  currentMember: ChantierMember | null;
}

export const isAdmin = (ctx: ChantierContext): boolean => ctx.user?.role === "admin";
export const isCreator = (ctx: ChantierContext): boolean =>
  !!ctx.chantier && !!ctx.user && ctx.chantier.created_by === ctx.user.id;
export const isOrgManager = (ctx: ChantierContext): boolean => ctx.user?.role === "manager";
export const isChantierManager = (ctx: ChantierContext): boolean =>
  ctx.currentMember?.role === "manager";
export const isClientMember = (ctx: ChantierContext): boolean =>
  ctx.currentMember?.role === "client";
export const isGestionnaireReseau = (ctx: ChantierContext): boolean =>
  ctx.user?.role === "gestionnaire_reseau" ||
  ctx.currentMember?.role === "gestionnaire_reseau";

// ---------- Visibilité des onglets ----------

export const canViewComments = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || !!ctx.currentMember?.can_view_comments;

export const canViewPhotos = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || !!ctx.currentMember?.can_view_photos;

export const canViewDocuments = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) ||
  isCreator(ctx) ||
  !!ctx.currentMember?.can_view_documents ||
  isGestionnaireReseau(ctx);

export const canViewSteps = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || !!ctx.currentMember?.can_view_steps;

export const canViewTeam = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || !!ctx.currentMember?.can_view_team;

export const canViewEmergencies = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || !!ctx.currentMember;

// ---------- Actions sur le chantier ----------

export const canEditChantier = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || !!ctx.currentMember?.can_edit;

export const canManageSteps = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || isChantierManager(ctx) || !!ctx.currentMember?.can_edit;

export const canToggleSteps = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx) || (!!ctx.currentMember && ctx.currentMember.role !== "client");

export const canCreateEmergency = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) ||
  isCreator(ctx) ||
  ctx.currentMember?.role === "manager" ||
  ctx.currentMember?.role === "ouvrier" ||
  ctx.currentMember?.role === "client";

export type EmergencyMode = "split" | "emergency" | "claim";
export const emergencyMode = (ctx: ChantierContext): EmergencyMode => {
  if (isAdmin(ctx) || isCreator(ctx) || isChantierManager(ctx)) return "split";
  if (isClientMember(ctx)) return "claim";
  return "emergency";
};

export const canSendMessage = (ctx: ChantierContext): boolean => canViewComments(ctx);

export const canDeleteOthersMessage = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx);

// ---------- Équipe du chantier ----------

export const canManageChantierMembers = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isOrgManager(ctx) || isCreator(ctx);

export const canEditChantierPermissions = (ctx: ChantierContext): boolean =>
  isAdmin(ctx) || isCreator(ctx);

// Mapping rôle org → rôle chantier (auto à l'ajout).
export const orgToChantierRole = (orgRole: UserRole): ChantierMemberRole => {
  switch (orgRole) {
    case "admin":
    case "manager":
      return "manager";
    case "employee":
      return "ouvrier";
    case "client":
      return "client";
    case "gestionnaire_reseau":
      return "gestionnaire_reseau";
  }
};

export const isExternalRole = (role: ChantierMemberRole): role is "client" | "gestionnaire_reseau" =>
  role === "client" || role === "gestionnaire_reseau";

// Permissions par défaut à l'ajout d'un membre externe.
export type ExternalPerms = {
  can_view_comments: boolean;
  can_view_photos: boolean;
  can_view_documents: boolean;
  can_view_steps: boolean;
  can_view_team: boolean;
  can_edit: boolean;
};

export const CLIENT_DEFAULT_PERMS: ExternalPerms = {
  can_view_comments: true,
  can_view_photos: true,
  can_view_documents: false,
  can_view_steps: false,
  can_view_team: true,
  can_edit: false,
};

export const GESTIONNAIRE_RESEAU_DEFAULT_PERMS: ExternalPerms = {
  can_view_comments: false,
  can_view_photos: false,
  can_view_documents: true, // côté serveur filtré aux DICT uniquement
  can_view_steps: false,
  can_view_team: false,
  can_edit: false,
};

export const defaultPermsForRole = (role: ChantierMemberRole): ExternalPerms | null => {
  if (role === "client") return { ...CLIENT_DEFAULT_PERMS };
  if (role === "gestionnaire_reseau") return { ...GESTIONNAIRE_RESEAU_DEFAULT_PERMS };
  return null;
};

// ---------- Équipe (organisation) ----------

export const canInviteOrgMember = (user: User | null, targetRole: UserRole): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "manager") return targetRole === "employee" || targetRole === "client";
  return false;
};

export const canChangeOrgMemberRole = (user: User | null): boolean => user?.role === "admin";
export const canRemoveOrgMember = (user: User | null): boolean => user?.role === "admin";

// ---------- Sièges facturables ----------

export const BILLABLE_ROLES = new Set<UserRole>(["admin", "manager", "employee"]);

export const isBillableRole = (role: UserRole): boolean => BILLABLE_ROLES.has(role);
