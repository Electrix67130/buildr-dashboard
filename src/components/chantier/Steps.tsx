"use client";

import { useState, useRef, FormEvent, ChangeEvent, DragEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Plus, Trash2, MessageSquare, GripVertical, Camera, X } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import StepDiscussionDialog from "@/components/chantier/StepDiscussionDialog";
import { useUnreadCounts, useMarkItemViewed } from "@/hooks/useChantierViews";
import type { ChantierStep, ChantierSubstep, StepPhoto } from "@/types/api";

/** Ce qu'on est en train de glisser : une etape, ou une sous-etape d'une etape donnee. */
type Dragging = { kind: "step"; id: string } | { kind: "substep"; id: string; stepId: string };

/** Cible d'un ajout de photo : une etape ou une sous-etape. */
type PhotoTarget = { kind: "step"; id: string } | { kind: "substep"; id: string };

/** Deplace `id` juste avant `beforeId` dans la liste d'identifiants. */
function moveBefore(ids: string[], id: string, beforeId: string): string[] {
  if (id === beforeId) return ids;
  const without = ids.filter((x) => x !== id);
  const at = without.indexOf(beforeId);
  without.splice(at, 0, id);
  return without;
}

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
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unread = useUnreadCounts(chantierId);
  const markItemViewed = useMarkItemViewed();
  const unreadStepIds = new Set(unread.data?.unread_step_ids ?? []);

  const stepsKey = ["chantier-steps", chantierId];
  const list = useQuery({
    queryKey: stepsKey,
    queryFn: () => apiFetch<ChantierStep[]>(`/chantiers/${chantierId}/steps`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: stepsKey });
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

  // Reordonnancement : l'ordre local change tout de suite, l'API suit. Si
  // elle refuse, on relit et l'ordre d'origine revient.
  const reorderSteps = useMutation({
    mutationFn: (ordered_ids: string[]) =>
      apiFetch(`/chantiers/${chantierId}/steps/reorder`, { method: "POST", body: { ordered_ids } }),
    onMutate: (ordered_ids) => {
      qc.setQueryData<ChantierStep[]>(stepsKey, (prev) => {
        if (!prev) return prev;
        const byId = new Map(prev.map((s) => [s.id, s]));
        return ordered_ids.map((id) => byId.get(id)).filter((s): s is ChantierStep => !!s);
      });
    },
    onError: (err) => {
      onError(err);
      invalidate();
    },
    onSettled: invalidate,
  });

  const reorderSubsteps = useMutation({
    mutationFn: ({ stepId, ordered_ids }: { stepId: string; ordered_ids: string[] }) =>
      apiFetch(`/chantier-steps/${stepId}/substeps/reorder`, { method: "POST", body: { ordered_ids } }),
    onMutate: ({ stepId, ordered_ids }) => {
      qc.setQueryData<ChantierStep[]>(stepsKey, (prev) =>
        prev?.map((s) => {
          if (s.id !== stepId || !s.substeps) return s;
          const byId = new Map(s.substeps.map((x) => [x.id, x]));
          return { ...s, substeps: ordered_ids.map((id) => byId.get(id)).filter((x): x is ChantierSubstep => !!x) };
        }),
      );
    },
    onError: (err) => {
      onError(err);
      invalidate();
    },
    onSettled: invalidate,
  });

  function onDropOnStep(targetStepId: string) {
    if (!dragging || dragging.kind !== "step" || !list.data) return;
    const ids = list.data.map((s) => s.id);
    const next = moveBefore(ids, dragging.id, targetStepId);
    setDragging(null);
    if (next.join() !== ids.join()) reorderSteps.mutate(next);
  }

  function onDropOnSubstep(stepId: string, targetSubstepId: string) {
    if (!dragging || dragging.kind !== "substep" || dragging.stepId !== stepId || !list.data) return;
    const step = list.data.find((s) => s.id === stepId);
    if (!step?.substeps) return;
    const ids = step.substeps.map((s) => s.id);
    const next = moveBefore(ids, dragging.id, targetSubstepId);
    setDragging(null);
    if (next.join() !== ids.join()) reorderSubsteps.mutate({ stepId, ordered_ids: next });
  }

  function askPhoto(target: PhotoTarget) {
    setPhotoTarget(target);
    fileInputRef.current?.click();
  }

  async function onPhotoChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = photoTarget;
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !target) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      await apiFetch("/photos", {
        method: "POST",
        body: {
          chantier_id: chantierId,
          url: uploaded.url,
          file_size: uploaded.file_size,
          mime_type: uploaded.mime_type,
          taken_at: new Date().toISOString(),
          ...(target.kind === "step" ? { step_id: target.id } : { substep_id: target.id }),
        },
      });
      invalidate();
      qc.invalidateQueries({ queryKey: ["photos", chantierId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.uploadError"));
    } finally {
      setUploading(false);
      setPhotoTarget(null);
    }
  }

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

      {canManage ? (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChosen} />
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
                dragging={dragging}
                uploading={uploading}
                onDragStart={setDragging}
                onDragEnd={() => setDragging(null)}
                onDropOnStep={() => onDropOnStep(step.id)}
                onDropOnSubstep={(substepId) => onDropOnSubstep(step.id, substepId)}
                onToggle={(id, validated) => toggleStep.mutate({ id, validated })}
                onRemove={(id) => removeStep.mutate(id)}
                onAddSubstep={(stepId, name) => createSubstep.mutate({ stepId, name })}
                onToggleSubstep={(id, validated) => toggleSubstep.mutate({ id, validated })}
                onRemoveSubstep={(id) => removeSubstep.mutate(id)}
                onAttachPhoto={askPhoto}
                onOpenPhoto={setLightbox}
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

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}

function PhotoStrip({
  photos,
  onOpen,
  small,
}: {
  photos: StepPhoto[] | undefined;
  onOpen: (url: string) => void;
  small?: boolean;
}) {
  const { t } = useI18n();
  if (!photos || photos.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t("steps.stepPhotos")}>
      {photos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p.url)}
          className={cn(
            "overflow-hidden rounded-md border border-zinc-200 transition-opacity hover:opacity-80 dark:border-zinc-700",
            small ? "h-9 w-9" : "h-12 w-12",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumbnail_url ?? p.url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}

function StepItem({
  step,
  canManage,
  canToggle,
  hasUnread,
  dragging,
  uploading,
  onDragStart,
  onDragEnd,
  onDropOnStep,
  onDropOnSubstep,
  onToggle,
  onRemove,
  onAddSubstep,
  onToggleSubstep,
  onRemoveSubstep,
  onAttachPhoto,
  onOpenPhoto,
  onOpenDiscussion,
}: {
  step: ChantierStep;
  canManage: boolean;
  canToggle: boolean;
  hasUnread: boolean;
  dragging: Dragging | null;
  uploading: boolean;
  onDragStart: (d: Dragging) => void;
  onDragEnd: () => void;
  onDropOnStep: () => void;
  onDropOnSubstep: (substepId: string) => void;
  onToggle: (id: string, validated: boolean) => void;
  onRemove: (id: string) => void;
  onAddSubstep: (stepId: string, name: string) => void;
  onToggleSubstep: (id: string, validated: boolean) => void;
  onRemoveSubstep: (id: string) => void;
  onAttachPhoto: (target: PhotoTarget) => void;
  onOpenPhoto: (url: string) => void;
  onOpenDiscussion: () => void;
}) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [substepName, setSubstepName] = useState("");
  const [overStep, setOverStep] = useState(false);
  const [overSubstep, setOverSubstep] = useState<string | null>(null);
  const validated = !!step.validated_at;
  const isDraggedStep = dragging?.kind === "step" && dragging.id === step.id;

  const allow = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const attachButton = (target: PhotoTarget, tiny?: boolean) =>
    canManage ? (
      <button
        type="button"
        onClick={() => onAttachPhoto(target)}
        disabled={uploading}
        className={cn(
          "rounded-lg text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-wait dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
          tiny ? "p-1 group-hover/sub:opacity-100" : "p-1.5 group-hover:opacity-100",
        )}
        aria-label={t("steps.attachPhoto")}
        title={t("steps.attachPhoto")}
      >
        <Camera size={tiny ? 12 : 14} />
      </button>
    ) : null;

  return (
    <li
      className={cn(
        "group px-6 py-4 transition-colors",
        isDraggedStep && "opacity-40",
        overStep && dragging?.kind === "step" && !isDraggedStep && "border-t-2 border-orange-500",
      )}
      draggable={canManage}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart({ kind: "step", id: step.id });
      }}
      onDragEnd={() => {
        setOverStep(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        if (dragging?.kind !== "step") return;
        allow(e);
        setOverStep(true);
      }}
      onDragLeave={() => setOverStep(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOverStep(false);
        onDropOnStep();
      }}
    >
      <div className="flex items-start gap-3">
        {canManage ? (
          <span
            className="mt-0.5 cursor-grab text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing dark:text-zinc-600"
            title={t("steps.dragToReorder")}
            aria-hidden
          >
            <GripVertical size={16} />
          </span>
        ) : null}
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
          <PhotoStrip photos={step.photos} onOpen={onOpenPhoto} />
          {step.substeps && step.substeps.length > 0 ? (
            <ul className="mt-2 space-y-1.5 pl-1">
              {step.substeps.map((s: ChantierSubstep) => {
                const isDragged = dragging?.kind === "substep" && dragging.id === s.id;
                const isOver =
                  overSubstep === s.id && dragging?.kind === "substep" && dragging.stepId === step.id && !isDragged;
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "group/sub flex items-start gap-2 text-sm transition-opacity",
                      isDragged && "opacity-40",
                      isOver && "border-t-2 border-orange-500",
                    )}
                    draggable={canManage}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      onDragStart({ kind: "substep", id: s.id, stepId: step.id });
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      setOverSubstep(null);
                      onDragEnd();
                    }}
                    onDragOver={(e) => {
                      if (dragging?.kind !== "substep" || dragging.stepId !== step.id) return;
                      e.stopPropagation();
                      allow(e);
                      setOverSubstep(s.id);
                    }}
                    onDragLeave={() => setOverSubstep(null)}
                    onDrop={(e) => {
                      if (dragging?.kind !== "substep") return;
                      e.preventDefault();
                      e.stopPropagation();
                      setOverSubstep(null);
                      onDropOnSubstep(s.id);
                    }}
                  >
                    {canManage ? (
                      <span
                        className="mt-0.5 cursor-grab text-zinc-300 opacity-0 transition-opacity group-hover/sub:opacity-100 active:cursor-grabbing dark:text-zinc-600"
                        title={t("steps.dragToReorder")}
                        aria-hidden
                      >
                        <GripVertical size={12} />
                      </span>
                    ) : null}
                    <button
                      onClick={() => canToggle && onToggleSubstep(s.id, !s.validated_at)}
                      disabled={!canToggle}
                      className={cn(
                        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                        !canToggle && "cursor-default",
                        !!s.validated_at
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-zinc-300 dark:border-zinc-700" +
                              (canToggle ? " hover:border-emerald-500" : ""),
                      )}
                    >
                      {!!s.validated_at ? <Check size={10} /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          !!s.validated_at ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {s.name}
                      </span>
                      <PhotoStrip photos={s.photos} onOpen={onOpenPhoto} small />
                    </div>
                    {attachButton({ kind: "substep", id: s.id }, true)}
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
                );
              })}
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
        {attachButton({ kind: "step", id: step.id })}
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
