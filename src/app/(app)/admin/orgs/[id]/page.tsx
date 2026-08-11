"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle, LogIn } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { adminApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { setTokens } from "@/lib/api";
import { useConfirm } from "@/contexts/DialogContext";

interface OrgDetail {
  id: string;
  name: string;
  is_active: boolean;
  archive_retention_years: number;
  created_at: string;
  members: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    role: string;
    joined_at: string;
  }[];
  chantiers: {
    id: string;
    name: string;
    status: string;
    archived_at: string | null;
    created_at: string;
  }[];
}

export default function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orgs", id],
    queryFn: () => adminApi.org(id) as Promise<OrgDetail>,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "orgs"] });

  const enable = useMutation({
    mutationFn: () => adminApi.enableOrg(id),
    onSuccess: () => {
      toast.success("Organisation réactivée");
      invalidate();
    },
  });
  const disable = useMutation({
    mutationFn: () => adminApi.disableOrg(id),
    onSuccess: () => {
      toast.success("Organisation désactivée");
      invalidate();
    },
  });
  const impersonate = useMutation({
    mutationFn: () => adminApi.impersonate(id),
    onSuccess: (data) => {
      setTokens(data.access_token, "");
      toast.success("Connecté en tant qu'admin de l'orga (30 min)");
      router.replace("/dashboard");
    },
    onError: () => toast.error("Aucun admin dans cette orga"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/orgs"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          Retour aux organisations
        </Link>
        {isLoading ? (
          <h1 className="text-2xl font-bold text-zinc-400">Chargement…</h1>
        ) : error || !data ? (
          <h1 className="text-2xl font-bold text-red-600">Organisation introuvable</h1>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{data.name}</h1>
            {!data.is_active ? <Badge variant="danger">Désactivée</Badge> : null}
          </div>
        )}
      </div>

      {data ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => impersonate.mutate()} variant="secondary">
              <LogIn size={14} />
              Se connecter en tant qu&apos;admin
            </Button>
            {data.is_active ? (
              <Button
                variant="danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Désactiver ${data.name}`,
                    description: `Désactiver "${data.name}" ?`,
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
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Détails</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Créée le</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">{formatDate(data.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Conservation archives
                </dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">
                  {data.archive_retention_years} an{data.archive_retention_years > 1 ? "s" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Membres</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">{data.members.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Chantiers</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">{data.chantiers.length}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-0">
            <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Membres ({data.members.length})
              </h2>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-6 py-3">
                  <Avatar firstName={m.first_name} lastName={m.last_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/users/${m.id}`}
                      className="truncate font-medium text-zinc-900 hover:underline dark:text-white"
                    >
                      {m.first_name} {m.last_name}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">{m.email}</p>
                  </div>
                  <Badge variant={m.role === "admin" ? "info" : "default"}>{m.role}</Badge>
                  {!m.is_active ? <Badge variant="danger">Désactivé</Badge> : null}
                </li>
              ))}
            </ul>
          </Card>

          {data.chantiers.length > 0 ? (
            <Card className="p-0">
              <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Chantiers ({data.chantiers.length})
                </h2>
              </div>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.chantiers.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-zinc-500">
                        Créé le {formatDate(c.created_at)}
                        {c.archived_at ? ` • Archivé le ${formatDate(c.archived_at)}` : ""}
                      </p>
                    </div>
                    <Badge variant={c.archived_at ? "default" : "info"}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
