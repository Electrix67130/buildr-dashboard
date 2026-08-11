"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { adminApi, ErrorEntry } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/utils";

export default function AdminErrorsPage() {
  const [selected, setSelected] = useState<ErrorEntry | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "errors"],
    queryFn: () => adminApi.errors(),
    refetchInterval: 30000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Erreurs serveur</h1>
        <p className="text-sm text-zinc-500">
          Toutes les exceptions non-gérées de l&apos;API. Sentry maison — zéro service externe.
        </p>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Chargement…</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => setSelected(e)}
                  className="flex w-full items-start gap-3 px-6 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={e.level === "error" ? "danger" : "warning"}>{e.level}</Badge>
                      {e.method ? (
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                          {e.method} {e.route}
                        </code>
                      ) : null}
                      {e.status_code ? (
                        <span className="text-xs text-zinc-500">→ {e.status_code}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-900 dark:text-white">{e.message}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {e.user_email ?? "anonyme"} • req {e.request_id}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-zinc-500">
                    {formatDateTime(e.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-zinc-500">Aucune erreur enregistrée. 🎉</p>
        )}
      </Card>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge variant={selected.level === "error" ? "danger" : "warning"}>
                {selected.level}
              </Badge>
              <button
                onClick={() => setSelected(null)}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                ✕
              </button>
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              {selected.message}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {selected.method} {selected.route} → {selected.status_code} •{" "}
              {formatDateTime(selected.created_at)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              user : {selected.user_email ?? "anonyme"} • req {selected.request_id}
            </p>
            {selected.stack ? (
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
                {selected.stack}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
