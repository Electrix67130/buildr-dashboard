"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import MessageThread from "@/components/MessageThread";
import ReportDialog, { type ReportDialogTarget } from "@/components/reports/ReportDialog";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import type { Emergency, EmergencyComment, PaginatedResponse } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  emergency: Emergency;
  canSend?: boolean;
  canDeleteOthers?: boolean;
}

export default function EmergencyDetailDialog({
  open,
  onClose,
  emergency,
  canSend = true,
  canDeleteOthers = false,
}: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryKey = ["emergency-comments", emergency.id] as const;
  const [reportTarget, setReportTarget] = useState<ReportDialogTarget | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Toutes les photos de l'urgence ; les anciennes n'ont que photo_url.
  const photos =
    emergency.photos && emergency.photos.length > 0
      ? emergency.photos
      : emergency.photo_url
        ? [{ id: "legacy", url: emergency.photo_url, thumbnail_url: null, created_at: emergency.created_at }]
        : [];

  const list = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<PaginatedResponse<EmergencyComment>>(
        `/emergency-comments?emergency_id=${emergency.id}&limit=100`,
      ),
    enabled: open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });
  const onError = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const create = useMutation({
    mutationFn: (content: string) =>
      apiFetch<EmergencyComment>("/emergency-comments", {
        method: "POST",
        body: { emergency_id: emergency.id, content },
      }),
    onSuccess: invalidate,
    onError,
  });

  const edit = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiFetch(`/emergency-comments/${id}`, { method: "PATCH", body: { content } }),
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/emergency-comments/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError,
  });

  const resolved = !!emergency.resolved_at;
  const tone: "danger" | "warning" | "success" = resolved
    ? "success"
    : emergency.type === "emergency"
      ? "danger"
      : "warning";

  return (
    <Modal open={open} onClose={onClose} title={emergency.title} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div
            className={
              "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg " +
              (resolved
                ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                : emergency.type === "emergency"
                  ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400")
            }
          >
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={tone}>
                {resolved
                  ? t("emergencies.resolved")
                  : emergency.type === "emergency"
                    ? t("emergencies.typeEmergency")
                    : t("emergencies.typeClaim")}
              </Badge>
              <span className="text-xs text-zinc-500">
                {formatDateTime(emergency.created_at)}
              </span>
            </div>
            {emergency.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {emergency.description}
              </p>
            ) : null}
            {photos.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightbox(p.url)}
                    className="h-24 w-24 overflow-hidden rounded-lg border border-zinc-200 transition-opacity hover:opacity-80 dark:border-zinc-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbnail_url ?? p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {lightbox ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
            <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label={t("common.close")}>
              <X size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
            {t("emergencies.thread")}
          </h3>
          <MessageThread
            messages={list.data?.data ?? []}
            currentUserId={user?.id}
            isLoading={list.isLoading}
            canSend={canSend}
            canDeleteOthers={canDeleteOthers}
            placeholder={t("emergencies.threadPlaceholder")}
            emptyTitle={t("emergencies.threadEmpty")}
            emptyDescription={t("emergencies.threadEmptyDesc")}
            onSend={(content) => create.mutate(content)}
            onEdit={(id, content) => edit.mutate({ id, content })}
            onDelete={(id) => remove.mutate(id)}
            onReport={(msg) => setReportTarget({ type: "emergency_comment", id: msg.id, label: `${msg.first_name} ${msg.last_name} : ${msg.content.slice(0, 120)}` })}
            sending={create.isPending}
          />
        </div>
      </div>
      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />
    </Modal>
  );
}
