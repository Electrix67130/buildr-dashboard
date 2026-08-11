"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle, KeyRound, LogOut, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { adminApi } from "@/lib/admin-api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useConfirm, useAlert } from "@/contexts/DialogContext";

interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
  active_sessions: number;
  memberships: {
    organization_id: string;
    organization_name: string;
    is_active: boolean;
    role: string;
  }[];
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();
  const confirm = useConfirm();
  const showAlert = useAlert();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => adminApi.user(id) as Promise<UserDetail>,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const enable = useMutation({
    mutationFn: () => adminApi.enableUser(id),
    onSuccess: () => {
      toast.success("Utilisateur réactivé");
      invalidate();
    },
  });
  const disable = useMutation({
    mutationFn: () => adminApi.disableUser(id),
    onSuccess: () => {
      toast.success("Utilisateur désactivé + sessions tuées");
      invalidate();
    },
  });
  const kick = useMutation({
    mutationFn: () => adminApi.kickSessions(id),
    onSuccess: (data) => {
      toast.success(`${data.sessions_killed} session${data.sessions_killed > 1 ? "s" : ""} terminée${data.sessions_killed > 1 ? "s" : ""}`);
      invalidate();
    },
  });
  const reset = useMutation({
    mutationFn: () => adminApi.forceReset(id),
    onSuccess: (data) => {
      showAlert({
        title: "Mot de passe temporaire",
        description: `${data.temporary_password}\n\nTransmets-le à l'utilisateur, il devra le changer après login.`,
        tone: "info",
      });
    },
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      router.replace("/admin/users");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/users"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          Retour aux utilisateurs
        </Link>
        {isLoading ? (
          <h1 className="text-2xl font-bold text-zinc-400">Chargement…</h1>
        ) : error || !data ? (
          <h1 className="text-2xl font-bold text-red-600">Utilisateur introuvable</h1>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar firstName={data.first_name} lastName={data.last_name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {data.first_name} {data.last_name}
                </h1>
                {!data.is_active ? <Badge variant="danger">Désactivé</Badge> : null}
                {data.is_super_admin ? <Badge variant="info">Super admin</Badge> : null}
              </div>
              <p className="text-sm text-zinc-500">{data.email}</p>
            </div>
          </div>
        )}
      </div>

      {data ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const ok = await confirm({
                  title: "Reset password",
                  description: `Forcer reset password pour ${data.email} ?`,
                  confirmLabel: "Reset",
                });
                if (ok) reset.mutate();
              }}
            >
              <KeyRound size={14} />
              Force reset password
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const ok = await confirm({
                  title: "Kick sessions",
                  description: `Tuer toutes les sessions actives de ${data.email} ?`,
                  confirmLabel: "Kick",
                  tone: "danger",
                });
                if (ok) kick.mutate();
              }}
            >
              <LogOut size={14} />
              Kick sessions ({data.active_sessions})
            </Button>
            {data.is_active ? (
              <Button
                variant="danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Désactiver",
                    description: `Désactiver ${data.email} ? (kick sessions inclus)`,
                    confirmLabel: "Désactiver",
                    tone: "danger",
                  });
                  if (ok) disable.mutate();
                }}
              >
                <Ban size={14} />
                Désactiver
              </Button>
            ) : (
              <Button onClick={() => enable.mutate()}>
                <CheckCircle size={14} />
                Réactiver
              </Button>
            )}
            <Button
              variant="danger"
              onClick={async () => {
                const ok = await confirm({
                  title: "Suppression définitive",
                  description: `SUPPRIMER DÉFINITIVEMENT ${data.email} ?\n\nIrréversible. RGPD-compliant.`,
                  confirmLabel: "Supprimer",
                  tone: "danger",
                });
                if (ok) remove.mutate();
              }}
            >
              <Trash2 size={14} />
              Supprimer
            </Button>
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Détails</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Email</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">{data.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Téléphone</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">{data.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Inscrit le</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">{formatDate(data.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Dernière maj
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">
                  {formatDateTime(data.updated_at)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-0">
            <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Memberships ({data.memberships.length})
              </h2>
            </div>
            {data.memberships.length > 0 ? (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.memberships.map((m) => (
                  <li key={m.organization_id} className="flex items-center gap-3 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/orgs/${m.organization_id}`}
                        className="truncate font-medium text-zinc-900 hover:underline dark:text-white"
                      >
                        {m.organization_name}
                      </Link>
                      {!m.is_active ? (
                        <Badge variant="danger" className="ml-2">
                          Orga désactivée
                        </Badge>
                      ) : null}
                    </div>
                    <Badge variant={m.role === "admin" ? "info" : "default"}>{m.role}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-sm text-zinc-500">Aucune membership.</p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
