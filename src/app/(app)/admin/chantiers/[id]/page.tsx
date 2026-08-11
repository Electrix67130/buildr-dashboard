"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Archive, MapPin, Calendar, Users, FileText, Camera, ListChecks } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { adminApi, type ChantierStatus } from "@/lib/admin-api";
import { formatDate, formatDateTime } from "@/lib/utils";

const STATUS_LABEL: Record<ChantierStatus, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

const STATUS_VARIANT: Record<ChantierStatus, "default" | "info" | "success"> = {
  a_venir: "default",
  en_cours: "info",
  termine: "success",
};

export default function AdminChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "chantiers", id],
    queryFn: () => adminApi.chantier(id),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/chantiers"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          Retour aux chantiers
        </Link>
        {isLoading ? (
          <h1 className="text-2xl font-bold text-zinc-400">Chargement…</h1>
        ) : error || !data ? (
          <h1 className="text-2xl font-bold text-red-600">Chantier introuvable</h1>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{data.name}</h1>
              <Badge variant={STATUS_VARIANT[data.status]}>{STATUS_LABEL[data.status]}</Badge>
              {data.archived_at ? (
                <Badge variant="default">
                  <Archive size={10} className="mr-1" />
                  Archivé le {formatDate(data.archived_at)}
                </Badge>
              ) : null}
            </div>
            {data.address || data.city ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
                <MapPin size={14} />
                {[data.address, data.postal_code, data.city].filter(Boolean).join(", ")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {data ? (
        <>
          {/* Counts */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <div className="flex items-center gap-3">
                <Users size={20} className="text-orange-600" />
                <div>
                  <p className="text-xs text-zinc-500">Membres</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {data.counts.members}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <Camera size={20} className="text-orange-600" />
                <div>
                  <p className="text-xs text-zinc-500">Photos</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {data.counts.photos}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-orange-600" />
                <div>
                  <p className="text-xs text-zinc-500">Documents</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {data.counts.documents}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <ListChecks size={20} className="text-orange-600" />
                <div>
                  <p className="text-xs text-zinc-500">Étapes</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {data.counts.steps}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Détails */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Détails</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Organisation
                </dt>
                <dd className="mt-0.5">
                  <Link
                    href={`/admin/orgs/${data.organization_id}`}
                    className="text-zinc-900 hover:underline dark:text-white"
                  >
                    {data.organization_name}
                  </Link>
                  {!data.organization_active ? (
                    <Badge variant="danger" className="ml-2">
                      Orga désactivée
                    </Badge>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Créé par</dt>
                <dd className="mt-0.5">
                  <Link
                    href={`/admin/users/${data.created_by_id}`}
                    className="text-zinc-900 hover:underline dark:text-white"
                  >
                    {data.created_by_first_name} {data.created_by_last_name}
                  </Link>
                  <span className="block text-xs text-zinc-500">{data.created_by_email}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Créé le</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">
                  {formatDateTime(data.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Maj le</dt>
                <dd className="mt-0.5 text-zinc-900 dark:text-white">
                  {formatDateTime(data.updated_at)}
                </dd>
              </div>
              {data.start_date ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <Calendar size={10} className="mr-1 inline" />
                    Début
                  </dt>
                  <dd className="mt-0.5 text-zinc-900 dark:text-white">
                    {formatDate(data.start_date)}
                  </dd>
                </div>
              ) : null}
              {data.end_date ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <Calendar size={10} className="mr-1 inline" />
                    Fin prévue
                  </dt>
                  <dd className="mt-0.5 text-zinc-900 dark:text-white">{formatDate(data.end_date)}</dd>
                </div>
              ) : null}
              {data.description ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Description
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-zinc-900 dark:text-white">
                    {data.description}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {/* Membres */}
          <Card className="p-0">
            <div className="border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Membres ({data.members.length})
              </h2>
            </div>
            {data.members.length > 0 ? (
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
                      {!m.is_active ? (
                        <Badge variant="danger" className="ml-2">
                          Désactivé
                        </Badge>
                      ) : null}
                      <p className="truncate text-xs text-zinc-500">
                        {m.email} · Rejoint le {formatDate(m.joined_at)}
                      </p>
                    </div>
                    <Badge variant={m.role === "responsable" ? "info" : "default"}>{m.role}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-6 text-sm text-zinc-500">Aucun membre.</p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
