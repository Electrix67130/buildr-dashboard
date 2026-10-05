"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import type { ReportReason, ReportTarget } from "@/hooks/useReports";

export interface ReportDialogTarget {
  type: ReportTarget;
  id: string;
  /** Ce qu'on signale, rappele dans la fenetre. */
  label: string;
}

/**
 * Signaler un message, une photo ou un membre. Le signalement part a
 * l'administrateur de l'organisation, jamais a la personne visee : la
 * fenetre le dit, pour que personne n'hesite par crainte d'une confrontation.
 */
export default function ReportDialog({ target, onClose }: { target: ReportDialogTarget | null; onClose: () => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason>("inappropriate");
  const [comment, setComment] = useState("");

  const send = useMutation({
    mutationFn: () =>
      apiFetch("/reports", {
        method: "POST",
        body: { target_type: target!.type, target_id: target!.id, reason, comment: comment.trim() || undefined },
      }),
    onSuccess: () => {
      toast.success(t("report.sent"));
      setComment("");
      setReason("inappropriate");
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={t("report.title")}
      subtitle={target?.label}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="danger" loading={send.isPending} onClick={() => send.mutate()}>
            <Flag size={14} />
            {t("report.send")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Select label={t("report.reason")} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          <option value="inappropriate">{t("reports.reason.inappropriate")}</option>
          <option value="harassment">{t("reports.reason.harassment")}</option>
          <option value="off_topic">{t("reports.reason.off_topic")}</option>
          <option value="other">{t("reports.reason.other")}</option>
        </Select>
        <Textarea label={t("report.commentOptional")} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={t("report.commentPlaceholder")} />
        <p className="text-xs text-zinc-500">{t("report.hint")}</p>
      </div>
    </Modal>
  );
}
