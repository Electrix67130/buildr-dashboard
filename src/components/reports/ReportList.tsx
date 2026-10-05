"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, MessageSquare, Image as ImageIcon, User, ExternalLink, Trash2, Ban, Check, X, ShieldAlert } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import type { Report } from "@/hooks/useReports";

const TARGET_ICON = { comment: MessageSquare, emergency_comment: MessageSquare, photo: ImageIcon, user: User } as const;

export default function ReportList({
  reports,
  isLoading,
  showOrganization = false,
}: {
  reports: Report[];
  isLoading?: boolean;
  /** Console : le nom de l'organisation sur chaque ligne. */
  showOrganization?: boolean;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [resolving, setResolving] = useState<Report | null>(null);
  const [note, setNote] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reports"] });
  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const resolve = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "resolved" | "dismissed"; note?: string }) =>
      apiFetch(`/reports/${id}`, { method: "PATCH", body: { status, resolution_note: note || undefined } }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "resolved" ? t("reports.resolvedToast") : t("reports.dismissedToast"));
      setResolving(null);
      setNote("");
      invalidate();
    },
    onError,
  });

  const deleteContent = useMutation({
    mutationFn: (r: Report) =>
      apiFetch(`/${r.target_type === "comment" ? "comments" : r.target_type === "emergency_comment" ? "emergency-comments" : "photos"}/${r.target_id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("reports.contentDeleted"));
      invalidate();
      qc.invalidateQueries({ queryKey: ["comments"] });
      qc.invalidateQueries({ queryKey: ["emergency-comments"] });
      qc.invalidateQueries({ queryKey: ["photos"] });
    },
    onError,
  });

  const deactivate = useMutation({
    mutationFn: (userId: string) => apiFetch(`/users/${userId}`, { method: "PATCH", body: { is_active: false } }),
    onSuccess: () => {
      toast.success(t("reports.accountDeactivated"));
      invalidate();
    },
    onError,
  });

  if (isLoading) return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  if (reports.length === 0) return <EmptyState title={t("reports.empty")} description={t("reports.emptyDesc")} />;

  return (
    <>
      <div className="space-y-3">
        {reports.map((r) => {
          const Icon = TARGET_ICON[r.target_type];
          const pending = r.status === "pending";
          const targetName = r.target_first_name ? `${r.target_first_name} ${r.target_last_name}` : t("reports.unknownUser");
          return (
            <Card key={r.id} className={pending ? "border-orange-200 dark:border-orange-900/50" : ""}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="danger">{t(`reports.reason.${r.reason}`)}</Badge>
                    <Badge variant="default">{t(`reports.target.${r.target_type}`)}</Badge>
                    {r.escalated ? (
                      <Badge variant="warning">
                        <ShieldAlert size={12} className="mr-1 inline" />
                        {t("reports.escalated")}
                      </Badge>
                    ) : null}
                    {!pending ? (
                      <Badge variant={r.status === "resolved" ? "success" : "default"}>{t(`reports.status.${r.status}`)}</Badge>
                    ) : null}
                    <span className="text-xs text-zinc-500">{formatDateTime(r.created_at)}</span>
                  </div>

                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {t("reports.reportedBy", { name: `${r.reporter_first_name} ${r.reporter_last_name}` })}
                    {" · "}
                    {t("reports.about", { name: targetName })}
                    {r.chantier_name ? (
                      <>
                        {" · "}
                        <Link href={`/chantiers/${r.chantier_id}`} className="font-medium text-orange-600 hover:underline dark:text-orange-400">
                          {r.chantier_name}
                        </Link>
                      </>
                    ) : null}
                    {showOrganization ? <span className="text-zinc-500"> · {r.organization_name}</span> : null}
                  </p>

                  {r.target_excerpt ? (
                    <blockquote className="mt-2 rounded-md border-l-2 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <span className="line-clamp-3 whitespace-pre-wrap">{r.target_excerpt}</span>
                      {!r.target_exists ? <span className="mt-1 block text-xs italic text-zinc-500">{t("reports.targetGone")}</span> : null}
                    </blockquote>
                  ) : null}
                  {r.comment ? <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">« {r.comment} »</p> : null}
                  {r.resolution_note ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      {t("reports.note")} : {r.resolution_note}
                    </p>
                  ) : null}
                </div>
              </div>

              {pending ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {r.chantier_id ? (
                    <Link href={`/chantiers/${r.chantier_id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink size={14} />
                        {t("reports.openChantier")}
                      </Button>
                    </Link>
                  ) : null}
                  {r.target_type !== "user" && r.target_exists ? (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={deleteContent.isPending}
                      onClick={async () => {
                        const ok = await confirm({ title: t("reports.deleteContent"), description: t("reports.deleteContentConfirm"), confirmLabel: t("common.delete"), tone: "danger" });
                        if (ok) deleteContent.mutate(r);
                      }}
                    >
                      <Trash2 size={14} />
                      {t("reports.deleteContent")}
                    </Button>
                  ) : null}
                  {r.target_user_id ? (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={deactivate.isPending}
                      onClick={async () => {
                        const ok = await confirm({ title: t("reports.deactivateAccount"), description: t("reports.deactivateConfirm", { name: targetName }), confirmLabel: t("admin.deactivate"), tone: "danger" });
                        if (ok) deactivate.mutate(r.target_user_id!);
                      }}
                    >
                      <Ban size={14} />
                      {t("reports.deactivateAccount")}
                    </Button>
                  ) : null}
                  <span className="flex-1" />
                  <Button variant="secondary" size="sm" onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })} loading={resolve.isPending}>
                    <X size={14} />
                    {t("reports.dismiss")}
                  </Button>
                  <Button size="sm" onClick={() => setResolving(r)}>
                    <Check size={14} />
                    {t("reports.markResolved")}
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!resolving}
        onClose={() => setResolving(null)}
        title={t("reports.markResolved")}
        subtitle={t("reports.noteOptional")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResolving(null)}>{t("common.cancel")}</Button>
            <Button loading={resolve.isPending} onClick={() => resolving && resolve.mutate({ id: resolving.id, status: "resolved", note: note.trim() })}>
              <Flag size={14} />
              {t("reports.markResolved")}
            </Button>
          </div>
        }
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("reports.notePlaceholder")} />
      </Modal>
    </>
  );
}
