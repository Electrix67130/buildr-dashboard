"use client";

import { useState, FormEvent } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { UserPlus, Mail, Trash2, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { roleBadgeClass } from "@/lib/role-style";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import type { User, Invitation, UserRole, PaginatedResponse } from "@/types/api";

const ROLES: UserRole[] = ["admin", "manager", "employee", "client", "gestionnaire_reseau"];

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  admin: "role.admin",
  manager: "role.manager",
  employee: "role.employee",
  client: "role.client",
  gestionnaire_reseau: "role.gestionnaireReseau",
};

export default function TeamPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { t } = useI18n();
  const isAdmin = me?.role === "admin";
  const [showInvite, setShowInvite] = useState(false);
  const roleLabel = (r: UserRole) => t(ROLE_LABEL_KEYS[r]);

  const members = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<PaginatedResponse<User>>("/users?limit=100"),
  });

  const invitations = useQuery({
    queryKey: ["invitations"],
    queryFn: () => apiFetch<PaginatedResponse<Invitation>>("/invitations?limit=100"),
    enabled: isAdmin,
  });

  const cancelInvite = useMutation({
    mutationFn: (id: string) => apiFetch(`/invitations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("team.inviteCancelled"));
      qc.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("team.title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {(members.data?.meta.total ?? 0) > 1
              ? t("team.memberCountPlural", { count: members.data?.meta.total ?? 0 })
              : t("team.memberCount", { count: members.data?.meta.total ?? 0 })}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus size={16} />
            {t("team.invite")}
          </Button>
        ) : null}
      </div>

      {showInvite ? <InviteForm onClose={() => setShowInvite(false)} /> : null}

      <Card className="p-0">
        {members.isLoading ? (
          <p className="p-6 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : members.data && members.data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {members.data.data.map((m) => {
              const isMe = m.id === me?.id;
              return (
                <li key={m.id}>
                  <Link
                    href={`/team/${m.id}`}
                    className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <Avatar firstName={m.first_name} lastName={m.last_name} src={m.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-white">
                        {m.first_name} {m.last_name}
                        {isMe ? (
                          <span className="ml-2 text-xs text-zinc-500">
                            ({t("common.you").toLowerCase()})
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>

                    <ChevronRight size={16} className="flex-shrink-0 text-zinc-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-6">
            <p className="text-sm text-zinc-500">{t("team.empty")}</p>
          </div>
        )}
      </Card>

      {isAdmin && invitations.data && invitations.data.data.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
            {t("team.pendingInvites", { count: invitations.data.data.length })}
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {invitations.data.data.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 px-6 py-4">
                  <Mail size={18} className="text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-white">{inv.email}</p>
                    <p className="text-xs text-zinc-500">
                      {t("team.expiresOn", {
                        date: formatDate(inv.expires_at),
                        role: roleLabel(inv.role),
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelInvite.mutate(inv.id)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    aria-label={t("common.cancel")}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function InviteForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/invitations", { method: "POST", body: { email, role } });
      toast.success(t("team.inviteSent"));
      qc.invalidateQueries({ queryKey: ["invitations"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("team.inviteTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label={t("auth.email")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sm:col-span-2"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("common.role")}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(ROLE_LABEL_KEYS[r])}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={loading}>
            {t("team.inviteSubmit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
