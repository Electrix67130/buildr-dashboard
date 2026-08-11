"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Search, Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import CreateChantierModal from "@/components/chantier/CreateChantierModal";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { canCreateChantier } from "@/lib/permissions";
import { useUnreadSummary } from "@/hooks/useChantierViews";
import type { Chantier, ChantierStatus, PaginatedResponse } from "@/types/api";

export default function ChantiersPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const canCreate = canCreateChantier(user);
  const [status, setStatus] = useState<ChantierStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const STATUS_FILTERS: { label: string; value: ChantierStatus | "all" }[] = [
    { label: t("common.all"), value: "all" },
    { label: t("chantiers.statusUpcoming"), value: "a_venir" },
    { label: t("chantiers.statusInProgress"), value: "en_cours" },
    { label: t("chantiers.statusCompleted"), value: "termine" },
  ];

  const list = useQuery({
    queryKey: ["chantiers", "active", status],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (status !== "all") qs.set("status", status);
      qs.set("limit", "100");
      return apiFetch<PaginatedResponse<Chantier>>(`/chantiers?${qs}`);
    },
  });

  const summary = useUnreadSummary();

  const filtered = (list.data?.data ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("chantiers.title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {(list.data?.meta.total ?? 0) > 1
              ? t("chantiers.activeCountPlural", { count: list.data?.meta.total ?? 0 })
              : t("chantiers.activeCount", { count: list.data?.meta.total ?? 0 })}
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            {t("chantiers.new")}
          </Button>
        ) : null}
      </div>

      <CreateChantierModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => router.push(`/chantiers/${c.id}`)}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <Input
            placeholder={t("chantiers.searchPlaceholder")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (status === f.value
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <Card>
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("chantiers.empty")}
          description={search ? t("chantiers.noSearchResult") : t("chantiers.emptyDesc")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((c) => {
            const unread = summary.data?.by_chantier[c.id] ?? 0;
            return (
            <Link key={c.id} href={`/chantiers/${c.id}`}>
              <Card className="transition-colors hover:border-orange-500/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold text-zinc-900 dark:text-white">
                        {c.name}
                      </p>
                      {unread > 0 ? (
                        <span className="inline-flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </div>
                    {(c.address || c.city) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin size={12} />
                        {[c.address, c.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                  <span>
                    {t("chantiers.start")} : {formatDate(c.start_date)}
                  </span>
                  <span>•</span>
                  <span>
                    {t("chantiers.end")} : {formatDate(c.end_date)}
                  </span>
                </div>
              </Card>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
