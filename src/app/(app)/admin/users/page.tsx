"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Ban, CheckCircle, KeyRound, LogOut, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { adminApi, type AdminUserRole, type AdminUserStatus, type UserFilters } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { useConfirm, useAlert } from "@/contexts/DialogContext";
import { useI18n } from "@/contexts/I18nContext";

export default function AdminUsersPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const showAlert = useAlert();
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState("");
  const [role, setRole] = useState<AdminUserRole | "">("");
  const [status, setStatus] = useState<AdminUserStatus | "">("");
  const [superOnly, setSuperOnly] = useState(false);
  const [sort, setSort] = useState<NonNullable<UserFilters["sort"]>>("created_at");
  const [order, setOrder] = useState<NonNullable<UserFilters["order"]>>("desc");

  const filters: UserFilters = {
    q: search || undefined,
    organization_id: orgId || undefined,
    role: role || undefined,
    status: status || undefined,
    super_admin: superOnly || undefined,
    sort,
    order,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => adminApi.users(filters),
  });
  const orgsList = useQuery({
    queryKey: ["admin", "orgs", "all"],
    queryFn: () => adminApi.orgs(undefined, 1),
  });
  const hasFilters = !!(orgId || role || status || superOnly || search);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const enable = useMutation({
    mutationFn: adminApi.enableUser,
    onSuccess: () => {
      toast.success(t("admin.userReactivated"));
      invalidate();
    },
  });
  const disable = useMutation({
    mutationFn: adminApi.disableUser,
    onSuccess: () => {
      toast.success(t("admin.userDeactivatedToast"));
      invalidate();
    },
  });
  const kick = useMutation({
    mutationFn: adminApi.kickSessions,
    onSuccess: (data) => {
      toast.success(t("admin.sessionsKilled", { count: data.sessions_killed }));
    },
  });
  const reset = useMutation({
    mutationFn: adminApi.forceReset,
    onSuccess: (data) => {
      showAlert({
        title: t("admin.tempPassword"),
        description: t("admin.tempPasswordBody", { password: data.temporary_password }),
        tone: "info",
      });
    },
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success(t("admin.userDeleted"));
      invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("admin.users")}</h1>
        <p className="text-sm text-zinc-500">
          {data?.meta.total ?? 0} utilisateur{(data?.meta.total ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-[2.35rem] -translate-y-1/2 text-zinc-400" />
            <Input
              label={t("common.search")}
              placeholder={t("admin.searchUser")}
              inputClassName="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select label={t("topbar.organization")} value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            <option value="">{t("admin.filterAllOrgs")}</option>
            {orgsList.data?.data.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>

          <Select label={t("admin.filterRole")} value={role} onChange={(e) => setRole(e.target.value as AdminUserRole | "")}>
            <option value="">{t("admin.filterAllRoles")}</option>
            <option value="admin">{t("role.admin")}</option>
            <option value="manager">{t("role.manager")}</option>
            <option value="employee">{t("role.employee")}</option>
            <option value="client">{t("role.client")}</option>
            <option value="gestionnaire_reseau">{t("role.gestionnaire_reseau")}</option>
          </Select>

          <Select label={t("admin.filterAccountState")} value={status} onChange={(e) => setStatus(e.target.value as AdminUserStatus | "")}>
            <option value="">{t("admin.filterAllAccounts")}</option>
            <option value="active">{t("admin.filterActive")}</option>
            <option value="disabled">{t("admin.filterDisabled")}</option>
            <option value="deleted">{t("admin.filterDeleted")}</option>
          </Select>

          <Select
            label={t("admin.sortLabel")}
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s as typeof sort);
              setOrder(o as typeof order);
            }}
          >
            <option value="created_at:desc">{t("admin.sortRecent")}</option>
            <option value="created_at:asc">{t("admin.sortOldest")}</option>
            <option value="last_name:asc">{t("admin.sortNameAsc")}</option>
            <option value="last_name:desc">{t("admin.sortNameDesc")}</option>
            <option value="email:asc">{t("auth.email")}</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={superOnly}
              onChange={(e) => setSuperOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
            />
            {t("admin.filterSuperAdmins")}
          </label>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setOrgId("");
                setRole("");
                setStatus("");
                setSuperOnly(false);
              }}
              className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              {t("admin.filterReset")}
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-zinc-900 dark:text-white">
                      {u.first_name} {u.last_name}
                    </p>
                    {u.deleted_at ? (
                      <Badge variant="default">{t("admin.filterDeleted")}</Badge>
                    ) : !u.is_active ? (
                      <Badge variant="danger">{t("admin.userDeactivatedBadge")}</Badge>
                    ) : null}
                    {u.is_super_admin ? <Badge variant="info">Super admin</Badge> : null}
                  </div>
                  {u.organizations && u.organizations.length > 0 ? (
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-zinc-500">
                      {u.organizations.map((o) => (
                        <span key={o.id}>
                          {o.name} <span className="text-zinc-400">· {t(`role.${o.role}`)}</span>
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p className="truncate text-sm text-zinc-500">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">Inscrit le {formatDate(u.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Reset password",
                      description: t("admin.confirmForceReset", { email: u.email }),
                      confirmLabel: "Reset",
                    });
                    if (ok) reset.mutate(u.id);
                  }}
                  title="Force reset password"
                >
                  <KeyRound size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Kick sessions",
                      description: t("admin.confirmKickSessions", { email: u.email }),
                      confirmLabel: "Kick",
                      tone: "danger",
                    });
                    if (ok) kick.mutate(u.id);
                  }}
                  title="Kick sessions"
                >
                  <LogOut size={14} />
                </Button>
                {u.is_active ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("admin.deactivate"),
                        description: t("admin.confirmDisableUser", { email: u.email }),
                        confirmLabel: t("admin.deactivate"),
                        tone: "danger",
                      });
                      if (ok) disable.mutate(u.id);
                    }}
                  >
                    <Ban size={14} />
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => enable.mutate(u.id)}>
                    <CheckCircle size={14} />
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: t("admin.permanentDelete"),
                      description: t("admin.confirmDeleteUser", { email: u.email }),
                      confirmLabel: t("common.delete"),
                      tone: "danger",
                    });
                    if (ok) remove.mutate(u.id);
                  }}
                  title="Delete user"
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-zinc-500">{t("admin.noUser")}</p>
        )}
      </Card>
    </div>
  );
}
