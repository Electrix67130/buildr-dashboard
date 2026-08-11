"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Trash2,
  Building2,
  CheckCircle2,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import CopyButton from "@/components/ui/CopyButton";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { roleBadgeClass } from "@/lib/role-style";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import type { User, UserRole } from "@/types/api";

const ROLES: UserRole[] = ["admin", "manager", "employee", "client", "gestionnaire_reseau"];

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  admin: "role.admin",
  manager: "role.manager",
  employee: "role.employee",
  client: "role.client",
  gestionnaire_reseau: "role.gestionnaireReseau",
};

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { t } = useI18n();
  const confirm = useConfirm();
  const isAdmin = me?.role === "admin";
  const isMe = me?.id === id;
  const roleLabel = (r: UserRole) => t(ROLE_LABEL_KEYS[r]);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["users", id],
    queryFn: () => apiFetch<User>(`/users/${id}`),
  });

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (user) setSelectedRole(user.role);
  }, [user]);

  const updateRole = useMutation({
    mutationFn: (role: UserRole) => apiFetch(`/users/${id}`, { method: "PATCH", body: { role } }),
    onSuccess: () => {
      toast.success(t("team.roleUpdated"));
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["users", id] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  const removeUser = useMutation({
    mutationFn: () => apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("team.deleted"));
      qc.invalidateQueries({ queryKey: ["users"] });
      router.replace("/team");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          {t("team.back")}
        </Link>
        <Card>
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/team"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          {t("team.back")}
        </Link>
        <Card>
          <p className="text-sm text-red-600">{t("team.notFound")}</p>
        </Card>
      </div>
    );
  }

  const canChangeRole = isAdmin && !isMe;
  const canDelete = isAdmin && !isMe;
  const roleChanged = selectedRole !== null && selectedRole !== user.role;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/team"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        {t("team.back")}
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar
          firstName={user.first_name}
          lastName={user.last_name}
          src={user.avatar_url}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {user.first_name} {user.last_name}
              {isMe ? (
                <span className="ml-2 text-base font-normal text-zinc-500">
                  ({t("common.you").toLowerCase()})
                </span>
              ) : null}
            </h1>
            <span className={roleBadgeClass(user.role)}>{roleLabel(user.role)}</span>
            {user.is_active === false ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {t("team.inactive")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
              {t("team.info")}
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Detail
                icon={<Mail size={14} />}
                label={t("auth.email")}
                value={user.email}
                href={`mailto:${user.email}`}
                copyLabel={t("auth.email")}
              />
              <Detail
                icon={<Phone size={14} />}
                label={t("team.phone")}
                value={user.phone || ""}
                href={user.phone ? `tel:${user.phone}` : undefined}
                copyLabel={t("team.phone")}
              />
              <Detail
                icon={<Building2 size={14} />}
                label={t("team.company")}
                value={user.company_name || ""}
                copyLabel={t("team.company")}
              />
              <Detail
                icon={<Calendar size={14} />}
                label={t("team.joinedOn")}
                value={formatDate(user.created_at)}
              />
            </dl>
          </Card>

          {canChangeRole ? (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-white">
                {t("team.changeRole")}
              </h2>
              <p className="mb-4 text-xs text-zinc-500">{t("team.changeRoleHint")}</p>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => {
                  const active = selectedRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={
                        active
                          ? roleBadgeClass(r) + " ring-2 ring-offset-1 dark:ring-offset-zinc-950"
                          : "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 dark:text-zinc-400 dark:ring-zinc-700 dark:hover:bg-zinc-900"
                      }
                    >
                      {active ? <CheckCircle2 size={12} /> : null}
                      {roleLabel(r)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={() => selectedRole && updateRole.mutate(selectedRole)}
                  disabled={!roleChanged}
                  loading={updateRole.isPending}
                >
                  {t("common.save")}
                </Button>
                {roleChanged ? (
                  <Button variant="ghost" onClick={() => setSelectedRole(user.role)}>
                    {t("common.cancel")}
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        {canDelete ? (
          <div className="space-y-4">
            <Card>
              <h2 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
                {t("team.dangerZone")}
              </h2>
              <p className="mb-3 text-xs text-zinc-500">{t("team.removeHint")}</p>
              <Button
                variant="danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: t("team.removeMember"),
                    description: t("team.confirmDelete", {
                      name: `${user.first_name} ${user.last_name}`,
                    }),
                    confirmLabel: t("common.delete"),
                    tone: "danger",
                  });
                  if (ok) removeUser.mutate();
                }}
                loading={removeUser.isPending}
              >
                <Trash2 size={14} />
                {t("team.removeMember")}
              </Button>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
  href,
  copyLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  copyLabel?: string;
}) {
  const empty = !value;
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-2 text-sm text-zinc-900 dark:text-white">
        {empty ? (
          <span className="text-zinc-400">—</span>
        ) : href ? (
          <a href={href} className="hover:underline">
            {value}
          </a>
        ) : (
          <span>{value}</span>
        )}
        {!empty && copyLabel ? <CopyButton value={value} label={copyLabel} /> : null}
      </dd>
    </div>
  );
}
