"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Users, FolderArchive, Wallet } from "lucide-react";
import Card from "@/components/ui/Card";
import { adminApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminApi.overview(),
    refetchInterval: 60000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Vue d&apos;ensemble plateforme</h1>
        <p className="text-sm text-zinc-500">Toutes les organisations confondues.</p>
      </div>

      {isLoading || !data ? (
        <Card>Chargement…</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon={<Building2 size={20} />} label="Organisations" value={data.orgs.total} sub={`${data.orgs.active} actives`} />
            <Stat icon={<Users size={20} />} label="Utilisateurs" value={data.users.total} sub={`${data.users.active} actifs`} />
            <Stat icon={<FolderArchive size={20} />} label="Chantiers" value={data.chantiers.active} sub={`${data.chantiers.archived} archivés`} />
            <Stat
              icon={<Wallet size={20} />}
              label="Sièges facturables"
              value={data.billing.billable_seats}
              sub={`~ ${data.billing.estimated_monthly_eur}€ / mois`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Dernières organisations
              </h2>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.recent_orgs.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orgs/${o.id}`}
                      className="flex items-center justify-between py-2 hover:opacity-70"
                    >
                      <span className="text-sm text-zinc-900 dark:text-white">{o.name}</span>
                      <span className="text-xs text-zinc-500">{formatDate(o.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Derniers utilisateurs
              </h2>
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.recent_users.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center justify-between py-2 hover:opacity-70"
                    >
                      <span className="text-sm">
                        <span className="text-zinc-900 dark:text-white">
                          {u.first_name} {u.last_name}
                        </span>{" "}
                        <span className="text-zinc-500">{u.email}</span>
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(u.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{sub}</p>
        </div>
        <div className="text-red-600 dark:text-red-400">{icon}</div>
      </div>
    </Card>
  );
}
