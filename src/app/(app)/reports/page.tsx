"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import ReportList from "@/components/reports/ReportList";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useReports, type ReportStatus } from "@/hooks/useReports";

/** Signalements de l'organisation : reserve a ses administrateurs. */
export default function ReportsPage() {
  const { t } = useI18n();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<ReportStatus | "">("pending");
  const isAdmin = user?.role === "admin";
  const list = useReports({ status }, isAdmin);

  useEffect(() => {
    if (!authLoading && user && !isAdmin) router.replace("/dashboard");
  }, [authLoading, user, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("reports.title")}</h1>
        <p className="text-sm text-zinc-500">{t("reports.subtitle")}</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select label={t("reports.filterStatus")} value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | "")}>
            <option value="pending">{t("reports.status.pending")}</option>
            <option value="resolved">{t("reports.status.resolved")}</option>
            <option value="dismissed">{t("reports.status.dismissed")}</option>
            <option value="">{t("common.all")}</option>
          </Select>
          <div className="flex items-end text-sm text-zinc-500 md:col-span-2">
            {t("reports.pendingCount", { count: list.data?.counts.pending ?? 0 })}
          </div>
        </div>
      </Card>

      <ReportList reports={list.data?.data ?? []} isLoading={list.isLoading} />
    </div>
  );
}
