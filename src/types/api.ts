export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type UserRole = "admin" | "manager" | "employee" | "client" | "gestionnaire_reseau";

// Sur un chantier, les rôles acceptés sont différents de l'organisation :
// - pas de "admin" (l'admin de l'org est implicite via la membership)
// - "ouvrier" remplace "employee"
export type ChantierMemberRole = "manager" | "ouvrier" | "client" | "gestionnaire_reseau";

export interface Membership {
  organization_id: string;
  organization_name: string;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  company_name?: string;
  is_active: boolean;
  is_super_admin?: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  active_organization_id?: string;
  memberships?: Membership[];
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export type ChantierStatus = "a_venir" | "en_cours" | "termine";

export interface Chantier {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  status: ChantierStatus;
  start_date?: string;
  end_date?: string;
  created_by: string;
  organization_id: string;
  archived_at?: string;
  auto_delete_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  archive_retention_years: number;
  siret?: string | null;
  legal_form?: string | null;
  vat_number?: string | null;
  naf_code?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  billing_email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  insurance_provider?: string | null;
  insurance_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  user_avatar_url?: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  chantier_id: string;
  step_id?: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export interface EmergencyComment {
  id: string;
  emergency_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
}

export interface Photo {
  id: string;
  chantier_id: string;
  uploaded_by: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  taken_at?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export type DocumentType = "dict" | "dt" | "bon_de_commande" | "plan" | "arrete" | "facture" | "autre";

export interface Document {
  id: string;
  chantier_id: string;
  uploaded_by: string;
  name: string;
  type: DocumentType;
  url: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
}

export interface ChantierStep {
  id: string;
  chantier_id: string;
  name: string;
  position: number;
  validated_at?: string;
  created_at: string;
  substeps?: ChantierSubstep[];
}

export interface ChantierSubstep {
  id: string;
  step_id: string;
  name: string;
  position: number;
  validated_at?: string | null;
  validated_by?: string | null;
  validation_comment?: string | null;
}

export interface Emergency {
  id: string;
  chantier_id: string;
  type: "emergency" | "claim";
  title: string;
  description?: string;
  status: string;
  created_by: string;
  created_at: string;
  resolved_at?: string;
}

export interface ChantierMember {
  id: string;
  chantier_id: string;
  user_id: string;
  role: ChantierMemberRole;
  can_edit?: boolean;
  can_view_team?: boolean;
  can_view_steps?: boolean;
  can_view_comments?: boolean;
  can_view_photos?: boolean;
  can_view_documents?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  phone?: string;
  company_name?: string;
  user_role?: string;
  created_at: string;
}

export interface ChantierTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
