"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Shield, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import {
  orgToChantierRole,
  isExternalRole,
  defaultPermsForRole,
  ExternalPerms,
} from "@/lib/permissions";
import type { ChantierMember, ChantierMemberRole, User, PaginatedResponse } from "@/types/api";

const ROLE_LABEL_KEYS: Record<ChantierMemberRole, string> = {
  manager: "role.manager",
  ouvrier: "role.ouvrier",
  client: "role.client",
  gestionnaire_reseau: "role.gestionnaireReseau",
};

type PermissionKey = keyof ExternalPerms;

const PERMISSIONS: { key: PermissionKey; labelKey: string; descKey: string }[] = [
  { key: "can_view_comments", labelKey: "chantierMembers.perm.viewComments", descKey: "chantierMembers.perm.viewCommentsDesc" },
  { key: "can_view_photos", labelKey: "chantierMembers.perm.viewPhotos", descKey: "chantierMembers.perm.viewPhotosDesc" },
  { key: "can_view_documents", labelKey: "chantierMembers.perm.viewDocuments", descKey: "chantierMembers.perm.viewDocumentsDesc" },
  { key: "can_view_steps", labelKey: "chantierMembers.perm.viewSteps", descKey: "chantierMembers.perm.viewStepsDesc" },
  { key: "can_view_team", labelKey: "chantierMembers.perm.viewTeam", descKey: "chantierMembers.perm.viewTeamDesc" },
  { key: "can_edit", labelKey: "chantierMembers.perm.edit", descKey: "chantierMembers.perm.editDesc" },
];

export default function Members({
  chantierId,
  canManage = false,
  canEditPerms = false,
}: {
  chantierId: string;
  canManage?: boolean;
  canEditPerms?: boolean;
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const confirm = useConfirm();
  const roleLabel = (r: ChantierMemberRole) => t(ROLE_LABEL_KEYS[r]);
  const [showAdd, setShowAdd] = useState(false);
  const [pickedUser, setPickedUser] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingExternal, setPendingExternal] = useState<{
    user: User;
    role: "client" | "gestionnaire_reseau";
    perms: ExternalPerms;
  } | null>(null);

  const list = useQuery({
    queryKey: ["chantier-members", chantierId],
    queryFn: () =>
      apiFetch<PaginatedResponse<ChantierMember>>(
        `/chantier-members/by-chantier?chantier_id=${chantierId}&limit=100`,
      ),
  });

  const orgUsers = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<PaginatedResponse<User>>("/users?limit=100"),
    enabled: showAdd,
  });

  const memberUserIds = useMemo(
    () => new Set((list.data?.data ?? []).map((m) => m.user_id)),
    [list.data],
  );

  const availableUsers = (orgUsers.data?.data ?? []).filter((u) => !memberUserIds.has(u.id));
  const pickedUserObj = availableUsers.find((u) => u.id === pickedUser);
  const derivedRole = pickedUserObj ? orgToChantierRole(pickedUserObj.role) : null;
  const externalAdd = derivedRole ? isExternalRole(derivedRole) : false;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["chantier-members", chantierId] });
  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const addInternal = useMutation({
    mutationFn: () => {
      if (!pickedUserObj) throw new Error("No user");
      return apiFetch("/chantier-members", {
        method: "POST",
        body: {
          chantier_id: chantierId,
          user_id: pickedUserObj.id,
          role: orgToChantierRole(pickedUserObj.role),
        },
      });
    },
    onSuccess: () => {
      setShowAdd(false);
      setPickedUser("");
      invalidate();
    },
    onError,
  });

  const addExternal = useMutation({
    mutationFn: () => {
      if (!pendingExternal) throw new Error("No pending");
      return apiFetch("/chantier-members", {
        method: "POST",
        body: {
          chantier_id: chantierId,
          user_id: pendingExternal.user.id,
          role: pendingExternal.role,
          ...pendingExternal.perms,
        },
      });
    },
    onSuccess: () => {
      setPendingExternal(null);
      invalidate();
    },
    onError,
  });

  const updatePermission = useMutation({
    mutationFn: ({ id, key, value }: { id: string; key: PermissionKey; value: boolean }) =>
      apiFetch(`/chantier-members/${id}`, { method: "PATCH", body: { [key]: value } }),
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/chantier-members/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError,
  });

  function handleConfirmAdd() {
    if (!pickedUserObj || !derivedRole) return;
    if (externalAdd && (derivedRole === "client" || derivedRole === "gestionnaire_reseau")) {
      const defaults = defaultPermsForRole(derivedRole);
      if (defaults) {
        setPendingExternal({
          user: pickedUserObj,
          role: derivedRole,
          perms: defaults,
        });
        setShowAdd(false);
        setPickedUser("");
        return;
      }
    }
    addInternal.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          {showAdd ? (
            <Button variant="ghost" onClick={() => setShowAdd(false)}>
              {t("common.cancel")}
            </Button>
          ) : (
            <Button onClick={() => setShowAdd(true)}>
              <UserPlus size={16} />
              {t("chantierMembers.add")}
            </Button>
          )}
        </div>
      ) : null}

      {showAdd ? (
        <Card>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("chantierMembers.user")}
              </label>
              <select
                value={pickedUser}
                onChange={(e) => setPickedUser(e.target.value)}
                className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">{t("chantierMembers.select")}</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email})
                  </option>
                ))}
              </select>
              {derivedRole ? (
                <p className="text-xs text-zinc-500">
                  {t("chantierMembers.roleHint", { role: roleLabel(derivedRole) })}
                  {externalAdd ? t("chantierMembers.roleHintExternal") : ""}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleConfirmAdd} disabled={!pickedUser} loading={addInternal.isPending}>
                {externalAdd ? t("chantierMembers.configurePermissions") : t("common.add")}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {list.isLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !list.data || list.data.data.length === 0 ? (
        <EmptyState title={t("chantierMembers.empty")} description={t("chantierMembers.emptyDesc")} />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.data.data.map((m) => {
              const expanded = expandedId === m.id;
              return (
                <li key={m.id}>
                  <div className="group flex items-center gap-3 px-6 py-4">
                    <Avatar firstName={m.first_name} lastName={m.last_name} src={m.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-white">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </div>
                    <Badge variant={m.role === "manager" ? "info" : "default"}>
                      {roleLabel(m.role)}
                    </Badge>
                    {canEditPerms ? (
                      <button
                        onClick={() => setExpandedId(expanded ? null : m.id)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                          expanded
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
                        )}
                        aria-label={t("chantierMembers.permissions")}
                        title={t("chantierMembers.permissions")}
                      >
                        <Shield size={14} />
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    ) : null}
                    {canManage ? (
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: t("common.delete"),
                            description: t("chantierMembers.confirmRemove", {
                              name: `${m.first_name} ${m.last_name}`,
                            }),
                            confirmLabel: t("common.delete"),
                            tone: "danger",
                          });
                          if (ok) remove.mutate(m.id);
                        }}
                        className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                  {expanded && canEditPerms ? (
                    <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {t("chantierMembers.permissions")}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {PERMISSIONS.map((p) => {
                          const checked = !!m[p.key];
                          return (
                            <label
                              key={p.key}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  updatePermission.mutate({
                                    id: m.id,
                                    key: p.key,
                                    value: e.target.checked,
                                  })
                                }
                                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                  {t(p.labelKey)}
                                </p>
                                <p className="text-xs text-zinc-500">{t(p.descKey)}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {pendingExternal ? (
        <ExternalAddModal
          name={`${pendingExternal.user.first_name} ${pendingExternal.user.last_name}`}
          role={pendingExternal.role}
          perms={pendingExternal.perms}
          onChange={(perms) => setPendingExternal({ ...pendingExternal, perms })}
          onCancel={() => setPendingExternal(null)}
          onConfirm={() => addExternal.mutate()}
          loading={addExternal.isPending}
        />
      ) : null}
    </div>
  );
}

function ExternalAddModal({
  name,
  role,
  perms,
  onChange,
  onCancel,
  onConfirm,
  loading,
}: {
  name: string;
  role: "client" | "gestionnaire_reseau";
  perms: ExternalPerms;
  onChange: (p: ExternalPerms) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t("chantierMembers.permissionsFor", { name })}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {t("chantierMembers.permissionsHint", { role: t(ROLE_LABEL_KEYS[role]) })}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 p-6 sm:grid-cols-2">
          {PERMISSIONS.map((p) => {
            const checked = perms[p.key];
            return (
              <label
                key={p.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange({ ...perms, [p.key]: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t(p.labelKey)}</p>
                  <p className="text-xs text-zinc-500">{t(p.descKey)}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {t("chantierMembers.confirmAdd")}
          </Button>
        </div>
      </div>
    </div>
  );
}
