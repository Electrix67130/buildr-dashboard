"use client";

import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import StepDiscussionDialog from "@/components/chantier/StepDiscussionDialog";
import { useUnreadCounts, useMarkItemViewed } from "@/hooks/useChantierViews";
import type { ChantierStep } from "@/types/api";

export default function Steps({
  chantierId,
  canManage = false,
  canToggle = false,
}: {
  chantierId: string;
  canManage?: boolean;
  canToggle?: boolean;
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [stepName, setStepName] = useState("");
  const [discussionStep, setDiscussionStep] = useState<{ id: string; name: string } | null>(null);
  const unread = useUnreadCounts(chantierId);
  const markItemViewed = useMarkItemViewed();
  const unreadStepIds = new Set(unread.data?.unread_step_ids ?? []);

  const list = useQuery({
    queryKey: ["chantier-steps", chantierId],
    queryFn: () => apiFetch<ChantierStep[]>(`/chantiers/${chantierId}/steps`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["chantier-steps", chantierId] });
  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : t("common.error"));

  const createStep = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/chantier-steps", { method: "POST", body: { chantier_id: chantierId, name } }),
    onSuccess: () => {
      setStepName("");
      invalidate();
    },
    onError,
  });

  const removeStep = useMutation({
    mutationFn: (id: string) => apiFetch(`/chantier-steps/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError,
  });

  const toggleStep = useMutation({
    mutationFn: ({ id, validated }: { id: string; validated: boolean }) =>
      apiFetch(`/chantier-steps/${id}/toggle`, { method: "POST", body: { validated } }),
    onSuccess: invalidate,
    onError,
  });

  const toggleSubstep = useMutation({
    mutationFn: ({ id, validated }: { id: string; validated: boolean }) =>
      apiFetch(`/chantier-substeps/${id}/toggle`, { method: "POST", body: { validated } }),
    onSuccess: invalidate,
    onError,
  });

  const createSubstep = useMutation({
    mutationFn: ({ stepId, name }: { stepId: string; name: string }) =>
      apiFetch("/chantier-substeps", { method: "POST", body: { step_id: stepId, name } }),
    onSuccess: invalidate,
    onError,
  });

  const removeSubstep = useMutation({
    mutationFn: (id: string) => apiFetch(`/chantier-substeps/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError,
  });

  function onSubmitStep(e: FormEvent) {
    e.preventDefault();
    if (!stepName.trim()) return;
    createStep.mutate(stepName.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <form
          onSubmit={onSubmitStep}
          className="flex gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <Input
            placeholder={t("steps.namePlaceholder")}
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!stepName.trim()} loading={createStep.isPending}>
            <Plus size={16} />
            {t("steps.add")}
          </Button>
        </form>
      ) : null}

      {list.isLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState title={t("steps.empty")} description={t("steps.emptyDesc")} />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.data.map((step) => (
              <StepItem
                key={step.id}
                step={step}
                canManage={canManage}
                canToggle={canToggle}
                hasUnread={unreadStepIds.has(step.id)}
                onToggle={(id, validated) => toggleStep.mutate({ id, validated })}
                onRemove={(id) => removeStep.mutate(id)}
                onAddSubstep={(stepId, name) => createSubstep.mutate({ stepId, name })}
                onToggleSubstep={(id, validated) => toggleSubstep.mutate({ id, validated })}
                onRemoveSubstep={(id) => removeSubstep.mutate(id)}
                onOpenDiscussion={() => {
                  setDiscussionStep({ id: step.id, name: step.name });
                  if (unreadStepIds.has(step.id)) {
                    markItemViewed.mutate({ item_type: "step", item_id: step.id });
                  }
                }}
              />
            ))}
          </ul>
        </Card>
      )}

      <StepDiscussionDialog
        open={!!discussionStep}
        onClose={() => setDiscussionStep(null)}
        chantierId={chantierId}
        stepId={discussionStep?.id ?? ""}
        stepName={discussionStep?.name ?? ""}
        canSend
        canDeleteOthers={canManage}
      />
    </div>
  );
}

function StepItem({
  step,
  canManage,
  canToggle,
  hasUnread,
  onToggle,
  onRemove,
  onAddSubstep,
  onToggleSubstep,
  onRemoveSubstep,
  onOpenDiscussion,
}: {
  step: ChantierStep;
  canManage: boolean;
  canToggle: boolean;
  hasUnread: boolean;
  onToggle: (id: string, validated: boolean) => void;
  onRemove: (id: string) => void;
  onAddSubstep: (stepId: string, name: string) => void;
  onToggleSubstep: (id: string, validated: boolean) => void;
  onRemoveSubstep: (id: string) => void;
  onOpenDiscussion: () => void;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [substepName, setSubstepName] = useState("");
  const validated = !!step.validated_at;

  return (
    <li className="group px-6 py-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => canToggle && onToggle(step.id, !validated)}
          disabled={!canToggle}
          className={cn(
            "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors",
            !canToggle && "cursor-default",
            validated
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" +
                  (canToggle ? " hover:bg-emerald-200" : "")
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800" +
                  (canToggle ? " hover:bg-zinc-200 dark:hover:bg-zinc-700" : ""),
          )}
          aria-label={validated ? t("emergencies.resolved") : t("common.confirm")}
        >
          {validated ? <Check size={14} /> : <Circle size={14} />}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium",
              validated ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-white",
            )}
          >
            {step.name}
          </p>
          {step.substeps && step.substeps.length > 0 ? (
            <ul className="mt-2 space-y-1.5 pl-1">
              {step.substeps.map((s) => (
                <li key={s.id} className="group/sub flex items-center gap-2 text-sm">
                  <button
                    onClick={() => canToggle && onToggleSubstep(s.id, !s.validated_at)}
                    disabled={!canToggle}
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                      !canToggle && "cursor-default",
                      !!s.validated_at
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 dark:border-zinc-700" +
                            (canToggle ? " hover:border-emerald-500" : ""),
                    )}
                  >
                    {!!s.validated_at ? <Check size={10} /> : null}
                  </button>
                  <span
                    className={cn(
                      "flex-1",
                      !!s.validated_at ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {s.name}
                  </span>
                  {canManage ? (
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: t("common.delete"),
                          description: t("steps.confirmDeleteSubstep"),
                          confirmLabel: t("common.delete"),
                          tone: "danger",
                        });
                        if (ok) onRemoveSubstep(s.id);
                      }}
                      className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-600 group-hover/sub:opacity-100"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {canManage ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!substepName.trim()) return;
              onAddSubstep(step.id, substepName.trim());
              setSubstepName("");
            }}
            className="mt-2 flex gap-2"
          >
            <input
              type="text"
              placeholder={t("steps.addSubstepPlaceholder")}
              value={substepName}
              onChange={(e) => setSubstepName(e.target.value)}
              className="flex-1 rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-300"
            />
            {substepName.trim() ? (
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-2 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
              >
                <Plus size={12} />
              </button>
            ) : null}
          </form>
          ) : null}
        </div>
        <button
          onClick={onOpenDiscussion}
          className={cn(
            "relative rounded-lg p-1.5 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
            hasUnread
              ? "text-orange-600 dark:text-orange-400"
              : "text-zinc-400 opacity-0 group-hover:opacity-100",
          )}
          aria-label={t("steps.openDiscussion")}
          title={t("steps.openDiscussion")}
        >
          <MessageSquare size={14} />
          {hasUnread ? (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900" />
          ) : null}
        </button>
        {canManage ? (
          <button
            onClick={async () => {
              const ok = await confirm({
                title: t("common.delete"),
                description: t("steps.confirmDelete"),
                confirmLabel: t("common.delete"),
                tone: "danger",
              });
              if (ok) onRemove(step.id);
            }}
            className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20"
            aria-label={t("common.delete")}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </li>
  );
}
