"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Ban, CheckCircle, KeyRound, LogOut, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { adminApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { useConfirm, useAlert } from "@/contexts/DialogContext";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const showAlert = useAlert();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => adminApi.users(search || undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const enable = useMutation({
    mutationFn: adminApi.enableUser,
    onSuccess: () => {
      toast.success("Utilisateur réactivé");
      invalidate();
    },
  });
  const disable = useMutation({
    mutationFn: adminApi.disableUser,
    onSuccess: () => {
      toast.success("Utilisateur désactivé + sessions tuées");
      invalidate();
    },
  });
  const kick = useMutation({
    mutationFn: adminApi.kickSessions,
    onSuccess: (data) => {
      toast.success(`${data.sessions_killed} session${data.sessions_killed > 1 ? "s" : ""} terminée${data.sessions_killed > 1 ? "s" : ""}`);
    },
  });
  const reset = useMutation({
    mutationFn: adminApi.forceReset,
    onSuccess: (data) => {
      showAlert({
        title: "Mot de passe temporaire",
        description: `${data.temporary_password}\n\nTransmettez-le à l'utilisateur, il devra le changer après login.`,
        tone: "info",
      });
    },
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success("Utilisateur supprimé");
      invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Utilisateurs</h1>
        <p className="text-sm text-zinc-500">
          {data?.meta.total ?? 0} utilisateur{(data?.meta.total ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Rechercher (email, nom)…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Chargement…</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-zinc-900 dark:text-white">
                      {u.first_name} {u.last_name}
                    </p>
                    {!u.is_active ? <Badge variant="danger">Désactivé</Badge> : null}
                    {u.is_super_admin ? <Badge variant="info">Super admin</Badge> : null}
                  </div>
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
                      description: `Forcer reset password pour ${u.email} ?`,
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
                      description: `Tuer toutes les sessions actives de ${u.email} ?`,
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
                        title: "Désactiver",
                        description: `Désactiver ${u.email} ? (kick sessions inclus)`,
                        confirmLabel: "Désactiver",
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
                      title: "Suppression définitive",
                      description: `SUPPRIMER DÉFINITIVEMENT ${u.email} ?\n\nIrréversible. RGPD-compliant.`,
                      confirmLabel: "Supprimer",
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
          <p className="p-6 text-sm text-zinc-500">Aucun utilisateur.</p>
        )}
      </Card>
    </div>
  );
}
