"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MessageThread from "@/components/MessageThread";
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

  const list = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<PaginatedResponse<Comment>>(`/comments?chantier_id=${chantierId}&limit=100`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });
  const onError = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const create = useMutation({
    mutationFn: (content: string) =>
      apiFetch<Comment>("/comments", {
        method: "POST",
        body: { chantier_id: chantierId, content, step_id: null },
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
      onSend={(content) => create.mutate(content)}
      onEdit={(id, content) => edit.mutate({ id, content })}
      onDelete={(id) => remove.mutate(id)}
      sending={create.isPending}
    />
  );
}
