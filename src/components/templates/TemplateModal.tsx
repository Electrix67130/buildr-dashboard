"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, GripVertical } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import type { ChantierStatus, ChantierTemplate } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Modele a editer. Absent ou null : le modal cree un nouveau modele. */
  template?: ChantierTemplate | null;
  onSaved?: (template: ChantierTemplate) => void;
}

interface SubstepDraft {
  key: string;
  name: string;
}

interface StepDraft {
  key: string;
  name: string;
  substeps: SubstepDraft[];
}

const makeStep = (): StepDraft => ({
  key: crypto.randomUUID(),
  name: "",
  substeps: [],
});

const makeSubstep = (): SubstepDraft => ({
  key: crypto.randomUUID(),
  name: "",
});

export default function TemplateModal({ open, onClose, template, onSaved }: Props) {
  const isEdit = Boolean(template);
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<ChantierStatus>("a_venir");
  const [steps, setSteps] = useState<StepDraft[]>([makeStep()]);
  const [error, setError] = useState<string | null>(null);

  // Reordonnancement des etapes.
  // `armedKey` : la carte n'est rendue `draggable` que pendant l'appui sur sa
  // poignee. Sans ca, toute la carte serait saisissable et le glisser
  // empecherait de selectionner le texte dans les champs qu'elle contient.
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const endDrag = () => {
    setArmedKey(null);
    setDragKey(null);
    setOverKey(null);
  };

  /** Deplace l'etape `fromKey` a la position de `toKey`. */
  const moveStepTo = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.key === fromKey);
      const to = prev.findIndex((s) => s.key === toKey);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  /** Deplace d'un cran. Sert au clavier : le glisser seul est inaccessible. */
  const moveStepBy = (key: string, delta: number) => {
    setSteps((prev) => {
      const from = prev.findIndex((s) => s.key === key);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const reset = () => {
    setName("");
    setDescription("");
    setDefaultStatus("a_venir");
    setSteps([makeStep()]);
    setError(null);
  };

  // Amorce le formulaire a l'ouverture. Les `key` sont regenerees plutot que
  // reprises des `id` du serveur : elles n'identifient que les lignes du
  // brouillon, et le PATCH renvoie de toute facon des etapes recreees.
  useEffect(() => {
    if (!open) return;
    if (!template) {
      reset();
      return;
    }
    setName(template.name);
    setDescription(template.description ?? "");
    setDefaultStatus(template.default_status);
    setSteps(
      template.steps.length > 0
        ? template.steps.map((step) => ({
            key: crypto.randomUUID(),
            name: step.name,
            substeps: step.substeps.map((sub) => ({ key: crypto.randomUUID(), name: sub.name })),
          }))
        : [makeStep()],
    );
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template]);

  const mutation = useMutation({
    mutationFn: async () => {
      const cleanSteps = steps
        .map((s) => ({
          name: s.name.trim(),
          substeps: s.substeps
            .map((sub) => ({ name: sub.name.trim() }))
            .filter((sub) => sub.name.length > 0),
        }))
        .filter((s) => s.name.length > 0);

      const body: Record<string, unknown> = {
        name: name.trim(),
        default_status: defaultStatus,
        steps: cleanSteps,
      };
      if (description.trim()) body.description = description.trim();

      return apiFetch<ChantierTemplate>(
        template ? `/chantier-templates/${template.id}` : "/chantier-templates",
        { method: template ? "PATCH" : "POST", body },
      );
    },
    onSuccess: (tpl) => {
      qc.invalidateQueries({ queryKey: ["chantier-templates"] });
      onSaved?.(tpl);
      reset();
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("templates.form.nameRequired"));
      return;
    }
    setError(null);
    mutation.mutate();
  };

  const updateStepName = (key: string, value: string) =>
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, name: value } : s)));

  const addStep = () => setSteps((prev) => [...prev, makeStep()]);
  const removeStep = (key: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));

  const addSubstep = (stepKey: string) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.key === stepKey ? { ...s, substeps: [...s.substeps, makeSubstep()] } : s,
      ),
    );

  const updateSubstepName = (stepKey: string, subKey: string, value: string) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.key === stepKey
          ? {
              ...s,
              substeps: s.substeps.map((sub) =>
                sub.key === subKey ? { ...sub, name: value } : sub,
              ),
            }
          : s,
      ),
    );

  const removeSubstep = (stepKey: string, subKey: string) =>
    setSteps((prev) =>
      prev.map((s) =>
        s.key === stepKey
          ? { ...s, substeps: s.substeps.filter((sub) => sub.key !== subKey) }
          : s,
      ),
    );

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => {} : onClose}
      title={isEdit ? t("templates.edit") : t("templates.new")}
      subtitle={t("templates.form.subtitle")}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {isEdit ? t("common.save") : t("templates.form.submit")}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="name"
          label={t("templates.form.name")}
          placeholder={t("templates.form.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <Textarea
          name="description"
          label={t("templates.form.description")}
          placeholder={t("templates.form.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Select
          name="default_status"
          label={t("templates.form.defaultStatus")}
          value={defaultStatus}
          onChange={(e) => setDefaultStatus(e.target.value as ChantierStatus)}
        >
          <option value="a_venir">{t("chantiers.statusUpcoming")}</option>
          <option value="en_cours">{t("chantiers.statusInProgress")}</option>
          <option value="termine">{t("chantiers.statusCompleted")}</option>
        </Select>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("templates.form.steps")}
            </label>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
            >
              <Plus size={14} />
              {t("templates.form.addStep")}
            </button>
          </div>

          {steps.map((step, idx) => (
            <div
              key={step.key}
              draggable={armedKey === step.key}
              onDragStart={(e) => {
                setDragKey(step.key);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", step.key);
              }}
              onDragOver={(e) => {
                if (!dragKey || dragKey === step.key) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverKey(step.key);
              }}
              onDragLeave={() => setOverKey((k) => (k === step.key ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragKey) moveStepTo(dragKey, step.key);
                endDrag();
              }}
              onDragEnd={endDrag}
              className={`rounded-lg border bg-zinc-50/50 p-3 transition-colors dark:bg-zinc-900/40 ${
                dragKey === step.key
                  ? "border-orange-400 opacity-50"
                  : overKey === step.key
                    ? "border-orange-400 border-dashed"
                    : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={() => setArmedKey(step.key)}
                  onMouseUp={() => setArmedKey(null)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      moveStepBy(step.key, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      moveStepBy(step.key, 1);
                    }
                  }}
                  aria-label={t("templates.form.reorderStep")}
                  title={t("templates.form.reorderStep")}
                  className="flex-shrink-0 cursor-grab rounded text-zinc-400 hover:text-zinc-600 active:cursor-grabbing dark:hover:text-zinc-300"
                >
                  <GripVertical size={16} />
                </button>
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  {idx + 1}
                </span>
                <Input
                  name={`step-${step.key}`}
                  placeholder={t("templates.form.stepPlaceholder")}
                  value={step.name}
                  onChange={(e) => updateStepName(step.key, e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeStep(step.key)}
                  disabled={steps.length === 1}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-900/20"
                  aria-label={t("common.delete")}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {step.substeps.length > 0 ? (
                <div className="ml-8 mt-3 flex flex-col gap-2">
                  {step.substeps.map((sub) => (
                    <div key={sub.key} className="flex items-center gap-2">
                      <span className="h-1 w-3 flex-shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <Input
                        name={`sub-${sub.key}`}
                        placeholder={t("templates.form.substepPlaceholder")}
                        value={sub.name}
                        onChange={(e) => updateSubstepName(step.key, sub.key, e.target.value)}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubstep(step.key, sub.key)}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => addSubstep(step.key)}
                className="ml-8 mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <Plus size={12} />
                {t("templates.form.addSubstep")}
              </button>
            </div>
          ))}
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
