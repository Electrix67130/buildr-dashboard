"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import ReportList from "@/components/reports/ReportList";
import { useI18n } from "@/contexts/I18nContext";
import { useAllReports, type ReportStatus } from "@/hooks/useReports";

/** Console : tous les signalements, avec ceux qui visent un administrateur en tete. */
export default function AdminReportsPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ReportStatus | "">("pending");
  const [escalatedOnly, setEscalatedOnly] = useState(true);
  const list = useAllReports({ status, escalated: escalatedOnly });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("admin.reports")}</h1>
        <p className="text-sm text-zinc-500">{t("reports.adminSubtitle")}</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select label={t("reports.filterStatus")} value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | "")}>
            <option value="pending">{t("reports.status.pending")}</option>
            <option value="resolved">{t("reports.status.resolved")}</option>
            <option value="dismissed">{t("reports.status.dismissed")}</option>
            <option value="">{t("common.all")}</option>
          </Select>
          <label className="flex cursor-pointer items-end gap-2 pb-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={escalatedOnly}
              onChange={(e) => setEscalatedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
            />
            {t("reports.escalatedOnly")}
          </label>
          <div className="flex items-end pb-2 text-sm text-zinc-500">{t("reports.pendingCount", { count: list.data?.counts.pending ?? 0 })}</div>
        </div>
      </Card>

      <ReportList reports={list.data?.data ?? []} isLoading={list.isLoading} showOrganization />
    </div>
  );
}
