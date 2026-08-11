"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MapPin, Search, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import type { Chantier, PaginatedResponse } from "@/types/api";

export default function ArchivesPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const list = useQuery({
    queryKey: ["chantiers", "archives"],
    queryFn: () => apiFetch<PaginatedResponse<Chantier>>("/chantiers/archives?limit=100"),
  });

  const filtered = (list.data?.data ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("archives.title")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {(list.data?.meta.total ?? 0) > 1
            ? t("archives.archivedCountPlural", { count: list.data?.meta.total ?? 0 })
            : t("archives.archivedCount", { count: list.data?.meta.total ?? 0 })}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <Input
          placeholder={t("archives.searchPlaceholder")}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.isLoading ? (
        <Card>
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("archives.empty")}
          description={search ? t("chantiers.noSearchResult") : t("archives.emptyDesc")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((c) => (
            <Link key={c.id} href={`/chantiers/${c.id}`}>
              <Card className="transition-colors hover:border-orange-500/50">
                <p className="truncate text-base font-semibold text-zinc-900 dark:text-white">
                  {c.name}
                </p>
                {(c.address || c.city) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin size={12} />
                    {[c.address, c.city].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="mt-3 space-y-0.5 text-xs">
                  <p className="text-zinc-500">
                    {t("archives.archivedOn", { date: formatDate(c.archived_at) })}
                  </p>
                  <p className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <Clock size={12} />
                    {t("archives.autoDeleteOn", { date: formatDate(c.auto_delete_at) })}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
