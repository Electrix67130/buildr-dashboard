"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import MessageThread from "@/components/MessageThread";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import type { Comment, PaginatedResponse } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  chantierId: string;
  stepId: string;
  stepName: string;
  canSend?: boolean;
  canDeleteOthers?: boolean;
}

export default function StepDiscussionDialog({
  open,
  onClose,
  chantierId,
  stepId,
  stepName,
  canSend = true,
  canDeleteOthers = false,
}: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryKey = ["comments", chantierId, "step", stepId] as const;

  const list = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<PaginatedResponse<Comment>>(
        `/comments?chantier_id=${chantierId}&step_id=${stepId}&limit=100`,
      ),
    enabled: open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });
  const onError = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const create = useMutation({
    mutationFn: (content: string) =>
      apiFetch<Comment>("/comments", {
        method: "POST",
        body: { chantier_id: chantierId, step_id: stepId, content },
      }),
    onSuccess: invalidate,
    onError,
  });

  const edit = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiFetch(`/comments/${id}`, { method: "PATCH", body: { content } }),
    onSuccess: invalidate,
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/comments/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stepName}
      subtitle={t("steps.discussionSubtitle")}
      size="lg"
    >
      <MessageThread
        messages={list.data?.data ?? []}
        currentUserId={user?.id}
        isLoading={list.isLoading}
        canSend={canSend}
        canDeleteOthers={canDeleteOthers}
        placeholder={t("steps.discussionPlaceholder")}
        emptyTitle={t("steps.discussionEmpty")}
        emptyDescription={t("steps.discussionEmptyDesc")}
        onSend={(content) => create.mutate(content)}
        onEdit={(id, content) => edit.mutate({ id, content })}
        onDelete={(id) => remove.mutate(id)}
        sending={create.isPending}
      />
    </Modal>
  );
}
