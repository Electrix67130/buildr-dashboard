"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Building2, Users, Archive, FileText } from "lucide-react";
import Card from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import type { Chantier, User, PaginatedResponse } from "@/types/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const chantiers = useQuery({
    queryKey: ["chantiers", "active"],
    queryFn: () => apiFetch<PaginatedResponse<Chantier>>("/chantiers?limit=5"),
  });

  const archives = useQuery({
    queryKey: ["chantiers", "archives", "count"],
    queryFn: () => apiFetch<PaginatedResponse<Chantier>>("/chantiers/archives?limit=1"),
  });

  const members = useQuery({
    queryKey: ["users", "count"],
    queryFn: () => apiFetch<PaginatedResponse<User>>("/users?limit=1"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {t("dashboard.greeting", { name: user?.first_name ?? "" })}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 size={20} />}
          label={t("dashboard.activeChantiers")}
          value={chantiers.data?.meta.total ?? "—"}
          href="/chantiers"
        />
        <StatCard
          icon={<Archive size={20} />}
          label={t("dashboard.archivedChantiers")}
          value={archives.data?.meta.total ?? "—"}
          href="/archives"
        />
        <StatCard
          icon={<Users size={20} />}
          label={t("dashboard.members")}
          value={members.data?.meta.total ?? "—"}
          href="/team"
        />
        <StatCard
          icon={<FileText size={20} />}
          label={t("dashboard.templates")}
          value="—"
          href="/templates"
        />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {t("dashboard.recentChantiers")}
          </h2>
          <Link
            href="/chantiers"
            className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>

        {chantiers.isLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : chantiers.data && chantiers.data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {chantiers.data.data.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/chantiers/${c.id}`}
                  className="flex items-center justify-between py-3 hover:opacity-70"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-zinc-500">
                      {[c.address, c.city].filter(Boolean).join(", ") || t("dashboard.noAddress")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">{t("dashboard.noChantier")}</p>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-orange-500/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
          </div>
          <div className="text-orange-600 dark:text-orange-400">{icon}</div>
        </div>
      </Card>
    </Link>
  );
}
