"use client";

import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import EmergencyDetailDialog from "@/components/chantier/EmergencyDetailDialog";
import { useUnreadCounts, useMarkItemViewed } from "@/hooks/useChantierViews";
import type { Emergency, PaginatedResponse } from "@/types/api";

export default function Emergencies({
  chantierId,
  canCreate = false,
  canDelete = false,
  mode = "split",
}: {
  chantierId: string;
  canCreate?: boolean;
  canDelete?: boolean;
  mode?: "split" | "emergency" | "claim";
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [openEmergency, setOpenEmergency] = useState<Emergency | null>(null);
  const unread = useUnreadCounts(chantierId);
  const markItemViewed = useMarkItemViewed();
  const unreadEmergencyIds = new Set(unread.data?.unread_emergency_ids ?? []);
  // En mode 'claim' (client) → réclamation forcée. En mode 'emergency' (ouvrier) → urgence forcée.
  // En mode 'split' (admin/manager/creator) → choix libre.
  const initialType: "emergency" | "claim" = mode === "claim" ? "claim" : "emergency";
  const [form, setForm] = useState({ title: "", description: "", type: initialType });

  const list = useQuery({
    queryKey: ["emergencies", chantierId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Emergency>>(`/emergencies?chantier_id=${chantierId}&limit=100`),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/emergencies", {
        method: "POST",
        body: { chantier_id: chantierId, ...form },
      }),
    onSuccess: () => {
      setForm({ title: "", description: "", type: initialType });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["emergencies", chantierId] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/emergencies/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencies", chantierId] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    create.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate ? (
        <div className="flex justify-end">
          {showForm ? (
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} />
              {mode === "claim" ? t("emergencies.newClaim") : t("emergencies.report")}
            </Button>
          )}
        </div>
      ) : null}

      {showForm && canCreate ? (
        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {mode === "split" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t("emergencies.type")}
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as "emergency" | "claim" })
                    }
                    className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="emergency">{t("emergencies.typeEmergency")}</option>
                    <option value="claim">{t("emergencies.typeClaim")}</option>
                  </select>
                </div>
              ) : null}
              <Input
                label={t("emergencies.title")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className={mode === "split" ? "sm:col-span-2" : "sm:col-span-3"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("emergencies.description")}
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={create.isPending}>
                {t("emergencies.create")}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {list.isLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !list.data || list.data.data.length === 0 ? (
        <EmptyState title={t("emergencies.empty")} description={t("emergencies.emptyDesc")} />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.data.data.map((e) => {
              const resolved = !!e.resolved_at;
              return (
                <li key={e.id} className="group">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenEmergency(e);
                      if (unreadEmergencyIds.has(e.id)) {
                        markItemViewed.mutate({ item_type: "emergency", item_id: e.id });
                      }
                    }}
                    className="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <div
                      className={
                        "relative mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg " +
                        (resolved
                          ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                          : e.type === "emergency"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400")
                      }
                    >
                      <AlertTriangle size={18} />
                      {unreadEmergencyIds.has(e.id) ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-zinc-900 dark:text-white">{e.title}</p>
                        <Badge
                          variant={
                            resolved ? "success" : e.type === "emergency" ? "danger" : "warning"
                          }
                        >
                          {resolved
                            ? t("emergencies.resolved")
                            : e.type === "emergency"
                              ? t("emergencies.typeEmergency")
                              : t("emergencies.typeClaim")}
                        </Badge>
                      </div>
                      {e.description ? (
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {e.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-500">{formatDateTime(e.created_at)}</p>
                    </div>
                    {canDelete ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={async (ev) => {
                          ev.stopPropagation();
                          const ok = await confirm({
                            title: t("common.delete"),
                            description: t("emergencies.confirmDelete"),
                            confirmLabel: t("common.delete"),
                            tone: "danger",
                          });
                          if (ok) remove.mutate(e.id);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            ev.stopPropagation();
                            (ev.currentTarget as HTMLElement).click();
                          }
                        }}
                        className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 size={16} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {openEmergency ? (
        <EmergencyDetailDialog
          open={!!openEmergency}
          onClose={() => setOpenEmergency(null)}
          emergency={openEmergency}
          canSend
          canDeleteOthers={canDelete}
        />
      ) : null}
    </div>
  );
}
