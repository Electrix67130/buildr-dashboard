"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MessageThread from "@/components/MessageThread";
import ReportDialog, { type ReportDialogTarget } from "@/components/reports/ReportDialog";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import type { Comment, PaginatedResponse } from "@/types/api";

export default function Discussions({
  chantierId,
  canSend = true,
  canDeleteOthers = false,
}: {
  chantierId: string;
  canSend?: boolean;
  canDeleteOthers?: boolean;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const queryKey = ["comments", chantierId, "chantier-level"] as const;
  const [reportTarget, setReportTarget] = useState<ReportDialogTarget | null>(null);

  const list = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<PaginatedResponse<Comment>>(`/comments?chantier_id=${chantierId}&limit=100`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });
  const onError = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const create = useMutation({
    mutationFn: ({ content, replyToId }: { content: string; replyToId?: string }) =>
      apiFetch<Comment>("/comments", {
        method: "POST",
        body: { chantier_id: chantierId, content, step_id: null, reply_to_id: replyToId ?? null },
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

  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      apiFetch(`/comments/${id}/reactions`, { method: "POST", body: { emoji } }),
    onSuccess: invalidate,
    onError,
  });

  const block = useMutation({
    mutationFn: (userId: string) => apiFetch("/blocks", { method: "POST", body: { user_id: userId } }),
    onSuccess: () => {
      toast.success(t("block.done"));
      qc.invalidateQueries({ queryKey: ["comments"] });
      qc.invalidateQueries({ queryKey: ["photos"] });
      qc.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/comments/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError,
  });

  // Filtrer pour ne garder que les commentaires sans step_id (discussion chantier).
  const messages = (list.data?.data ?? []).filter((c) => !c.step_id);

  return (
    <MessageThread
      messages={messages}
      currentUserId={user?.id}
      isLoading={list.isLoading}
      canSend={canSend}
      canDeleteOthers={canDeleteOthers}
      placeholder={t("discussions.placeholder")}
      onSend={(content, replyToId) => create.mutate({ content, replyToId })}
      onReact={(id, emoji) => react.mutate({ id, emoji })}
        onBlock={(userId) => block.mutate(userId)}
      onEdit={(id, content) => edit.mutate({ id, content })}
      onDelete={(id) => remove.mutate(id)}
      onReport={(msg) => setReportTarget({ type: "comment", id: msg.id, label: `${msg.first_name} ${msg.last_name} : ${msg.content.slice(0, 120)}` })}
      sending={create.isPending}
    />
  );
}
