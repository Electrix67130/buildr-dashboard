"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { adminApi } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/utils";

export default function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => adminApi.audit(),
    refetchInterval: 30000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Journal d&apos;audit</h1>
        <p className="text-sm text-zinc-500">
          Toutes les actions super_admin sont logguées ici (qui, quoi, quand).
        </p>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Chargement…</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{e.action}</Badge>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      {e.super_admin_first_name} {e.super_admin_last_name}
                    </span>
                    <span className="text-xs text-zinc-500">{e.super_admin_email}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {e.target_type ? `${e.target_type} ${e.target_id}` : null}
                    {e.metadata ? ` • ${JSON.stringify(e.metadata)}` : null}
                    {e.ip ? ` • IP ${e.ip}` : null}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-zinc-500">
                  {formatDateTime(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-zinc-500">Aucune action loggée.</p>
        )}
      </Card>
    </div>
  );
}
