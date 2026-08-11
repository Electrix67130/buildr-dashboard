"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import CreateTemplateModal from "@/components/templates/CreateTemplateModal";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import type { ChantierTemplate } from "@/types/api";

export default function TemplatesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const canCreate = user?.role === "admin" || user?.role === "manager";
  const [createOpen, setCreateOpen] = useState(false);

  const list = useQuery({
    queryKey: ["chantier-templates"],
    queryFn: () => apiFetch<ChantierTemplate[]>("/chantier-templates"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("templates.title")}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("templates.subtitle")}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            {t("templates.new")}
          </Button>
        ) : null}
      </div>

      <CreateTemplateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {list.isLoading ? (
        <Card>
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        </Card>
      ) : list.data && list.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {list.data.map((tpl) => (
            <Card key={tpl.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 dark:text-white">{tpl.name}</p>
                  {tpl.description ? (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tpl.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    {t("templates.createdOn", { date: formatDate(tpl.created_at) })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText size={32} />}
          title={t("templates.empty")}
          description={canCreate ? t("templates.emptyDescCreate") : t("templates.emptyDesc")}
        />
      )}
    </div>
  );
}
