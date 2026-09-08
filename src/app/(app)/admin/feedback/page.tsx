"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bug, Lightbulb, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { ApiError } from "@/lib/api";
import {
  feedbackSupportApi,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackWithAuthor,
} from "@/lib/feedback-api";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

const STATUS_VARIANT: Record<FeedbackStatus, "default" | "info" | "success" | "danger"> = {
  new: "default",
  in_progress: "info",
  resolved: "success",
  declined: "danger",
};

const STATUSES: FeedbackStatus[] = ["new", "in_progress", "resolved", "declined"];

export default function AdminFeedbackPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<FeedbackStatus | undefined>();
  const [type, setType] = useState<FeedbackType | "">("");
  const [recherche, setRecherche] = useState("");
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState<FeedbackWithAuthor | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "feedbacks", { status, type, q }],
    queryFn: () => feedbackSupportApi.list({ status, type: type || undefined, q: q || undefined }),
    refetchInterval: 60000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("admin.feedbackTitle")}</h1>
        <p className="text-sm text-zinc-500">{t("admin.feedbackSubtitle")}</p>
      </div>

      {/* Onglets de statut : la console se lit par ce qui reste a traiter. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatus(undefined)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            status === undefined
              ? "bg-orange-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
          )}
        >
          {t("admin.feedbackAll")}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === s
                ? "bg-orange-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            {t(`support.status.${s}`)}
            {data?.counts?.[s] ? <span className="ml-1.5 opacity-70">{data.counts[s]}</span> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(recherche.trim());
          }}
        >
          <Input
            label={t("admin.feedbackSearch")}
            placeholder={t("admin.feedbackSearchPlaceholder")}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Search size={16} />
          </Button>
        </form>

        <Select
          label={t("support.type")}
          value={type}
          onChange={(e) => setType(e.target.value as FeedbackType | "")}
        >
          <option value="">{t("admin.feedbackAllTypes")}</option>
          <option value="bug">{t("support.typeBug")}</option>
          <option value="suggestion">{t("support.typeSuggestion")}</option>
        </Select>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setSelection(f)}
                  className="flex w-full items-start gap-3 px-6 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <span className="mt-0.5 text-zinc-400">
                    {f.type === "bug" ? <Bug size={16} /> : <Lightbulb size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[f.status]}>{t(`support.status.${f.status}`)}</Badge>
                      {f.platform ? <Badge variant="info">{f.platform}</Badge> : null}
                      {f.app_version ? <span className="text-xs text-zinc-500">v{f.app_version}</span> : null}
                      {f.locale !== "fr" ? (
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs uppercase dark:bg-zinc-800">
                          {f.locale}
                        </code>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-white">{f.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {f.author_email ?? t("admin.feedbackDeletedAuthor")}
                      {f.organization_name ? ` • ${f.organization_name}` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-zinc-500">{formatDateTime(f.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-zinc-500">{t("admin.feedbackEmpty")}</p>
        )}
      </Card>

      {selection ? (
        <FeedbackDetail
          feedback={selection}
          onClose={() => setSelection(null)}
          onSaved={async () => {
            setSelection(null);
            await queryClient.invalidateQueries({ queryKey: ["admin", "feedbacks"] });
          }}
        />
      ) : null}
    </div>
  );
}

function FeedbackDetail({
  feedback,
  onClose,
  onSaved,
}: {
  feedback: FeedbackWithAuthor;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [reponse, setReponse] = useState(feedback.response ?? "");
  // Statut vide = « laisser l'API decider » : ecrire une reponse suffit a
  // passer le signalement en traite.
  const [statut, setStatut] = useState<FeedbackStatus | "">("");

  const enregistrer = useMutation({
    mutationFn: () =>
      feedbackSupportApi.respond(feedback.id, {
        ...(statut ? { status: statut } : {}),
        ...(reponse.trim() !== (feedback.response ?? "") ? { response: reponse.trim() || null } : {}),
      }),
    onSuccess: async () => {
      toast.success(t("admin.feedbackSaved"));
      await onSaved();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  const rienAEnregistrer = !statut && reponse.trim() === (feedback.response ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={feedback.subject}
      subtitle={`${feedback.author_email ?? t("admin.feedbackDeletedAuthor")}${
        feedback.organization_name ? ` • ${feedback.organization_name}` : ""
      }`}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => enregistrer.mutate()} disabled={rienAEnregistrer} loading={enregistrer.isPending}>
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[feedback.status]}>{t(`support.status.${feedback.status}`)}</Badge>
          <Badge variant="default">
            {feedback.type === "bug" ? t("support.typeBug") : t("support.typeSuggestion")}
          </Badge>
          {feedback.platform ? <Badge variant="info">{feedback.platform}</Badge> : null}
          {feedback.app_version ? <span className="text-xs text-zinc-500">v{feedback.app_version}</span> : null}
          {feedback.screen ? (
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">{feedback.screen}</code>
          ) : null}
          <span className="text-xs text-zinc-500">{formatDateTime(feedback.created_at)}</span>
        </div>

        <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-200">
          {feedback.message}
        </p>

        {/* La langue du message : y repondre en francais alors qu'il est ecrit
            en turc n'aiderait personne. */}
        <p className="text-xs text-zinc-500">
          {t("admin.feedbackWrittenIn")} <strong className="uppercase">{feedback.locale}</strong>
        </p>

        <Textarea
          label={t("admin.feedbackResponse")}
          hint={t("admin.feedbackResponseHint")}
          rows={5}
          value={reponse}
          maxLength={5000}
          onChange={(e) => setReponse(e.target.value)}
        />

        <Select
          label={t("admin.feedbackStatus")}
          value={statut}
          onChange={(e) => setStatut(e.target.value as FeedbackStatus | "")}
        >
          <option value="">{t("admin.feedbackStatusAuto")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`support.status.${s}`)}
            </option>
          ))}
        </Select>

        {feedback.responded_by ? (
          <p className="text-xs text-zinc-500">
            {t("admin.feedbackAnsweredBy")} {feedback.responder_email ?? "—"}
            {feedback.responded_at ? ` • ${formatDateTime(feedback.responded_at)}` : ""}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
