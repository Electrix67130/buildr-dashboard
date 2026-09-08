"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bug, Lightbulb, MessageSquare } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import EmptyState from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api";
import { feedbackApi, type FeedbackStatus, type FeedbackType } from "@/lib/feedback-api";
import { formatDateTime } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

/** Couleur de la pastille de statut. `new` reste neutre : rien n'a encore ete fait. */
const STATUS_VARIANT: Record<FeedbackStatus, "default" | "info" | "success" | "danger"> = {
  new: "default",
  in_progress: "info",
  resolved: "success",
  declined: "danger",
};

export default function SupportPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const [type, setType] = useState<FeedbackType>("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ["feedbacks", "mine"],
    queryFn: () => feedbackApi.mine(),
  });

  const envoyer = useMutation({
    mutationFn: () =>
      feedbackApi.create({
        type,
        subject: subject.trim(),
        message: message.trim(),
        platform: "web",
        // La langue de l'interface : c'est celle dans laquelle le message est
        // ecrit, donc celle dans laquelle il faut y repondre.
        locale,
      }),
    onSuccess: async () => {
      toast.success(t("support.sent"));
      setSubject("");
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["feedbacks", "mine"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  // Memes bornes que le schema de l'API : mieux vaut le dire ici que renvoyer
  // un 400 apres coup.
  const valide = subject.trim().length >= 3 && message.trim().length >= 10;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("support.title")}</h1>
        <p className="text-sm text-zinc-500">{t("support.subtitle")}</p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label={t("support.type")}
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
          >
            <option value="bug">{t("support.typeBug")}</option>
            <option value="suggestion">{t("support.typeSuggestion")}</option>
          </Select>
          <Input
            className="sm:col-span-2"
            label={t("support.subject")}
            placeholder={type === "bug" ? t("support.subjectPlaceholderBug") : t("support.subjectPlaceholderIdea")}
            value={subject}
            maxLength={150}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <Textarea
          label={t("support.message")}
          placeholder={type === "bug" ? t("support.messagePlaceholderBug") : t("support.messagePlaceholderIdea")}
          hint={t("support.messageHint")}
          rows={6}
          value={message}
          maxLength={5000}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3">
          <Button onClick={() => envoyer.mutate()} disabled={!valide} loading={envoyer.isPending}>
            {t("support.send")}
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">{t("support.mine")}</h2>

        {mine.isLoading ? (
          <Card className="p-6">
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          </Card>
        ) : mine.data && mine.data.data.length > 0 ? (
          <Card className="p-0">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {mine.data.data.map((f) => {
                const deplie = ouvert === f.id;
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => setOuvert(deplie ? null : f.id)}
                      className="flex w-full items-start gap-3 px-6 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <span className="mt-0.5 text-zinc-400">
                        {f.type === "bug" ? <Bug size={16} /> : <Lightbulb size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={STATUS_VARIANT[f.status]}>{t(`support.status.${f.status}`)}</Badge>
                          {f.response ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300">
                              <MessageSquare size={12} />
                              {t("support.answered")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-white">
                          {f.subject}
                        </p>
                        {!deplie ? (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">{f.message}</p>
                        ) : null}
                      </div>
                      <span className="whitespace-nowrap text-xs text-zinc-500">
                        {formatDateTime(f.created_at)}
                      </span>
                    </button>

                    {deplie ? (
                      <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                        <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                          {f.message}
                        </p>

                        {f.response ? (
                          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-900/10">
                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                              {t("support.responseFrom")}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                              {f.response}
                            </p>
                            {f.responded_at ? (
                              <p className="mt-2 text-xs text-zinc-500">{formatDateTime(f.responded_at)}</p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-4 text-xs text-zinc-500">{t("support.awaitingResponse")}</p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <EmptyState
            icon={<MessageSquare size={28} />}
            title={t("support.emptyTitle")}
            description={t("support.emptyDescription")}
          />
        )}
      </div>
    </div>
  );
}
